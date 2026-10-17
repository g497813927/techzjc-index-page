import "server-only";
import { remoteImageToDataUrl } from "./remoteImage.server";

/** Convert in-process so image rendering never forwards origin credentials. */
export function convertToJpegBase64(backgroundImage: string) {
  return remoteImageToDataUrl(backgroundImage, "jpeg");
}
