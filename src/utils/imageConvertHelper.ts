/**
 * This helper function converts an image to JPEG format and encodes it in base64.
 * 
 * @param request Next.js Request object which initiated the conversion request
 * @param lang Current language locale
 * @param background_image URL of the image to be converted
 * @returns A base64-encoded JPEG data URL of the converted image
 */
export async function convertToJpegBase64(
  request: Request,
  lang: string,
  background_image: string
) {
  const authToken = process.env.CDN_ORIGIN_AUTH;
  if (!authToken) {
    console.error("CDN_ORIGIN_AUTH is not set in environment variables.");
    throw new Error("CDN_ORIGIN_AUTH not configured");
  }
  const background_image_url = `${new URL(
    `/${lang}/convert`,
    request.url
  )}?imageUrl=${encodeURIComponent(background_image)}`;
  // Fetch the converted image and make it base64 to embed in og image
  const converted_response = await fetch(background_image_url, {
    // Add authentication header so that the middleware proxy.ts allows the request
    headers: {
      "x-origin-auth": authToken,
    },
  });
  if (!converted_response.ok) {
    console.error(
      "Failed to convert background image for OG image generation."
    );
    throw new Error("Failed to convert background image");
  }
  const converted_blob = await converted_response.blob();
  const arrayBuffer = await converted_blob.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString("base64");
  const contentType =
    converted_response.headers.get("Content-Type") || "image/jpeg";
  return `data:${contentType};base64,${base64Image}`;
}
