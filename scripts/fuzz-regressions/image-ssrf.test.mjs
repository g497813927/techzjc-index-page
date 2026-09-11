import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import sharp from 'sharp';
import { fetchRemoteImage, remoteImageToDataUrl } from '../../src/utils/remoteImage.server.ts';
import { GET as convert } from '../../src/app/[lang]/convert/route.tsx';
import { GET as openGraph } from '../../src/app/[lang]/opengraph-image/route.tsx';
import { GET as sharableCard } from '../../src/app/[lang]/sharable-card/route.tsx';

const pixels = { create: { width: 32, height: 24, channels: 4, background: '#12345678' } };
const images = {
  png: await sharp(pixels).png().toBuffer(),
  jpg: await sharp(pixels).jpeg().toBuffer(),
  webp: await sharp(pixels).webp().toBuffer(),
};
const routes = [
  ['convert', convert, 'imageUrl'],
  ['opengraph-image', openGraph, 'background_image'],
  ['sharable-card', sharableCard, 'background_image'],
];
const approvedHosts = new Set(['techzjc.com', 'static.techzjc.com', 'test-cn.techzjc.com']);
const redirectStatuses = [301, 302, 303, 307, 308];

async function fixture(t, handler) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}

async function requestRoute([name, handler, parameter], imageUrl) {
  const url = new URL(`http://localhost/en-US/${name}`);
  url.searchParams.set(parameter, imageUrl);
  url.searchParams.set('width', '64');
  url.searchParams.set('height', '64');
  url.searchParams.set('quotation', 'Redirect regression control');
  return handler(new Request(url), { params: Promise.resolve({ lang: 'en-US' }) });
}

function interceptFetch(t, handler) {
  const nativeFetch = globalThis.fetch;
  const requests = [];
  t.mock.method(globalThis, 'fetch', (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input);
    // ImageResponse initializes its renderer from an embedded WASM data URL.
    if (url.protocol === 'data:') {
      return nativeFetch(input, options);
    }
    requests.push({ url, options });
    return handler(url, options);
  });
  return requests;
}

function assertGuardedRequests(requests) {
  for (const { url, options } of requests) {
    assert.ok(approvedHosts.has(url.hostname), `unexpected destination: ${url.href}`);
    assert.equal(url.username, '');
    assert.equal(url.password, '');
    assert.equal(options?.redirect, 'manual');
    assert.ok(options.signal instanceof AbortSignal);
    const headers = new Headers(options.headers);
    assert.equal(headers.get('authorization'), null);
    assert.equal(headers.get('x-origin-auth'), null);
  }
}

async function assertImage(response, format) {
  assert.equal(response.status, 200);
  const decoder = sharp(Buffer.from(await response.arrayBuffer()), { failOn: 'warning' });
  assert.equal((await decoder.metadata()).format, format);
  await decoder.raw().toBuffer();
}

const forbiddenDirectUrls = [
  'https://untrusted.invalid/image.png',
  'https://techzjc.com.attacker.invalid/image.png',
  'https://static-techzjc.com/image.png',
  'http://localhost/image.png',
  'http://127.0.0.1/image.png',
  'http://127.1/image.png',
  'http://2130706433/image.png',
  'http://0177.0.0.1/image.png',
  'http://0x7f000001/image.png',
  'http://0/image.png',
  'http://10.0.0.1/image.png',
  'http://192.168.1.1/image.png',
  'http://169.254.169.254/latest/meta-data/',
  'http://[::1]/image.png',
  'http://[::ffff:127.0.0.1]/image.png',
  'http://[fe80::1]/image.png',
  'https://techzjc.com@127.0.0.1/image.png',
  'https://techzjc.com:password@attacker.invalid/image.png',
  'https://techzjc.com:8443/image.png',
  'https://techzjc.com:80/image.png',
  'http://techzjc.com:443/image.png',
  'http://static.techzjc.com:0/image.png',
  'ftp://techzjc.com/image.png',
  'file:///etc/passwd',
  'javascript:alert(1)',
  'data:text/plain;base64,aGVsbG8=',
  '//techzjc.com/image.png',
  'http://[::1',
];

test('convert rejects forbidden direct destinations before any outbound request', async t => {
  const requests = interceptFetch(t, () => new Response('unexpected fetch', { status: 503 }));
  for (const input of forbiddenDirectUrls) {
    await t.test(input, async () => {
      const response = await requestRoute(routes[0], input);
      assert.equal(response.status, 400);
      assert.equal(requests.length, 0, 'invalid input must not initiate fetch');
    });
  }
});

