import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { remarkGitHubAlerts } from 'remark-github-markdown-alerts';
import rehypeRaw from 'rehype-raw'

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [
      remarkGfm,
      remarkGitHubAlerts,
    ],
    rehypePlugins: [
        rehypeRaw
    ],
  },
};

export function MDXContent({ source }: { source: string }) {
  return <MDXRemote source={source} options={mdxOptions} />;
}
