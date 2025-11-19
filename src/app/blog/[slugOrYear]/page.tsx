import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import "./page.css";
import { notFound, permanentRedirect } from 'next/navigation';
import { getPostBySlug, getPostByYear, PostMeta } from "@/lib/blog";
import { Metadata } from "next";
import Link from "next/link";
import "../page.css";


type Props = {
    params: { slugOrYear: string };
};

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { slugOrYear } = await params;
    // Check if slugOrYear is decimal (year) or string (slug)
    let slug = null;
    let year_acutal = null;
    if (/^\d{4}$/.test(slugOrYear)) {
        year_acutal = slugOrYear;
    } else {
        slug = slugOrYear;
    }

    let Post = null;
    try {
        if (!year_acutal && slug) {
            Post = getPostBySlug(slug);
        } else if (year_acutal) {
            return {
                title: `${year_acutal} - Techzjc`,
                description: `Blog posts in the year ${year_acutal} on Techzjc.`,
                keywords: ["techzjc", "科技ZJC网", "ZJC科技网", "Techzjc", "ZJC", "赵佳成", "g497813927", "Jiacheng Zhao", "John Zhao", "blog", "techzjc blog", year_acutal],
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
                    canonical: `https://techzjc.com/blog/${year_acutal}`,
                },
            }
        } else {
            return notFound();
        }
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
            canonical: `https://techzjc.com/blog/${Post.year}/${Post.month}/${Post.day}/${encodeURIComponent(Post.title)}`,
        },
    };
}

export default async function PostPage({ params }: Props) {
    const { slugOrYear } = await params;
    let Post: PostMeta | null = null;
    if (/^\d{4}$/.test(slugOrYear)) {
        const posts = getPostByYear(slugOrYear);
        return (
            <>
                <NavBar hasHero={false} />
                <main className="page-body container column-content dissolve-in">
                    <h1 className="page-title">Blog Posts in {slugOrYear}</h1>
                    <div className="breadcumb-link">
                        <Link href="/blog" className="breadcumb">Blog</Link>/
                        <Link href={`/blog/${slugOrYear}`} className="breadcumb">{slugOrYear}</Link>
                    </div>

                    {posts.length === 0 ? (
                        <p className="end-of-page">No blog posts found for the year {slugOrYear}.</p>
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
                    <p className='end-of-page'>You&#39;ve reached the end of the blog posts for {slugOrYear}.</p>
                    </>)}

                    
                </main>
                <Footer />
            </>
        );
    }
    try {
        Post = getPostBySlug(slugOrYear);
    } catch (error) {
        console.error("Error fetching post:", error);
        return notFound();
    }
    const url_to_redirect = `/blog/${Post.year}/${Post.month}/${Post.day}/${encodeURIComponent(Post.slug)}`;
    permanentRedirect(url_to_redirect);
}
