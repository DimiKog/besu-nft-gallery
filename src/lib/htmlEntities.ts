/**
 * Decode a small set of common HTML entities in plain text.
 * Does not parse or render HTML markup.
 */
export function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
