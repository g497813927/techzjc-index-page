import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { convertToSafeImageUrl } from "../../src/utils/imageUtils.ts";
import { decodeImageDataUrl } from "../../src/utils/imageData.server.ts";
import { GET as convert } from "../../src/app/[lang]/convert/route.tsx";
import { GET as openGraph } from "../../src/app/[lang]/opengraph-image/route.tsx";
import { GET as sharableCard } from "../../src/app/[lang]/sharable-card/route.tsx";

const pixels = { create: { width: 32, height: 24, channels: 3, background: "#397eb3" } };
const png = await sharp(pixels).png().toBuffer();
const jpeg = await sharp(pixels).jpeg().toBuffer();
const webp = await sharp(pixels).webp().toBuffer();
const dataUrl = (type, bytes) => `data:image/${type};base64,${bytes.toString("base64")}`;
const truncatedPng = png.subarray(0, png.length - 16);
const truncatedJpeg = jpeg.subarray(0, jpeg.length - 1);
const maxBytes = 5 * 1024 * 1024;
const cases = [
  ["empty", "data:image/png;base64,", 400],
  ["whitespace only", "data:image/jpeg;base64, \n\t", 400],
  ["invalid base64", "data:image/png;base64,%%%", 400],
  ["extra data URL comma", `${dataUrl("png", png)},ignored`, 400],
  ["non-image bytes", dataUrl("png", Buffer.from("not an image")), 400],
  ["PNG signature without image data", dataUrl("png", png.subarray(0, 8)), 400],
  ["truncated PNG", dataUrl("png", truncatedPng), 400],
  ["truncated JPEG", dataUrl("jpeg", truncatedJpeg), 400],
  ["unsupported declared type", dataUrl("webp", webp), 415],
  ["unsupported actual format", dataUrl("png", webp), 415],
  ["mismatched MIME type", dataUrl("png", jpeg), 415],
  ["over 5 MiB", dataUrl("png", Buffer.alloc(maxBytes + 1)), 413],
];
const routes = [
  ["convert", convert, "imageUrl"],
  ["opengraph-image", openGraph, "background_image"],
  ["sharable-card", sharableCard, "background_image"],
];

async function requestRoute(name, handler, parameter, image, lang = "en-US") {
  const url = new URL(`http://localhost/${lang}/${name}`);
  if (image !== undefined) url.searchParams.set(parameter, image);
  url.searchParams.set("width", "64");
  url.searchParams.set("height", "64");
  url.searchParams.set("quotation", "Image validation control");
  return handler(new Request(url), { params: Promise.resolve({ lang }) });
}

async function assertImage(response, format) {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), `image/${format}`);
  // Consume the real ImageResponse stream; constructing it does not run its decoder.
  const bytes = Buffer.from(await response.arrayBuffer());
  const image = sharp(bytes, { failOn: "warning" });
  assert.equal((await image.metadata()).format, format);
  await image.raw().toBuffer();
}

test("the shared syntax policy accepts exactly 5 MiB and rejects empty or oversized data", () => {
  assert.equal(typeof convertToSafeImageUrl(dataUrl("png", Buffer.alloc(maxBytes))), "string");
  for (const [name, input, status] of cases.slice(0, 4)) {
    assert.equal(convertToSafeImageUrl(input).status, status, name);
  }
  assert.equal(convertToSafeImageUrl(dataUrl("png", Buffer.alloc(maxBytes + 1))).status, 413);
});

test("full decoding rejects truncated files even when metadata is readable", async () => {
  for (const [format, bytes] of [["png", truncatedPng], ["jpeg", truncatedJpeg]]) {
    assert.equal((await sharp(bytes).metadata()).format, format);
    const result = await decodeImageDataUrl(dataUrl(format, bytes), "Invalid image data");
    assert.equal(result.status, 400);
  }
});

for (const [name, handler, parameter] of routes) {
  test(`${name} returns controlled errors for malformed inline images`, async (t) => {
    for (const [label, input, status] of cases) {
      await t.test(label, async () => {
        const response = await requestRoute(name, handler, parameter, input);
        assert.equal(response.status, status);
        assert.ok((await response.text()).length > 0);
      });
    }
  });

  test(`${name} keeps real PNG and JPEG data working`, async () => {
    for (const [format, bytes] of [["png", png], ["jpeg", jpeg]]) {
      const response = await requestRoute(name, handler, parameter, dataUrl(format, bytes));
      await assertImage(response, name === "convert" ? "jpeg" : "png");
    }
  });

  test(`${name} localizes invalid decoded image data`, async () => {
    const response = await requestRoute(name, handler, parameter, dataUrl("png", Buffer.from("invalid")), "zh-CN");
    assert.equal(response.status, 400);
    assert.equal(await response.text(), "图片数据无效");
  });
}

test("allowlisted remote JPG/PNG, default fallback, and WebP conversion still render", async (t) => {
  const previousToken = process.env.CDN_ORIGIN_AUTH;
  process.env.CDN_ORIGIN_AUTH = "image-data-regression-only";
  const requested = [];
  t.mock.method(globalThis, "fetch", async (input, options) => {
    const url = new URL(typeof input === "string" ? input : input.url ?? input.href);
    requested.push(url.href);
    if (url.origin === "http://localhost" && url.pathname === "/en-US/convert") {
      assert.equal(new Headers(options?.headers).get("x-origin-auth"), "image-data-regression-only");
      return convert(new Request(url, options), { params: Promise.resolve({ lang: "en-US" }) });
    }
    assert.equal(url.origin, "https://techzjc.com");
    const format = url.pathname.endsWith(".webp") ? "webp" : url.pathname.endsWith(".png") ? "png" : "jpeg";
    return new Response(new Uint8Array({ webp, png, jpeg }[format]), {
      headers: { "Content-Type": `image/${format}` },
    });
  });
  try {
    for (const [name, handler, parameter] of routes.slice(1)) {
      for (const image of [
        `https://techzjc.com/${name}-control.jpg`,
        `https://techzjc.com/${name}-control.png`,
        `https://techzjc.com/${name}-control.webp`,
        "https://untrusted.invalid/image.png",
        undefined,
      ]) {
        await assertImage(await requestRoute(name, handler, parameter, image), "png");
      }
    }
    assert.ok(requested.some((url) => url.endsWith("hero-image-og.jpg")));
    assert.ok(requested.some((url) => url.endsWith(".webp")));
    assert.ok(requested.some((url) => new URL(url).pathname === "/en-US/convert"));
  } finally {
    if (previousToken === undefined) delete process.env.CDN_ORIGIN_AUTH;
    else process.env.CDN_ORIGIN_AUTH = previousToken;
  }
});
