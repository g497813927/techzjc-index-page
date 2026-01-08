import fetchWithTimeout from "./fetchWithTimeout";

/**
 * This helper function converts an image to JPEG format and encodes it in base64.
 * 
 * @param request Next.js Request object which initiated the conversion request
 * @param lang Current language locale
 * @param backgroundImage URL of the image to be converted
 * @returns A base64-encoded JPEG data URL of the converted image
 */
export async function convertToJpegBase64(
  request: Request,
  lang: string,
  backgroundImage: string
) {
  const authToken = process.env.CDN_ORIGIN_AUTH;
  if (!authToken) {
    console.error("CDN_ORIGIN_AUTH is not set in environment variables.");
    throw new Error("CDN_ORIGIN_AUTH not configured");
  }
  const backgroundImageUrl = `${new URL(
    `/${lang}/convert`,
    request.url
  )}?imageUrl=${encodeURIComponent(backgroundImage)}`;
  // Fetch the converted image and make it base64 to embed in og image
  const convertedResponse = await fetchWithTimeout(backgroundImageUrl, {
    // Add authentication header so that the middleware proxy.ts allows the request
    headers: {
      "x-origin-auth": authToken,
    }
  });
  if (convertedResponse instanceof Error) {
    console.error(
      "Error occurred while converting background image:",
      convertedResponse
    );
    throw convertedResponse;
  }
  if (!convertedResponse.ok) {
    console.error(
      "Failed to convert background image for OG image generation."
    );
    throw new Error("Failed to convert background image: " + convertedResponse.statusText);
  }
  const converted_blob = await convertedResponse.blob();
  const arrayBuffer = await converted_blob.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString("base64");
  const contentType =
    convertedResponse.headers.get("Content-Type") || "image/jpeg";
  return `data:${contentType};base64,${base64Image}`;
}
