import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import { Metadata } from 'next';
import './page.css';

export const metadata: Metadata = {
  title: "Techzjc - Blog",
  keywords: ["techzjc", "科技ZJC网", "ZJC科技网", "Techzjc", "ZJC", "赵佳成", "g497813927", "Jiacheng Zhao", "John Zhao", "blog", "techzjc blog"],
  description: "Techzjc的博客 - 文章列表页。此处汇集了所有Techzjc的博客文章",
  icons: {
    icon: "https://static.techzjc.com/icon/favicon_index_page.ico",
    apple: [
      {
        url: "https://static.techzjc.com/icon/bookmark_icon_index_page.png",
        sizes: "180x180",
        type: "image/png"
      }
    ],
    shortcut: "https://static.techzjc.com/icon/favicon_index_page.ico"
  },
  alternates: {
    canonical: `https://techzjc.com/blog`,
  },
}

export default function BlogPage() {
    const posts = getAllPosts();

    return (
        <>
            <NavBar hasHero={false} />
            <main className="page-body container column-content dissolve-in blog">
                <h1 className="page-title">Blog</h1>
                <ul className="blog-post-list">
                    {posts.map((post) => (
                            <li key={post.slug}>
                                <Link href={`/blog/${post.year}/${post.month}/${post.day}/${post.slug}`} className="blog-post-link">
                                    <h2>{post.title}</h2>
                                    <p className="blog-post-date">{post.time}</p>
                                    <p>{post.description || 'No description available.'}</p>
                                </Link>
                            </li>
                    ))}
                </ul>
                <p className='end-of-page'>You&#39;ve reached the end of the blog posts.</p>
            </main>
            <Footer />
        </>
    );
}
