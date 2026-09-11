export function sanitizeRemoteImageUrl(urlString: string): string | false {
  let imageURLObj: URL;
  try {
    imageURLObj = new URL(urlString);
  } catch {
    return false; // Invalid URL format
  }

  // Validate URL components to mitigate SSRF
  const protocol = imageURLObj.protocol === "https:" ? "https:"
    : imageURLObj.protocol === "http:" ? "http:" : null;
  const rawHostname = imageURLObj.hostname;
  const port = imageURLObj.port;
  const path = imageURLObj.pathname || "/";

  // Only allow http/https
  if (!protocol) {
    return false;
  }

  // Normalize hostname by removing any trailing dot
  const normalizedHostname = rawHostname.replace(/\.$/, "");

  // Select a server-owned literal, never interpolate the supplied hostname.
  let hostname: string;
  switch (normalizedHostname) {
    case "techzjc.com": hostname = "techzjc.com"; break;
    case "static.techzjc.com": hostname = "static.techzjc.com"; break;
    case "test-cn.techzjc.com": hostname = "test-cn.techzjc.com"; break;
    default: return false;
  }

  // Disallow non-standard or explicit ports to avoid bypassing expected services
  if (port && port !== "80" && port !== "443") {
    return false;
  }

  // Basic path sanity checks: must be absolute and not contain path traversal
  if (!path.startsWith("/") || path.includes("..")) {
    return false;
  }
  const safePort = port === "80" ? ":80" : port === "443" ? ":443" : "";
  return `${protocol}//${hostname}${safePort}${path}`;
}

export function isSafeImageUrl(urlString: string): boolean {
  if (!urlString) return false;
  if (urlString.startsWith("data:image/")) {
    return true;
  }
  const sanitizedURL = sanitizeRemoteImageUrl(urlString);
  return typeof sanitizedURL === "string";
}

export function convertToSafeImageUrl(urlString: string): string | Response {
  if (!isSafeImageUrl(urlString)) {
    return new Response("Unsafe image URL", { status: 400 });
  } else if (urlString.startsWith("data:image/")) {
    const prefix = urlString.match(/^data:(image\/(jpeg|png));base64,/);
    if (!prefix) {
      return new Response("Unsupported image type", { status: 415 });
    }
    // Keep this helper browser-safe. Actual image decoding happens on the server.
    const base64Data = urlString.slice(prefix[0].length).replace(/[\t\n\f\r ]/g, "");
    const maxBytes = 5 * 1024 * 1024;
    if (base64Data.length > Math.ceil(maxBytes / 3) * 4) {
      return new Response("Image size exceeds limit", { status: 413 });
    }
    try {
      const byteLength = atob(base64Data).length;
      if (byteLength === 0) {
        return new Response("Invalid base64 image data", { status: 400 });
      }
      if (byteLength > maxBytes) {
        return new Response("Image size exceeds limit", { status: 413 });
      }
    } catch {
      return new Response("Invalid base64 image data", { status: 400 });
    }
    return `data:${prefix[1]};base64,${base64Data}`;
  } else {
    const sanitizedURL = sanitizeRemoteImageUrl(urlString);
    if (!sanitizedURL) {
      return new Response("Invalid image URL", { status: 400 });
    }
    if (typeof sanitizedURL !== "string") {
      return new Response("Unsafe image URL", { status: 400 });
    }
    return encodeURI(sanitizedURL);
  }
}
