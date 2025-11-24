import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import "./page.css";
import { notFound } from 'next/navigation';
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { MDXContent } from "@/components/blog/MDXContent";
import { Metadata } from "next";
import "./style-theme.css";
import Link from "next/link";
import Image from "next/image";
import CopyCodeButton from "@/components/blog/CopyCodeButton";
import resolveParams from "@/lib/resolveParams";
import CommentSection from "@/components/blog/CommentSection";


type RouteParams = {
    slugOrYear: string;
    month: string;
    day: string;
    slug: string;
};

// Match Next.js PageProps constraint: `params` is often `Promise<any> | undefined`.
type Props = {
    params?: Promise<RouteParams>;
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
    const {
        slugOrYear: year,
        month,
        day,
        slug
    } = await resolveParams(params);
    let Post = null;
    try {
        Post = getPostBySlug(slug, year, month, day);
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
        keywords: [
            "techzjc",
            "科技ZJC网",
            "ZJC科技网",
            "Techzjc",
            "ZJC",
            "赵佳成",
            "g497813927",
            "Jiacheng Zhao",
            "John Zhao",
            "blog",
            "techzjc blog",
            Post.title,
            ...(Post.tags || [])
        ],
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
            canonical: `https://techzjc.com/blog/${year}/${month}/${day}/${slug}`,
        },
        openGraph: {
            title: `${Post.title} - Techzjc`,
            description: Post.description || `Read the blog post titled "${Post.title}" on Techzjc.`,
            url: `https://techzjc.com/blog/${year}/${month}/${day}/${slug}`,
            siteName: "Techzjc",
            images: [
                {
                    url: `/opengraph-image?title=${encodeURIComponent(Post.title.length > 40 ? Post.title.slice(0, 37) + '...' : Post.title)}&subtitle=${encodeURIComponent(`by Techzjc`)}`,
                    alt: `Open Graph Image for ${Post.title}`
                }
            ],
            locale: "en-US",
            type: "article",
        }
    };
}


export async function generateStaticParams() {
    const slugs = getAllSlugs();
    return slugs.map((slug) => ({ slug }));
}


export default async function PostPage({ params }: Props) {
    const {
        slugOrYear: year,
        month,
        day,
        slug
    } = await resolveParams(params);
    let Post = null;
    try {
        Post = getPostBySlug(slug, year, month, day);
    } catch (error) {
        console.error("Error fetching post:", error);
        return notFound();
    }
    // Add Article Structured Data for SEO
    const articleStructuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: Post.title,
        datePublished: Post.time,
        author: [
            {
                "@type": "Person",
                name: "Jiacheng Zhao",
                alternateName: "Techzjc",
                email: "mailto:admin@techzjc.com",
                url: "https://techzjc.com/",
            }
        ]
    };
    return (
        <>
            <Image alt="WeChat Share Image" src={`/opengraph-image?title=${encodeURIComponent(Post.title.length > 40 ? Post.title.slice(0, 37) + '...' : Post.title)}&subtitle=${encodeURIComponent(`by Techzjc`)}&width=800&height=800`} width={800} height={800} className="hidden" />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }} />
            <NavBar hasHero={false} />
            <article className="page-body article-content column-content container markdown-body dissolve-in" role="main">
                <div className="breadcumb-link">
                    <Link href="/blog" className="breadcumb">Blog</Link>/
                    <Link href={`/blog/${year}`} className="breadcumb">{year}</Link>/
                    <Link href={`/blog/${year}/${month}`} className="breadcumb">{month}</Link>/
                    <Link href={`/blog/${year}/${month}/${day}`} className="breadcumb">{day}</Link>/
                    <Link href={`/blog/${year}/${month}/${day}/${slug}`} className="back-to-blog-link">{Post.title}</Link>
                </div>
                <h1 className="article-title">{Post.title}</h1>
                <p className="article-date">{Post.time}</p>
                <MDXContent source={Post.content} />
                {process.env.NEXT_PUBLIC_ENABLE_COMMENTS === 'true' &&
                    <CommentSection />
                }
            </article>
            <CopyCodeButton />
            <Footer />
        </>
    );



}
