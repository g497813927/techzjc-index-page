import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { notFound } from 'next/navigation';

const postsDirectory = path.join(process.cwd(), "/content/blog");

export type PostMeta = {
  year: string;
  month: string;
  day: string;
  title: string;
  slug: string;
  time: string;
  description?: string;
  tags?: string[];
  content?: string;
  ogImage?: string;
};

export type Post = PostMeta & {
  content: string;
  lang: string;
};

export function getAllPosts(lang?: string): PostMeta[] {
  const fileNames = fs.readdirSync(postsDirectory, {
    recursive: true,
    withFileTypes: true,
  });

  const posts = fileNames
    .filter((file) => {
      if (!file.isFile()) return false;
      if (
        (file.name.endsWith(".mdx") || file.name.endsWith(".md")) &&
        file.name !== "README.md"
      ) {
        const { lang: fileLang } = matter(
          fs.readFileSync(
            path.join(file.parentPath ?? "", file.name),
            "utf8"
          )
        ).data;
        if (lang) {
          return fileLang === lang;
        }
        return true;
      }
      return false;
    })
    .map((fileName) => {
      const fullPath = path.join(fileName.parentPath ?? "", fileName.name);
      console.log("Reading post file:", fullPath);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      return {
        year: data.time.split(" ")[0].split("-")[0],
        month: data.time.split(" ")[0].split("-")[1],
        day: data.time.split(" ")[0].split("-")[2],
        title: data.title,
        slug: fileName.name.replace(/\.mdx?$/, ""),
        time: data.time,
        tags: data.tags || [],
        description: data.description || "",
      } as PostMeta;
    })
    .sort((a, b) => (a.time < b.time ? 1 : -1)); // newest first

  return posts;
}

export function getPostByYear(year: string, lang?: string): PostMeta[] {
  const allPosts = getAllPosts(lang);
  return allPosts.filter((post) => post.year === year);
}

export function getPostByYearAndMonth(
  year: string,
  month: string,
  lang?: string
): PostMeta[] {
  const allPosts = getAllPosts(lang);
  return allPosts.filter((post) => post.year === year && post.month === month);
}

export function getPostByYearMonthAndDay(
  year: string,
  month: string,
  day: string,
  lang?: string
): PostMeta[] {
  const allPosts = getAllPosts(lang);
  return allPosts.filter(
    (post) => post.year === year && post.month === month && post.day === day
  );
}

export function getPostBySlug(
  slug: string,
  year?: string,
  month?: string,
  day?: string
): Post {
  if (!year && !month && !day) {
    // Search all directories for the slug
    const allPosts = getAllPosts();
    const postMeta = allPosts.find((post) => post.slug === slug);
    if (!postMeta) {
      throw new Error(`Post with slug "${slug}" not found.`);
    }
    year = postMeta.year;
    month = postMeta.month;
    day = postMeta.day;
    const fileContents = fs.readFileSync(
      path.join(postsDirectory, year, month, day, `${slug}.mdx`),
      "utf8"
    );
    const { data, content } = matter(fileContents);
    return {
      title: data.title,
      slug: slug,
      time: data.time,
      year: year,
      month: month,
      day: day,
      description: data.description || "",
      tags: data.tags || [],
      lang: data.lang,
      content,
    };
  }
  // Check if year, month, day are all provided, if not, 404 for now
  if (!year || !month || !day) {
    return notFound();
  }
  // Make sure to revert the slug from URL encoded to normal string
  const decodedSlug = decodeURIComponent(slug);
  const filePath = path.join(
    postsDirectory,
    year,
    month,
    day,
    `${decodedSlug}.mdx`
  );
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    title: data.title,
    slug: data.slug,
    time: data.time,
    year: data.time.split(" ")[0].split("-")[0],
    month: data.time.split(" ")[0].split("-")[1],
    day: data.time.split(" ")[0].split("-")[2],
    description: data.description || "",
    lang: data.lang,
    tags: data.tags || [],
    content,
  };
}

export function getAllSlugs(): string[] {
  const fileNames = fs.readdirSync(postsDirectory, {
    recursive: true,
    withFileTypes: true,
  });
  return fileNames
    .filter((file) => {
      if (!file.isFile()) return false;
      return (file.name.endsWith(".mdx") || file.name.endsWith(".md")) && file.name !== "README.md";
    })
    .map((fileName) => fileName.name.replace(/\.mdx?$/, ""));
}
