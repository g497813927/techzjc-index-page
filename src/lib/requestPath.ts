/** Validate once without changing the encoded path used by Next's router. */
export function hasValidPathEncoding(pathname: string): boolean {
  try {
    const decoded = decodeURIComponent(pathname);
    // Control characters cannot name a public route and can break downstream
    // URL/header construction even when their percent encoding is well formed.
    return !Array.from(decoded).some((character) => {
      const code = character.charCodeAt(0);
      return code < 0x20 || code === 0x7f;
    });
  } catch {
    return false;
  }
}
