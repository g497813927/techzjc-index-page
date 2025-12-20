import "server-only";

import * as React from "react";
import { compile, run } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

export async function mdxToFeedHtml(mdx: string): Promise<string> {
  const compiled = await compile(mdx, {
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
