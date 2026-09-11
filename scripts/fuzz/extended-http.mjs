// Deterministic bounded HTTP fuzz corpus; literal loopback only. No dependencies.
import http from 'node:http';
import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  'base-url': { type: 'string', default: 'http://127.0.0.1:3219' },
  seed: { type: 'string', default: '20260910' },
  cases: { type: 'string', default: '240' },
  output: { type: 'string' },
  'summary-only': { type: 'boolean', default: false },
} });
const base = new URL(values['base-url']);
if (base.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(base.hostname) ||
    base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
  throw new Error('Only a plain literal-loopback HTTP origin is accepted.');
}
const seed = Number(values.seed), generatedCount = Number(values.cases);
if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff ||
    !Number.isInteger(generatedCount) || generatedCount < 0 || generatedCount > 3000) {
  throw new Error('seed must be 1..4294967295 and cases 0..3000.');
}
let state = seed >>> 0;
const random = (n) => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % n; };
const pick = (items) => items[random(items.length)];
const cases = [];
const add = (group, path, extra = {}) => cases.push({ id: cases.length, group, path, ...extra });
const query = (route, pairs) => `${route}?${new URLSearchParams(pairs)}`;
// Valid 2x2 PNG. Most image mutations deliberately stop before raster rendering.
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWMQVDIWVDJmgFAACq4BmbwhqwsAAAAASUVORK5CYII=', 'base64');
const inline = (bytes, mime = 'png') => `data:image/${mime};base64,${bytes.toString('base64')}`;
const validPng = inline(pngBytes);
const invalidPng = 'data:image/png;base64,AA==';
const localeTokens = [
  'en', 'EN-us', 'zh', 'zh-Hans-CN', 'zh-Hant-TW', 'en-GB', 'fr', '*',
  'en-US-u-ca-gregory', 'en-US-u-nu-hanidec', 'zh-CN-x-test', 'en-x-private',
  'de-DE-t-en-US', 'i-default', 'sgn-BE-FR', 'x-private', 'en_US', 'en--US',
  '', '-', 'constructor', '__proto__', 'en-a-foo-a-bar', 'und', 'en-419',
];
const qualities = ['', ';q=0', ';q=0.001', ';q=0.999', ';q=1', ';q=1.000',
  ';q=.5', ';q=01', ';q=-0', ';q=1.001', ';q=NaN', ';q=Infinity', ';q=',
  ';Q=0.5', ';q=0;q=1', ';q=0.5;foo=bar', ';q=0.0000'];
const localePaths = ['/', '/blog', '/missing-fuzz-route', '/en-US/markdown/blog'];
for (const token of localeTokens) for (const quality of [';q=0', ';q=0.5', ';q=1']) {
  add('locale-extension-quality', '/', { headers: { 'accept-language': `${token}${quality},zh-CN;q=0.2,*;q=0.1` } });
}
for (const [language, expectedLang] of [
  ['en;q=0,en-GB;q=0.5,*;q=1', 'zh-CN'],
  ['zh;q=0,zh-Hans;q=0.5,*;q=1', 'en-US'],
  ['en;q=0,en-US;q=0.5', 'en-US'],
  ['en-GB;q=0,*;q=1', 'en-US'],
]) add('locale-exclusion-oracle', '/', { headers: { 'accept-language': language }, expected: [200], expectedLang });

const encodings = ['%', '%0', '%GG', '%C0%AF', '%C1%BF', '%E0%80%AF', '%ED%A0%80',
  '%F4%90%80%80', '%F5%80%80%80', '%80', '%FE', '%FF', '%00', '%1F', '%7F',
  '%C2%80', '%C2%9F', '%C2%A0', '%E2%80%A8', '%E2%80%A9', '%EF%BB%BF',
  '%E2%80%AE', '%F0%9F%92%A9', '%252F', '%252e%252e', '%2F', '%5C', '%3F',
  '%23', '%25', '%E4%B8%AD', 'CON', '..', '.', 'a%00b'];
const pathPrefixes = ['/en-US/markdown/blog/', '/zh-CN/blog/', '/assets/', '/api/'];
for (const encoded of encodings) add('encoded-path-boundary', `/en-US/markdown/blog/2026/01/23/${encoded}`, { headers: { accept: pick(['text/html', 'text/markdown']) } });
for (let cp = 0; cp < 32; cp++) add('encoded-control-oracle', `/api/healthz/${encodeURIComponent(String.fromCharCode(cp))}`, { expected: [400] });
for (let cp = 0x7f; cp <= 0x9f; cp++) add('encoded-control-oracle', `/api/healthz/${encodeURIComponent(String.fromCharCode(cp))}`, { expected: [400] });

