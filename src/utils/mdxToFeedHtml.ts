import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';

export async function mdxToFeedHtml(mdx: string): Promise<string> {
  const file = await compile(mdx, {
    outputFormat: 'function-body',
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  });

  return String(file.value);
}
