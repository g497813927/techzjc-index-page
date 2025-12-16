import { fetchedPhotos1, fetchedPhotos2 } from "@/components/PhotoWall";
import { getAllPosts } from "@/lib/blog";

export default async function sitemap() {
  const baseUrl = "https://techzjc.com";
  const locales = ["en-US", "zh-CN"] as const;

  return [
    ...locales.flatMap((locale) => [
      {
        url: `${baseUrl}/${locale}`,
        lastModified: new Date(),
        images: [
        ...fetchedPhotos1.map(photo => 
          `https://techzjc.com${photo.url}`,
        ),
        ...fetchedPhotos2.map(photo => 
          `https://techzjc.com${photo.url}`,
        ),
      ]
      },
    ]),
    ...locales.flatMap((locale) => [
      {
        url: `${baseUrl}/${locale}/licenses`,
        lastModified: new Date(),
      }
    ]),
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
