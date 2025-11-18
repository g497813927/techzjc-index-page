import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { rehypeGithubAlerts } from 'rehype-github-alerts';

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [
      remarkGfm
    ],
    rehypePlugins: [
        rehypeGithubAlerts
    ],
  },
};

export function MDXContent({ source }: { source: string }) {
  return <MDXRemote
        source={source}
        options={mdxOptions}
    />;
}
