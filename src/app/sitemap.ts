import { getAllPosts } from "@/lib/blog";

export default async function sitemap() {
  const baseUrl = "https://techzjc.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/licenses`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
    },
    ...getAllPosts().map((post) => ({
      url: `${baseUrl}/blog/${post.year}/${post.month}/${post.day}/${post.slug}`,
      lastModified: new Date(post.time),
    })),
  ];
}
