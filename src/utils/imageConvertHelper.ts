import "server-only";
import { remoteImageToDataUrl } from "./remoteImage.server";

/** Convert in-process so image rendering never forwards origin credentials. */
export async function convertToJpegBase64(backgroundImage: string) {
  const image = await remoteImageToDataUrl(backgroundImage, "jpeg");
  if (image instanceof Response) {
    throw new Error("Failed to convert background image");
  }
  return image;
}