const forbiddenRedirectLocations = [
  ['private IPv4', 'http://127.0.0.1/private.png'],
  ['metadata', 'http://169.254.169.254/latest/meta-data/'],
  ['IPv6 loopback', 'http://[::1]/private.png'],
  ['IPv4-mapped IPv6', 'http://[::ffff:127.0.0.1]/private.png'],
  ['hostname suffix', 'https://techzjc.com.attacker.invalid/private.png'],
  ['protocol-relative private host', '//127.0.0.1/private.png'],
  ['userinfo host confusion', 'https://techzjc.com:password@attacker.invalid/private.png'],
  ['nonstandard port', 'https://techzjc.com:8443/private.png'],
  ['HTTPS on HTTP port', 'https://techzjc.com:80/private.png'],
  ['HTTP on HTTPS port', 'http://techzjc.com:443/private.png'],
  ['malformed URL', 'http://[::1'],
  ['file URL', 'file:///etc/passwd'],
  ['image data URL', `data:image/png;base64,${images.png.toString('base64')}`],
];

test('every HTTP redirect status validates the next destination before fetching it', async t => {
  let activeStatus;
  let activeLocation;
  const requests = interceptFetch(t, url => url.href === 'https://techzjc.com/start.png'
    ? new Response(null, { status: activeStatus, headers: { Location: activeLocation } })
    : new Response('forbidden destination was contacted', { status: 503 }));
  for (const status of redirectStatuses) {
    for (const [label, location] of forbiddenRedirectLocations) {
      await t.test(`${status}: ${label}`, async () => {
        activeStatus = status;
        activeLocation = location;
        requests.length = 0;
        const response = await fetchRemoteImage('https://techzjc.com/start.png');
        assert.equal(response.status, 502);
        assert.equal(requests.length, 1, 'redirect destination must not be contacted');
        assertGuardedRequests(requests);
      });
    }
  }
});

test('five trusted redirects preserve relative URLs, approved hosts, HTTP upgrades, queries and escapes', async t => {
  const expected = [
    'http://techzjc.com/chain/start.png',
    'http://techzjc.com/relative%20image.png?token=a%2Fb&percent=%25',
    'http://static.techzjc.com/chain/cross%2Fimage.png?part=1%2F2',
    'https://test-cn.techzjc.com/chain/secure%25image.png?sig=a%3Db',
    'https://techzjc.com/chain/auth%20image.png?key=a%2Bb',
    'https://techzjc.com/chain/final%2Fimage.png?last=%252F',
  ];
  const locations = [
    '../relative%20image.png?token=a%2Fb&percent=%25',
    '//static.techzjc.com/chain/cross%2Fimage.png?part=1%2F2',
    'https://test-cn.techzjc.com:443/chain/secure%25image.png?sig=a%3Db',
    'https://user:password@techzjc.com/chain/auth%20image.png?key=a%2Bb',
    '/chain/final%2Fimage.png?last=%252F',
  ];
  const expectedPaths = expected.map(value => { const url = new URL(value); return url.pathname + url.search; });
  const receivedPaths = [];
  const origin = await fixture(t, (req, res) => {
    receivedPaths.push(req.url);
    const index = expectedPaths.indexOf(req.url);
    if (index < 0) {
      res.writeHead(404).end();
    } else if (index < locations.length) {
      res.writeHead(redirectStatuses[index], { Location: locations[index] }).end();
    } else {
      res.writeHead(200, { 'Content-Type': 'image/png' }).end(images.png);
    }
  });
  const nativeFetch = globalThis.fetch;
  const requests = interceptFetch(t, (url, options) =>
    nativeFetch(new URL(url.pathname + url.search, origin), options));
  // Initial URL normalization historically drops queries and strips credentials.
  await assertImage(await fetchRemoteImage('http://user:password@techzjc.com:80/chain/start.png?discarded=1'), 'png');
  assert.deepEqual(requests.map(({ url }) => url.href), expected);
  assert.deepEqual(receivedPaths, expectedPaths);
  assertGuardedRequests(requests);
});

