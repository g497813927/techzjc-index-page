export function isSafeImageUrl(urlString: string): boolean {
  if (!urlString) return false;
  if (urlString.startsWith("data:image/")) {
    return true;
  }
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
      return false;
    }
    const hostname = parsed.hostname.replace(/\.$/, '');
    const allowedDomains = ['techzjc.com', 'static.techzjc.com'];
    if (!allowedDomains.includes(hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
