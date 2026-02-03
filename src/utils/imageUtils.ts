function SantizeURL(urlString: string): string | boolean {
  let imageURLObj: URL;
  try {
    imageURLObj = new URL(urlString);
  } catch {
    return false; // Invalid URL format
  }

  // Validate URL components to mitigate SSRF
  const protocol = imageURLObj.protocol;
  const rawHostname = imageURLObj.hostname;
  const port = imageURLObj.port;
  const path = imageURLObj.pathname || "/";

  // Only allow http/https
  if (protocol !== "http:" && protocol !== "https:") {
    return false;
  }

  // Normalize hostname by removing any trailing dot
  const normalizedHostname = rawHostname.replace(/\.$/, "");

  const whitelist_domains = [
    "techzjc.com",
    "static.techzjc.com",
    "test-cn.techzjc.com",
  ];

  // Enforce hostname allow-list
  if (!whitelist_domains.includes(normalizedHostname)) {
    return false;
  }

  // Disallow non-standard or explicit ports to avoid bypassing expected services
  if (port && port !== "80" && port !== "443") {
    return false;
  }

  // Basic path sanity checks: must be absolute and not contain path traversal
  if (!path.startsWith("/") || path.includes("..")) {
    return false;
  }
  return `${protocol}//${normalizedHostname}${port ? `:${port}` : ""}${path}`;
}

export function isSafeImageUrl(urlString: string): boolean {
  if (!urlString) return false;
  if (urlString.startsWith("data:image/")) {
    return true;
  }
  const sanitizedURL = SantizeURL(urlString);
  return typeof sanitizedURL === "string";
}

export function convertToSafeImageUrl(urlString: string): string | Response {
  if (!isSafeImageUrl(urlString)) {
    return new Response("Unsafe image URL", { status: 400 });
  } else if (urlString.startsWith("data:image/")) {
    // Check if data URL is too large (e.g. >5MB) to prevent DoS
    const base64Data = urlString.split(",")[1] || "";
    const byteLength = (base64Data.length * 3) / 4; // Approximate byte length of base64 data
    if (byteLength > 5 * 1024 * 1024) { // 5MB limit
      return new Response("Image size exceeds limit", { status: 413 });
    }
    // Check if it's a valid base64 string
    try {
        atob(base64Data);
    } catch {
        return new Response("Invalid base64 image data", { status: 400 });
    }
    // Then, check its type (allow only jpeg/png)
    const mimeType = urlString.match(/^data:(image\/(jpeg|png));base64,/)?.[1];
    if (!mimeType) {
      return new Response("Unsupported image type", { status: 415 });
    }
    const safeBase64Data = base64Data.replace(/[^A-Za-z0-9+/=]/g, ""); // Sanitize base64 data
    // Retrieve the sanitized MIME type and hardcode it in the returned data URL to prevent any tampering
    if (mimeType === "image/jpeg" || mimeType === "image/png") {
        return `data:${mimeType};base64,${safeBase64Data}`;
    } else {
        return new Response("Unsupported image type", { status: 415 });
    }
  } else {
    const sanitizedURL = SantizeURL(urlString);
    if (!sanitizedURL) {
      return new Response("Invalid image URL", { status: 400 });
    }
    if (typeof sanitizedURL !== "string") {
      return new Response("Unsafe image URL", { status: 400 });
    }
    return encodeURI(sanitizedURL);
  }
}