test('excess redirects, cycles, missing locations and upstream failures return bounded errors', async t => {
  const scenarios = [
    ['six redirects', (_url, count) => new Response(null, { status: 302, headers: { Location: `/hop-${count}.png` } }), 6],
    ['redirect cycle', (url) => new Response(null, { status: 307, headers: { Location: url.pathname === '/start.png' ? '/cycle.png' : '/start.png' } }), 6],
    ['missing Location', () => new Response(null, { status: 301 }), 1],
    ['empty Location', () => new Response(null, { status: 308, headers: { Location: '' } }), 1],
    ['network rejection', () => Promise.reject(new TypeError('fixture connection failed')), 1],
    ['upstream HTTP failure', () => new Response('unavailable', { status: 503 }), 1],
  ];
  for (const [label, handler, limit] of scenarios) {
    await t.test(label, async subtest => {
      let count = 0;
      const requests = interceptFetch(subtest, url => handler(url, ++count));
      const response = await fetchRemoteImage('https://techzjc.com/start.png');
      assert.equal(response.status, 502);
      assert.ok(count >= 1 && count <= limit, `expected at most ${limit} requests, got ${count}`);
      if (label === 'six redirects') assert.equal(count, 6);
      assertGuardedRequests(requests);
    });
  }
});

for (const route of routes) {
  test(`${route[0]} streams legitimate images and blocks real HTTP redirects before the private server`, async t => {
    let privateRequests = 0;
    const privateOrigin = await fixture(t, (_req, res) => {
      privateRequests++;
      res.writeHead(200, { 'Content-Type': 'image/png' }).end(images.png);
    });
    const origin = await fixture(t, (req, res) => {
      if (req.url.includes('/redirect.')) {
        res.writeHead(302, { Location: `${privateOrigin}/private.png` }).end();
      } else {
        const extension = req.url.split('.').at(-1);
        const image = images[extension];
        if (!image) res.writeHead(404).end();
        else res.writeHead(200, { 'Content-Type': `image/${extension === 'jpg' ? 'jpeg' : extension}` }).end(image);
      }
    });
    const nativeFetch = globalThis.fetch;
    const requests = interceptFetch(t, (url, options) => {
      // Only remap the approved origin. Native fetch implements redirects: an
      // unsafe automatic follow really reaches the private HTTP fixture.
      if (url.origin === 'https://techzjc.com') {
        return nativeFetch(new URL(url.pathname + url.search, origin), options);
      }
      if (url.origin === privateOrigin) return nativeFetch(url, options);
      return Promise.reject(new Error(`Unexpected external fetch: ${url.href}`));
    });
    for (const extension of Object.keys(images)) {
      await t.test(extension, async () => {
        const path = `https://techzjc.com/${route[0]}`;
        const before = requests.length;
        await assertImage(await requestRoute(route, `${path}/control.${extension}`), route[0] === 'convert' ? 'jpeg' : 'png');
        assert.equal(requests.length - before, 1, 'rendering must not initiate a second remote fetch');
        const response = await requestRoute(route, `${path}/redirect.${extension}`);
        // ImageResponse is lazy: consume its stream before checking the private
        // server, otherwise unguarded image-renderer fetches can escape this test.
        const body = await response.text();
        assert.equal(privateRequests, 0, 'redirect must not contact the private server');
        assert.equal(response.status, 502);
        assert.equal(body, 'Failed to fetch image');
        assert.equal(requests.length - before, 2);
        assertGuardedRequests(requests);
      });
    }
  });
}

const maxImageBytes = 5 * 1024 * 1024;