const validEvent = { version: 1, action: 'blocked', trigger: 'link', source: { protocol: 'https:', hostname: 'techzjc.com' }, destination: { protocol: 'https:', hostname: 'example.invalid' } };
const bodySeeds = ['', 'null', 'false', '1e9999', '{}', '[]', '[{}]', '{', '"\\ud800"',
  '{"__proto__":{"x":1}}', '{"constructor":{"prototype":{"x":1}}}',
  JSON.stringify(validEvent), '{"csp-report":{"document-uri":"data:text/plain,fuzz"}}',
  '{"csp-report":{"document-uri":"http://[::1]","blocked-uri":"javascript:fuzz"}}',
  '{"csp-report":{"document-uri":"https://%/","blocked-uri":"file:///fuzz-canary"}}'];
for (const route of ['/api/security/navigation', '/api/security/csp-report']) {
  const limit = route.endsWith('navigation') ? 12000 : 24000;
  for (const body of bodySeeds) add('json-type-boundary', route, { method: 'POST', body, chunkSize: pick([1, 3, 97]), headers: { origin: base.origin } });
  for (const delta of [-2, -1, 0, 1, 2]) for (const chunkSize of [0, 1, 97]) {
    // Valid JSON at the byte boundary ensures body limits are distinguished from parsing.
    const body = '{"x":"' + 'x'.repeat(limit + delta - 8) + '"}';
    add('json-byte-limit', route, { method: 'POST', body, chunkSize,
      headers: { origin: base.origin }, expected: [delta > 0 ? 413 : route.endsWith('navigation') ? 400 : 204] });
  }
  for (const depth of [32, 128, 512]) add('json-nesting', route, { method: 'POST', body: '['.repeat(depth) + '{}' + ']'.repeat(depth), chunkSize: 7, headers: { origin: base.origin } });
  for (const character of ['中', '😀']) {
    const body = JSON.stringify({ x: character.repeat(Math.ceil(limit / Buffer.byteLength(character))) });
    add('json-utf8-byte-limit', route, { method: 'POST', body, chunkSize: 1, headers: { origin: base.origin }, expected: [413] });
  }
}

// Includes unsupported but valid GIF; valid GIF must return 415, not decode.
const invalidOrUnsupportedImages = [
  'data:image/png;base64,', invalidPng, 'data:image/png;base64,%%%%',
  'data:image/png;base64,A', 'data:image/png;base64,AAAA=', 'data:image/png;base64,AA===',
  'data:image/png;BASE64,AA==', 'data:image/png;charset=utf8;base64,AA==',
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'data:image/jpeg;base64,/9j/2Q==', 'data:image/jpg;base64,AA==',
  'data:image/svg+xml;base64,PHN2Zy8+', inline(pngBytes.subarray(0, 16)),
  inline(pngBytes.subarray(0, pngBytes.length - 16)), inline(pngBytes, 'jpeg'),
];
for (const image of invalidOrUnsupportedImages) for (const route of ['convert', 'opengraph-image', 'sharable-card']) {
  const key = route === 'convert' ? 'imageUrl' : 'background_image';
  add('inline-image-grammar', query(`/en-US/${route}`, [[key, image], ['width', '32'], ['height', '32'], ['quotation', 'Fuzz'], ['link', 'fuzz']]), { expected: image.startsWith('data:image/gif;') ? [415] : [400, 415] });
}
const dimensions = ['', ' ', '+1', '-0', '00', '01', '1.0', '1e0', '0x1', '32junk',
  'NaN', 'Infinity', '4096', '4097', '9007199254740991', '１２', '٣٢', '\u0000', '\n32'];
