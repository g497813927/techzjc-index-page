import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import './page.css';

export default function BlogPage() {
    const posts = getAllPosts();

    return (
        <>
            <NavBar hasHero={false} />
            <main className="page-body container column-content dissolve-in">
                <h1 className="page-title">Blog</h1>
                <ul className="blog-post-list">
                    {posts.map((post) => (
                            <li key={post.slug}>
                                <Link href={`/blog/${post.slug}`}>
                                    <h2>{post.title}</h2>
                                    <p className="blog-post-date">{post.date}</p>
                                    <p>{post.description}</p>
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
