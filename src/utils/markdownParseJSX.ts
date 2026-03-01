export default async function markdownParseJSX(mdx: string): Promise<string> {
  // Remove div wrapper for Image components
  const imageDivPattern = /<div[^>]*>\s*<Image\s+([^>]*)\/>\s*<\/div>/g;
  mdx = mdx.replace(imageDivPattern, (match, attrs) => {
    // Convert Image props to img attributes
    const srcMatch = attrs.match(/src=["']([^"']*)["']/);
    const altMatch = attrs.match(/alt=["']([^"']*)["']/);
    const src = srcMatch ? srcMatch[1] : "";
    const alt = altMatch ? altMatch[1] : "";
    return `![${alt}](${src})`;
  });
  return mdx;
}
