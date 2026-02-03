export function isSafeImageUrl(urlString: string): boolean {
  if (!urlString) return false;
  if (urlString.startsWith("data:image/")) {
    return true;
  }
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
    const path = imageURLObj.pathname || '/';

    // Only allow http/https
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    // Normalize hostname by removing any trailing dot
    const normalizedHostname = rawHostname.replace(/\.$/, '');

    const whitelist_domains = ['techzjc.com', 'static.techzjc.com', 'test-cn.techzjc.com'];

    // Enforce hostname allow-list
    if (!whitelist_domains.includes(normalizedHostname)) {
      return false;
    }

    // Disallow non-standard or explicit ports to avoid bypassing expected services
    if (port && port !== '80' && port !== '443') {
      return false;
    }

    // Basic path sanity checks: must be absolute and not contain path traversal
    if (!path.startsWith('/') || path.includes('..')) {
      return false;
    }

    return true;
}

export function convertToSafeImageUrl(urlString: string): string | Response {
    if (!isSafeImageUrl(urlString)) {
        return new Response('Unsafe image URL', { status: 400 });
    }
    const imageURLObj: URL = new URL(urlString);
    const protocol = imageURLObj.protocol;
    const rawHostname = imageURLObj.hostname;
    const port = imageURLObj.port;
    const path = imageURLObj.pathname || '/';
    const normalizedHostname = rawHostname.replace(/\.$/, '');

    // Reconstruct safe URL
    let safeURL = `${protocol}//${normalizedHostname}`;
    if (port) {
        safeURL += `:${port}`;
    }
    safeURL += path;
    if (imageURLObj.search) {
        safeURL += imageURLObj.search;
    }
    if (imageURLObj.hash) {
        safeURL += imageURLObj.hash;
    }
    return safeURL;
}
