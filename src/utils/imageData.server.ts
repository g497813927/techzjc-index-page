import "server-only";
import { Buffer } from "node:buffer";
import sharp from "sharp";
import { convertToSafeImageUrl } from "./imageUtils";

/** Validate and fully decode inline image bytes before starting a response stream. */
export async function decodeImageDataUrl(
  imageUrl: string,
  invalidDataMessage: string,
  outputFormat?: "jpeg",
): Promise<{ data: Buffer; contentType: string } | Response> {
  const safeUrl = convertToSafeImageUrl(imageUrl);
  if (safeUrl instanceof Response) {
    return safeUrl.status === 400
      ? new Response(invalidDataMessage, { status: 400 })
      : safeUrl;
  }
  if (!safeUrl.startsWith("data:image/")) {
    return new Response(invalidDataMessage, { status: 400 });
  }

  const comma = safeUrl.indexOf(",");
  const declaredType = safeUrl.slice(5, safeUrl.indexOf(";"));
  const input = Buffer.from(safeUrl.slice(comma + 1), "base64");

  try {
    const image = sharp(input, { failOn: "warning" });
    const { format } = await image.metadata();
    if ((format !== "png" && format !== "jpeg") || declaredType !== `image/${format}`) {
      return new Response("Unsupported image type", { status: 415 });
    }

    // Metadata alone accepts truncated files. Re-encoding forces a full decode
    // and gives ImageResponse a normalized PNG/JPEG instead of untrusted bytes.
    const data = await (outputFormat === "jpeg" ? image.jpeg({ quality: 80 }) : image).toBuffer();
    return { data, contentType: `image/${outputFormat ?? format}` };
  } catch {
    return new Response(invalidDataMessage, { status: 400 });
  }
}
