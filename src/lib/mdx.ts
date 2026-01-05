import { compileMDX } from "next-mdx-remote/rsc";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { rehypeGithubAlerts } from "rehype-github-alerts";
import PreWithCopy from "@/components/blog/CopyCodeButton";
import Image from "next/image";

export async function getMdxCompiled(source: string) {
  return compileMDX({
    source,
    components: {
      pre: PreWithCopy,
      Image: Image,
    },
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
            rehypeGithubAlerts,
            rehypeHighlight
        ],
      },
    },
  });
}