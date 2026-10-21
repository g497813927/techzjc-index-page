/** Validate once without changing the encoded path used by Next's router. */
export function hasValidPathEncoding(pathname: string): boolean {
  try {
    const decoded = decodeURIComponent(pathname);
    // Control characters cannot name a public route and can break downstream
    // URL/header construction even when their percent encoding is well formed.
    for (const character of decoded) {
      const code = character.charCodeAt(0);
      if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
