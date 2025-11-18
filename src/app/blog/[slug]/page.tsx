import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import "./page.css";
import { notFound } from 'next/navigation';
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { MDXContent } from "@/components/blog/MDXContent";
import { Metadata } from "next";
import 'github-markdown-css/github-markdown.css';
import Link from "next/link";
// import 'github-markdown-css/github-markdown-dark.css';


type Props = {
    params: { slug: string };
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
    const { slug } = params;
    let Post = null;
    try {
        Post = getPostBySlug(slug);
    } catch (error) {
        console.error("Error fetching post for metadata:", error);
        return {
            title: "Post Not Found - Techzjc",
            description: "The requested blog post could not be found.",
        };
    }

    return {
        title: `${Post.title} - Techzjc`,
        description: Post.description || `Read the blog post titled "${Post.title}" on Techzjc.`,
        keywords: ["techzjc", "科技ZJC网", "ZJC科技网", "Techzjc", "ZJC", "赵佳成", "g497813927", "Jiacheng Zhao", "John Zhao", "blog", "techzjc blog", Post.title],
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
            canonical: `https://techzjc.com/blog/${slug}`,
        },
    };
}


export async function generateStaticParams() {
    const slugs = getAllSlugs();
    return slugs.map((slug) => ({ slug }));
}


export default async function PostPage({ params }: Props) {
    const { slug } = await params;
    let Post = null;
    try {
        Post = getPostBySlug(slug);
    } catch (error) {
        console.error("Error fetching post:", error);
        return notFound();
    }
    return (
        <>
            <NavBar hasHero={false} />
            <article className="page-body article-content column-content container markdown-body dissolve-in">
                <div className="breadcumb-link">
                    <Link href="/blog" className="breadcumb">Blog</Link>/<Link href={`/blog/${slug}`} className="back-to-blog-link">{Post.title}</Link>
                </div>
                <h1 className="article-title">{Post.title}</h1>
                <p className="article-date">{Post.date}</p>
                <MDXContent source={Post.content} />
            </article>
            <Footer />
        </>
    );



}
