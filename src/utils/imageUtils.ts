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
    // Optionally restrict to your own domain, e.g.:
    // if (!parsed.hostname.endsWith("techzjc.com")) return false;
    return true;
  } catch {
    return false;
  }
}
