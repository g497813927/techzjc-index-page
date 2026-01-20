import { fetchedPhotos1, fetchedPhotos2 } from "@/data/photos";
import { getAllPosts } from "@/lib/blog";
import { availableLocales } from "./[lang]/dictionaries";

export default async function sitemap() {
  const baseUrl = "https://techzjc.com";
  const locales = availableLocales;

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
      {
        url: `${baseUrl}/${locale}/licenses`,
        lastModified: new Date(),
      },
      {
        url: `${baseUrl}/${locale}/blog`,
        lastModified: new Date(),
      },
      ...getAllPosts(locale).map((post) => ({
        url: `${baseUrl}/${locale}/blog/${post.year}/${post.month}/${post.day}/${post.slug}`,
        lastModified: new Date(post.time),
      })),
    ])
  ];
}
