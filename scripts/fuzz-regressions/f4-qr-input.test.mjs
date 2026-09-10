import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import QRCode from 'qrcode';
import { GET } from '../../src/app/[lang]/sharable-card/route.tsx';
import { getDictionary } from '../../src/app/[lang]/dictionaries.ts';
import { createSharableQrCode } from '../../src/utils/sharableQrCode.ts';

const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWMQVDIWVDJmgFAACq4BmbwhqwsAAAAASUVORK5CYII=';

function request(query, lang = 'en-US') {
  return GET(new Request(`http://localhost/${lang}/sharable-card?${new URLSearchParams(query)}`), { params: Promise.resolve({ lang }) });
}

test('F4 rejects empty text and the encoder-specific capacity limit', async () => {
  for (const text of ['', 'a'.repeat(4096), 'A'.repeat(4096), '1'.repeat(6000), '字'.repeat(800), '😀'.repeat(600)]) {
    assert.equal(await createSharableQrCode(text), null);
  }
});

test('F4 preserves arbitrary text and the different numeric, alphanumeric, and UTF-8 capacities', async () => {
  for (const text of ['plain text, not a URL', ' ', '1'.repeat(4096), 'A'.repeat(3000), 'a'.repeat(2000), '字'.repeat(700), '😀'.repeat(500)]) {
    const encoded = await createSharableQrCode(text);
    assert.match(encoded, /^data:image\/png;base64,/);
  }
});

test('F4 localized 400 responses precede background conversion and font access', async (t) => {
  // Node 20 exposes fetch lazily; initialize it before MockTracker reads its descriptor.
  assert.equal(typeof globalThis.fetch, 'function');
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected image fetch'); });
  for (const lang of ['en-US', 'zh-CN']) {
    const dictionary = await getDictionary(lang);
    for (const link of ['', 'a'.repeat(4096), '字'.repeat(800)]) {
      const response = await request({ link, background_image: 'https://techzjc.com/input.webp' }, lang);
      assert.equal(response.status, 400);
      assert.equal(await response.text(), dictionary.sharable_card.invalid_qr_input);
    }
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('F4 preserves the omitted link default and streams valid arbitrary-text cards', async (t) => {
  const original = QRCode.toDataURL;
  const encodeMock = t.mock.method(QRCode, 'toDataURL', (...args) => original(...args));
  for (const query of [{}, { link: 'plain text' }, { link: '1'.repeat(4096) }]) {
    const response = await request({ ...query, background_image: tinyPng, quotation: 'Example' });
    assert.equal(response.status, 200);
    const png = Buffer.from(await response.arrayBuffer());
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 518);
  }
  assert.equal(encodeMock.mock.calls[0].arguments[0], 'https://techzjc.com');
  assert.equal(encodeMock.mock.calls[1].arguments[0], 'plain text');
});

test('F4 unexpected encoder failures remain server errors', async (t) => {
  const failure = new Error('Unexpected PNG renderer failure');
  t.mock.method(QRCode, 'toDataURL', async () => { throw failure; });
  t.mock.method(console, 'error', () => {});
  await assert.rejects(createSharableQrCode('valid text'), (error) => error === failure);
  const response = await request({ link: 'valid text', background_image: tinyPng });
  assert.equal(response.status, 500);
  assert.equal(await response.text(), 'Failed to generate the image');
});

test('F4 font failures are not classified as QR input errors', async (t) => {
  const previousDirectory = process.cwd();
  const emptyDirectory = await mkdtemp(join(tmpdir(), 'f4-missing-font-'));
  t.mock.method(console, 'log', () => {});
  try {
    process.chdir(emptyDirectory);
    const response = await request({ link: 'valid text', background_image: tinyPng });
    assert.equal(response.status, 500);
    assert.equal(await response.text(), 'Failed to generate the image');
  } finally {
    process.chdir(previousDirectory);
    await rm(emptyDirectory, { recursive: true, force: true });
  }
});
