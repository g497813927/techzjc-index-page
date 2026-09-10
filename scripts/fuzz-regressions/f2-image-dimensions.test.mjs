import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../../src/app/[lang]/opengraph-image/route.tsx';
import { getDictionary } from '../../src/app/[lang]/dictionaries.ts';
import { parseOpenGraphDimensions } from '../../src/utils/openGraphDimensions.ts';

const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWMQVDIWVDJmgFAACq4BmbwhqwsAAAAASUVORK5CYII=';
const invalidValues = ['', '0', '-1', 'NaN', 'Infinity', '1.5', '64px', '1e2', '0x40', '+64', ' 64', '64 ', '64\n', '６４', '4097', '9'.repeat(400)];

test('F2 rejects malformed dimensions and caps each side and the total area', () => {
  for (const key of ['width', 'height']) {
    for (const value of invalidValues) {
      assert.equal(parseOpenGraphDimensions(new URLSearchParams({ [key]: value })), null, `${key}=${value}`);
    }
  }
  assert.equal(parseOpenGraphDimensions(new URLSearchParams({ width: '2049', height: '2048' })), null);
  assert.equal(parseOpenGraphDimensions(new URLSearchParams({ width: '4096', height: '4096' })), null);
  assert.deepEqual(parseOpenGraphDimensions(new URLSearchParams({ width: '4096', height: '1024' })), { width: 4096, height: 1024 });
});

test('F2 preserves defaults, independently omitted dimensions, and small decimal integers', () => {
  for (const [query, expected] of [
    ['', { width: 1200, height: 630 }],
    ['width=800&height=800', { width: 800, height: 800 }],
    ['width=64', { width: 64, height: 630 }],
    ['height=64', { width: 1200, height: 64 }],
    ['width=1&height=1', { width: 1, height: 1 }],
    ['width=0064&height=64', { width: 64, height: 64 }],
  ]) {
    assert.deepEqual(parseOpenGraphDimensions(new URLSearchParams(query)), expected);
  }
});

test('F2 route returns localized 400 before background conversion or rendering', async (t) => {
  // Node 20 exposes fetch lazily; initialize it before MockTracker reads its descriptor.
  assert.equal(typeof globalThis.fetch, 'function');
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected image fetch'); });
  for (const lang of ['en-US', 'zh-CN']) {
    const dictionary = await getDictionary(lang);
    for (const key of ['width', 'height']) {
      for (const value of invalidValues) {
        const query = new URLSearchParams({ [key]: value, background_image: 'https://techzjc.com/input.webp' });
        const response = await GET(new Request(`http://localhost/${lang}/opengraph-image?${query}`), { params: Promise.resolve({ lang }) });
        assert.equal(response.status, 400, `${lang} ${key}=${value}`);
        assert.equal(await response.text(), dictionary.opengraph_image.invalid_dimensions);
      }
    }
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('F2 valid defaults, site square, and small images complete the PNG response stream', async () => {
  for (const [dimensions, expected] of [
    [{}, [1200, 630]],
    [{ width: '800', height: '800' }, [800, 800]],
    [{ width: '64', height: '64' }, [64, 64]],
    [{ width: '1', height: '1' }, [1, 1]],
  ]) {
    const query = new URLSearchParams({ ...dimensions, background_image: tinyPng, title: 'Fuzz' });
    const response = await GET(new Request(`http://localhost/en-US/opengraph-image?${query}`), { params: Promise.resolve({ lang: 'en-US' }) });
    assert.equal(response.status, 200);
    const png = Buffer.from(await response.arrayBuffer());
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], expected);
  }
});
