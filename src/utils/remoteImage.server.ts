import "server-only";
import sharp from "sharp";
import { sanitizeRemoteImageUrl } from "./imageUtils";

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
export const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;
const failedImage = () => new Response("Failed to fetch image", { status: 502 });
const oversizedImage = () => new Response("Image size exceeds limit", { status: 413 });

async function readBoundedImage(response: Response): Promise<Response> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REMOTE_IMAGE_BYTES) {
    await response.body?.cancel();
    return oversizedImage();
  }
  if (!response.body) return failedImage();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      // Fetch exposes decompressed bytes. Do not trust Content-Length alone.
      if (size > MAX_REMOTE_IMAGE_BYTES) {
        await reader.cancel();
        return oversizedImage();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Response(Buffer.concat(chunks, size), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/octet-stream" },
  });
}

/** Enforce the image origin policy before every request, including redirects. */
export async function fetchRemoteImage(imageUrl: string): Promise<Response> {
  // This network-only boundary never accepts the inline-data branch of the
  // browser-safe image helper. Inline images are decoded separately by callers.
  const initialTarget = sanitizeRemoteImageUrl(imageUrl);
  if (!initialTarget) {
    return new Response("Unsafe image URL", { status: 400 });
  }

  let target: URL = initialTarget;
  target.pathname = encodeURI(target.pathname);
  const signal = AbortSignal.timeout(10_000);
  try {
    for (let redirects = 0; redirects <= 5; redirects++) {
      const response = await fetch(target, { redirect: "manual", signal });
      if (!redirectStatuses.has(response.status)) {
        if (response.ok) return await readBoundedImage(response);
        await response.body?.cancel();
        return failedImage();
      }

      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirects === 5) return failedImage();
      const destination = new URL(location, target);
      const safeDestination = sanitizeRemoteImageUrl(destination.href);
      if (!safeDestination) return failedImage();
      // Keep redirect query strings and existing escapes, as native fetch does.
      // Only the validated path/query may vary; the authority is a fixed literal.
      safeDestination.search = destination.search;
      target = safeDestination;
    }
  } catch {
    return failedImage();
  }
  return failedImage();
}

/** Embed decoded bytes so ImageResponse cannot perform a second, unguarded fetch. */
export async function remoteImageToDataUrl(
  imageUrl: string,
  outputFormat?: "jpeg",
): Promise<string | Response> {
  const response = await fetchRemoteImage(imageUrl);
  if (!response.ok) return response;
  try {
    const image = sharp(await response.arrayBuffer());
    const { format } = await image.metadata();
    const type = outputFormat ?? (format === "png" ? "png" : "jpeg");
    const data = await (type === "png" ? image.png() : image.jpeg({ quality: 80 })).toBuffer();
    if (data.byteLength > MAX_REMOTE_IMAGE_BYTES) return oversizedImage();
    return `data:image/${type};base64,${data.toString("base64")}`;
  } catch {
    return failedImage();
  }
}
