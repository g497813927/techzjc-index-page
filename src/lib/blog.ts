import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'src/content/blog');

export type PostMeta = {
  title: string;
  slug: string;
  date: string;
  description?: string;
};

export type Post = PostMeta & {
  content: string;
};

export function getAllPosts(): PostMeta[] {
  const fileNames = fs.readdirSync(postsDirectory);

  const posts = fileNames
    .filter((file) => file.endsWith('.mdx') || file.endsWith('.md'))
    .map((fileName) => {
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        title: data.title,
        slug: fileName.replace(/\.mdx?$/, ''),
        date: data.date,
        description: data.description || '',
      } as PostMeta;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

  return posts;
}

export function getPostBySlug(slug: string): Post {
  const filePath = path.join(postsDirectory, `${slug}.mdx`);
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    title: data.title,
    slug: data.slug,
    date: data.date,
    description: data.description || '',
    content,
  };
}

export function getAllSlugs(): string[] {
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((file) => file.endsWith('.mdx') || file.endsWith('.md'))
    .map((fileName) => fileName.replace(/\.mdx?$/, ''));
}
