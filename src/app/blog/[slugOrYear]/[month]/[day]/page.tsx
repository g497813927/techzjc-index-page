import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { getPostByYearMonthAndDay } from "@/lib/blog";
import { Metadata } from "next";
import Link from "next/link";
import "@/app/blog/page.css";
import resolveParams from "@/lib/resolveParams";

type RouteParams = { slugOrYear: string; month: string; day: string };

type Props = {
    params?: Promise<RouteParams>;
};

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { slugOrYear: year, month, day } = await resolveParams(params);

    try {
        return {
            title: `${year}-${month} - Techzjc`,
            description: `Blog posts in ${year}-${month}-${day} on Techzjc.`,
            keywords: ["techzjc", "科技ZJC网", "ZJC科技网", "Techzjc", "ZJC", "赵佳成", "g497813927", "Jiacheng Zhao", "John Zhao", "blog", "techzjc blog", `${year}-${month}-${day}`],
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
                canonical: `https://techzjc.com/blog/${year}/${month}/${day}`,
            },
        }

    } catch (error) {
        console.error("Error fetching post for metadata:", error);
        return {
            title: "Post Not Found - Techzjc",
            description: "The requested blog post could not be found.",
        };
    }
}

export default async function PostPage({ params }: Props) {
    const { slugOrYear: year, month, day } = await resolveParams(params);
    const posts = getPostByYearMonthAndDay(year, month, day);
    return (
        <>
            <NavBar hasHero={false} />
            <main className="page-body container column-content dissolve-in">
                <h1 className="page-title">Blog Posts in {year}-{month}-{day}</h1>
                <div className="breadcumb-link">
                    <Link href="/blog" className="breadcumb">Blog</Link>/
                    <Link href={`/blog/${year}`} className="breadcumb">{year}</Link>/
                    <Link href={`/blog/${year}/${month}`} className="breadcumb">{month}</Link>/
                    <Link href={`/blog/${year}/${month}/${day}`} className="breadcumb">{day}</Link>
                </div>

                {posts.length === 0 ? (
                    <p className="end-of-page">No blog posts found for {year}-{month}-{day}.</p>
                ) : (<><ul className="blog-post-list">
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
                    <p className='end-of-page'>You&#39;ve reached the end of the blog posts for {year}-{month}-{day}.</p>
                </>)}


            </main>
            <Footer />
        </>
    );
}
