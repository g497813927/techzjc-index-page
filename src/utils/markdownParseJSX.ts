export default async function markdownParseJSX(mdx: string): Promise<string> {
  // Helper to convert Image props to Markdown image syntax
  const imageAttrsToMarkdown = (attrs: string): string => {
    const srcMatch = attrs.match(/src=["']([^"']*)["']/);
    const altMatch = attrs.match(/alt=["']([^"']*)["']/);
    const src = srcMatch ? srcMatch[1] : "";
    const alt = altMatch ? altMatch[1] : "";
    return `![${alt}](${src})`;
  };

  // Remove div wrapper for Image components and convert to Markdown
  const imageDivPattern = /<div[^>]*>\s*<Image\s+([^>]*)\/>\s*<\/div>/g;
  mdx = mdx.replace(imageDivPattern, (_match, attrs) => {
    return imageAttrsToMarkdown(attrs);
  });

  // Also convert standalone self-closing Image components to Markdown
  const imagePattern = /<Image\s+([^>]*)\/>/g;
  mdx = mdx.replace(imagePattern, (_match, attrs) => {
    return imageAttrsToMarkdown(attrs);
  });
  return mdx;
}
