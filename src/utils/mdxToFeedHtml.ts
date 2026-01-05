import "server-only";

import * as React from "react";
import { compile, run } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

export async function mdxToFeedHtml(mdx: string): Promise<string> {
  // Replace Next.js Image components with standard img tags for feed generation
  const processedMdx = mdx.replace(/<Image\s+([^>]*)\/>/g, (match, attrs) => {
    // Convert Image props to img attributes
    const srcMatch = attrs.match(/src=["']([^"']*)["']/);
    const altMatch = attrs.match(/alt=["']([^"']*)["']/);
    const src = srcMatch ? srcMatch[1] : "";
    const alt = altMatch ? altMatch[1] : "";
    return `<img src="${src}" alt="${alt}" />`;
  });

  const compiled = await compile(processedMdx, {
    outputFormat: "function-body",
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
    development: false,
  });

  const mod = await run(String(compiled.value), {
    ...React,
    Fragment: React.Fragment,
    jsx: React.createElement,
    jsxs: React.createElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Content = (mod as any).default;
  const element = React.createElement(Content, {});

  const { renderToStaticMarkup } = await import("react-dom/server");
  return renderToStaticMarkup(element);
}
