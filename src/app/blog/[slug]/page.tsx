import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import "./page.css";
import { notFound } from 'next/navigation';
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { MDXContent } from "@/components/blog/MDXContent";
import 'github-markdown-css/github-markdown.css';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
// import 'github-markdown-css/github-markdown-dark.css';


type Props = {
    params: { slug: string };
};

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
