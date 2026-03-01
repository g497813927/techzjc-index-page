/**
 * Estimate token count for mixed-language markdown.
 *
 * Notes:
 * - This is an estimate. Exact tokenization depends on the model.
 * - We bias toward being slightly high to avoid context overflows.
 */
export function estimateMarkdownTokens(markdown: string): number {
  const s = markdown ?? "";

  const cjkChars =
    (s.match(/[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u30FF\uAC00-\uD7AF]/g) ?? []).length; // CJK & related (Han, Hiragana, Katakana, Hangul)

  // Rough "word-like" tokens for Latin scripts, numbers, and identifiers.
  const wordLike = (s.match(/[A-Za-z0-9_]+/g) ?? []).length;

  // Punctuation & symbols often contribute some tokens too, especially in markdown/code.
  // This is intentionally conservative.
  const punct = (s.match(/[^\sA-Za-z0-9_\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u30FF\uAC00-\uD7AF]/g) ?? []).length;

  // Weighting:
  // - CJK chars: ~1 token each (varies, but decent)
  // - word-like: ~1.3 tokens per "word" (accounts for subword splitting)
  // - punctuation: small contribution (markdown/code heavy pages)
  const est =
    cjkChars * 1.0 +
    wordLike * 1.3 +
    punct * 0.1;

  // Ensure minimum 1 and return an integer.
  return Math.max(1, Math.ceil(est));
}
