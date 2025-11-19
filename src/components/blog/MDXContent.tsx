import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { rehypeGithubAlerts } from 'rehype-github-alerts';
import rehypeHighlight from "rehype-highlight";

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [
      remarkGfm
    ],
    rehypePlugins: [
        rehypeGithubAlerts,
        rehypeHighlight
    ],
  },
};

export function MDXContent({ source }: { source: string }) {
  return <MDXRemote
        source={source}
        options={mdxOptions}
    />;
}