function streamedResponse(chunks, headers = {}) {
  const state = { pulls: 0, cancellations: 0 };
  const body = new ReadableStream({
    pull(controller) {
      const chunk = chunks[state.pulls++];
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
    cancel() { state.cancellations++; },
  }, { highWaterMark: 0 });
  return { response: new Response(body, { headers }), state };
}

function oversizedStream(headers) {
  // The last chunk is a sentinel: rejection must cancel before requesting it.
  const chunks = [...Array(5).fill(new Uint8Array(1024 * 1024)), new Uint8Array(1), new Uint8Array(64)];
  return streamedResponse(chunks, headers);
}

async function assertTooLarge(response) {
  assert.equal(response.status, 413);
  assert.equal(await response.text(), 'Image size exceeds limit');
}

test('oversized Content-Length cancels the upstream body without reading it', async t => {
  const { response, state } = oversizedStream({ 'Content-Length': String(maxImageBytes + 1) });
  interceptFetch(t, () => response);
  await assertTooLarge(await fetchRemoteImage('https://techzjc.com/oversized.png'));
  assert.deepEqual(state, { pulls: 0, cancellations: 1 });
});

test('actual streamed bytes enforce the limit despite missing, false or invalid Content-Length', async t => {
  for (const [label, headers] of [
    ['missing', {}],
    ['falsely small', { 'Content-Length': '1' }],
    ['invalid', { 'Content-Length': 'unknown' }],
  ]) {
    await t.test(label, async subtest => {
      const { response, state } = oversizedStream(headers);
      interceptFetch(subtest, () => response);
      await assertTooLarge(await fetchRemoteImage('https://techzjc.com/oversized.png'));
      assert.deepEqual(state, { pulls: 6, cancellations: 1 });
    });
  }
});

test('an image exactly at the byte limit remains readable and fully decodable', async t => {
  const paddedPng = Buffer.alloc(maxImageBytes);
  images.png.copy(paddedPng);
  const { response, state } = streamedResponse(
    [paddedPng.subarray(0, 1024 * 1024), paddedPng.subarray(1024 * 1024)],
    { 'Content-Length': String(maxImageBytes), 'Content-Type': 'image/png' },
  );
  interceptFetch(t, () => response);
  const result = await fetchRemoteImage('https://techzjc.com/exact-limit.png');
  assert.equal(result.status, 200);
  const bytes = Buffer.from(await result.arrayBuffer());
  assert.equal(bytes.length, maxImageBytes);
  assert.deepEqual(bytes, paddedPng);
  await sharp(bytes, { failOn: 'warning' }).raw().toBuffer();
  assert.equal(state.cancellations, 0);
});

test('upstream stream read failures return a controlled fetch error', async t => {
  interceptFetch(t, () => new Response(new ReadableStream({
    pull(controller) { controller.error(new Error('fixture body read failed')); },
  }, { highWaterMark: 0 })));
  const response = await fetchRemoteImage('https://techzjc.com/broken.png');
  assert.equal(response.status, 502);
  assert.equal(await response.text(), 'Failed to fetch image');
});

test('all three routes stop oversized remote JPG and WebP bodies before rendering', async t => {
  for (const route of routes) {
    for (const extension of ['jpg', 'webp']) {
      await t.test(`${route[0]}: ${extension}`, async subtest => {
        const { response, state } = oversizedStream();
        interceptFetch(subtest, () => response);
        const result = await requestRoute(route, `https://techzjc.com/oversized.${extension}`);
        await assertTooLarge(result);
        assert.deepEqual(state, { pulls: 6, cancellations: 1 });
      });
    }
  }
});

test('native HTTP gzip expansion is limited using decoded bytes, not compressed Content-Length', async t => {
  const paddedPng = Buffer.alloc(maxImageBytes + 1);
  images.png.copy(paddedPng);
  const compressed = gzipSync(paddedPng);
  assert.ok(compressed.length < maxImageBytes);
  let serverRequests = 0;
  const origin = await fixture(t, (_req, res) => {
    serverRequests++;
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Encoding': 'gzip',
      'Content-Length': String(compressed.length),
    }).end(compressed);
  });
  const nativeFetch = globalThis.fetch;
  const requests = interceptFetch(t, (url, options) =>
    nativeFetch(new URL(url.pathname, origin), options));
  await assertTooLarge(await fetchRemoteImage('https://techzjc.com/compressed.png'));
  assert.equal(serverRequests, 1);
  assertGuardedRequests(requests);
});

test('a compact palette PNG cannot expand into an oversized inline image', async t => {
  const width = 2100;
  const pixels = Buffer.alloc(width * width * 3);
  let seed = 1;
  for (let i = 0; i < width * width; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const value = seed & 255;
    pixels[i * 3] = value;
    pixels[i * 3 + 1] = (value * 71) & 255;
    pixels[i * 3 + 2] = (value * 149) & 255;
  }
  const compact = await sharp(pixels, { raw: { width, height: width, channels: 3 } })
    .png({ palette: true, colours: 256, dither: 0 }).toBuffer();
  assert.ok(compact.length < maxImageBytes);
  assert.ok((await sharp(compact).png().toBuffer()).length > maxImageBytes);
  interceptFetch(t, () => new Response(compact, { headers: { 'Content-Type': 'image/png' } }));
  await assertTooLarge(await remoteImageToDataUrl('https://techzjc.com/palette.png'));
});