const dimensionValid = (value) => /^[0-9]+$/.test(value) && Number(value) > 0 && Number(value) <= 4096;
for (const width of dimensions) add('duplicate-dimension-query', query('/en-US/opengraph-image', [
  ['background_image', validPng], ['width', width], ['width', '32'], ['height', '32'], ['height', 'junk'], ['title', 'Fuzz'],
]), { expected: [dimensionValid(width) ? 200 : 400] });
for (const length of [0, 1, 127, 1024, 2048, 2331, 2332, 2953, 4096, 8000]) {
  add('qr-capacity-boundary', query('/en-US/sharable-card', [['background_image', validPng], ['quotation', 'Fuzz'], ['link', 'x'.repeat(length)]]), { expected: [length > 0 && length <= 2331 ? 200 : 400] });
}
for (const [text, status] of [['中'.repeat(700), 200], ['😀'.repeat(600), 400], ['1'.repeat(7000), 400], ['A'.repeat(4200), 400], ['\u0000'.repeat(50), 200]]) {
  add('qr-encoding-modes', query('/zh-CN/sharable-card', [['background_image', validPng], ['quotation', 'Fuzz'], ['link', text]]), { expected: [status] });
}
for (const method of ['TRACE', 'OPTIONS', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH']) {
  for (const expect of ['', '100-continue', 'fuzz-expectation']) {
    add('method-expect', '/api/healthz', { method, body: method === 'HEAD' ? undefined : 'fuzz-local-marker', headers: expect ? { expect } : {},
      ...(method === 'TRACE' ? { expected: [404, 417], emptyBody: true } : {}) });
  }
}
for (const expect of ['', '100-continue', 'fuzz-expectation']) add('trace-upgrade', '/api/healthz', {
  method: 'TRACE', headers: { connection: 'Upgrade', upgrade: 'websocket', ...(expect ? { expect } : {}), authorization: 'Bearer local-fuzz-secret', 'x-fuzz-canary': 'local-fuzz-origin' }, expected: [404], emptyBody: true,
});

for (let n = 0; n < generatedCount; n++) {
  switch (random(6)) {
    case 0: add('generated-locale', pick(localePaths), { headers: { 'accept-language': Array.from({ length: 1 + random(5) }, () => pick(localeTokens) + pick(qualities)).join(pick([',', ', ', ',,'])) } }); break;
    case 1: add('generated-encoded-path', pick(pathPrefixes) + Array.from({ length: 1 + random(5) }, () => pick(encodings)).join('/') + '?q=' + pick(encodings), { headers: { accept: pick(['*/*', 'text/html', 'text/markdown', 'text/markdown;q=0,text/html;q=1']) } }); break;
    case 2: {
      let body = pick(bodySeeds);
      const pos = random(body.length + 1);
      body = body.slice(0, pos) + pick(['\u0000', '\ufeff', '{', '}', '[', '\\', '"', '😀', '\r\n', '1e999']) + body.slice(pos);
      add('generated-json', pick(['/api/security/navigation', '/api/security/csp-report']), { method: 'POST', body, chunkSize: pick([0, 1, 3, 13, 97]), headers: { origin: base.origin } }); break;
    }
    case 3: {
      const bytes = Buffer.from(pngBytes);
      for (let i = 0; i < 1 + random(5); i++) bytes[random(bytes.length)] ^= 1 << random(8);
      add('generated-image-bytes', query('/en-US/convert', [['imageUrl', inline(bytes, pick(['png', 'jpeg']))]]), { expected: [200, 400, 415] }); break;
    }
    case 4: {
      const width = pick(dimensions), height = pick(dimensions);
      const valid = dimensionValid(width) && dimensionValid(height) && Number(width) * Number(height) <= 4 * 1024 * 1024;
      add('generated-duplicate-query', query('/zh-CN/opengraph-image', [['background_image', validPng], ['background_image', invalidPng], ['width', width], ['width', pick(dimensions)], ['height', height], ['height', '32'], ['title', 'Fuzz']]), { expected: [valid ? 200 : 400] }); break;
    }
    case 5: add('generated-negotiation-headers', pick(['/api/healthz', '/missing-fuzz-route', '/en-US/markdown/blog']), { headers: { accept: pick(['application/json', 'text/markdown;q=NaN', 'text/html;q=0,*/*;q=0', 'text/markdown, text/html']), cookie: `locale=${pick(['zh-CN', 'en-US', '%FF', '%00', '__proto__', '', 'zh-CN%3Bbad'])}; fuzz=x`, 'x-forwarded-for': pick(['unknown', '::ffff:127.0.0.1', '1.2.3.4,,::1', '2001:db8::1', '999.999.999.999']), 'accept-language': pick(localeTokens) + pick(qualities) } }); break;
  }
}

// Missing dates keep these oracles independent of externally synchronized posts.
// Mutate each full-route parameter: the original crash occurs before page code.
for (const prefix of ["/en-US", "/zh-CN", ""]) {
  for (let position = 0; position < 4; position++) {
    for (const [tokens, status] of [
      [["%25", "100%25", "%25GG", "%25FF", "%2525", "%E4%B8%AD", "%F0%9F%98%80"], 404],
      [["%", "%0", "%GG", "%FF", "%C0%AF", "%00", "%0D%0A", "%7F", "%C2%80"], 400],
    ]) {
      for (const token of tokens) {
        const params = ["0000", "00", "00", "missing-percent-regression-post"];
        params[position] = token;
        for (const method of ["GET", "HEAD", "POST"]) {
          add(status === 404 ? "blog-percent-oracle" : "blog-malformed-oracle", `${prefix}/blog/${params.join("/")}`, {
            method, expected: [status], ...(method === "HEAD" ? { emptyBody: true } : {}),
          });
        }
      }
    }
  }
}

function request(test) {
  return new Promise((resolve) => {
    const began = performance.now();
    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; clearTimeout(deadline); resolve({ ...result, ms: Math.round(performance.now() - began) }); } };
    const headers = { host: base.host, 'user-agent': 'site-index-local-extended-fuzz/1', 'accept-language': 'en-US', ...test.headers };
    if (test.body !== undefined) {
      headers['content-type'] = 'application/json';
      if (!test.chunkSize) headers['content-length'] = Buffer.byteLength(test.body);
    }
    const req = http.request({ hostname: base.hostname.replace(/^\[|\]$/g, ''), port: base.port || 80, path: test.path, method: test.method || 'GET', headers, agent: false }, (res) => {
      let bytes = 0;
      const chunks = [];
      res.on('data', (chunk) => {
        if (bytes < 512) chunks.push(chunk.subarray(0, 512 - bytes));
        bytes += chunk.length;
        if (bytes > 4 * 1024 * 1024) { finish({ status: res.statusCode, error: 'response exceeded 4 MiB' }); req.destroy(); }
      });
      res.on('end', () => finish({ status: res.statusCode, bytes, location: res.headers.location, type: res.headers['content-type'], sample: /image\//.test(res.headers['content-type'] || '') ? '[image]' : Buffer.concat(chunks).toString('utf8') }));
      res.on('error', (error) => finish({ status: res.statusCode, error: error.message }));
    });
    const deadline = setTimeout(() => { finish({ error: '5 second deadline exceeded' }); req.destroy(); }, 5000);
    req.on('upgrade', (res, socket) => { finish({ status: res.statusCode, error: 'unexpected protocol upgrade' }); socket.destroy(); });
    req.on('error', (error) => finish({ error: error.message }));
    if (test.body !== undefined) {
      const body = Buffer.from(test.body);
      const chunk = test.chunkSize || body.length || 1;
      for (let offset = 0; offset < body.length; offset += chunk) req.write(body.subarray(offset, offset + chunk));
    }
    req.end();
  });
}
const baseline = [{ path: '/api/healthz', expected: [200] }];
const started = new Date().toISOString();
const startedClock = performance.now();
const failures = [];
const results = [];
const groups = {};
const baselineResults = [];
let completed = 0;

function reasonsFor(test, result) {
  const reasons = [];
  if (result.error) reasons.push(result.error);
  if (result.status >= 500) reasons.push(`server error ${result.status}`);
  if (test.expected && !test.expected.includes(result.status)) reasons.push(`expected ${test.expected}, got ${result.status}`);
  if (test.emptyBody && result.bytes !== 0) reasons.push("Expected an empty response body");
  if (test.expectedLang && !result.sample?.includes(`<html lang="${test.expectedLang}"`)) reasons.push(`expected rendered HTML language ${test.expectedLang}`);
  return reasons;
}

for (const test of baseline) {
  const result = await request(test);
  const reasons = reasonsFor(test, result);
  baselineResults.push({ ...test, ...result, passed: reasons.length === 0 });
  if (reasons.length) {
    failures.push({ test: { group: "baseline", ...test }, result, reasons });
    break;
  }
}
if (!failures.length) {
  let next = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (next < cases.length) {
      const test = cases[next++];
      const result = await request(test);
      const group = groups[test.group] ??= { count: 0, statuses: {}, maxMs: 0 };
      group.count++;
      group.maxMs = Math.max(group.maxMs, result.ms);
      const key = result.error ? "transport-error" : String(result.status);
      group.statuses[key] = (group.statuses[key] || 0) + 1;
      const reasons = reasonsFor(test, result);
      if (reasons.length) failures.push({ test, result, reasons });
      if (!values["summary-only"]) results.push({ id: test.id, group: test.group, ...result });
      completed++;
    }
  }));
}
const healthAfter = await request({ path: "/api/healthz" });
const overallPassed = completed === cases.length && completed > 0 && failures.length === 0 && healthAfter.status === 200 && !healthAfter.error;
const report = {
  suite: "extended-http",
  seed, randomCases: generatedCount, baseUrl: base.origin,
  started, finished: new Date().toISOString(), elapsedMs: Math.round(performance.now() - startedClock),
  total: completed, failed: failures.length, overallPassed, groups, baselineResults, healthAfter, failures,
  ...(!values["summary-only"] ? { results } : {}),
};
const serialized = JSON.stringify(report, null, 2) + "\n";
if (values.output) await writeFile(values.output, serialized);
process.stdout.write(serialized);
if (!overallPassed) process.exitCode = 1;
