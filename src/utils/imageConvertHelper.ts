export async function convertToJpegBase64(
  request: Request,
  lang: string,
  background_image: string
) {
  const auth_token = process.env.CDN_ORIGIN_AUTH;
  if (!auth_token) {
    console.error("CDN_ORIGIN_AUTH is not set in environment variables.");
    throw new Error("Internal Server Error");
  }
  const background_image_url = `${new URL(
    `/${lang}/convert`,
    request.url
  )}?imageUrl=${encodeURI(background_image)}`;
  // Fetch the converted image and make it base64 to embed in og image
  const converted_response = await fetch(background_image_url, {
    headers: {
      "x-origin-auth": auth_token,
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
