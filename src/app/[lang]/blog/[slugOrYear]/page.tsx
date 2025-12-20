import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import "./page.css";
import { notFound, permanentRedirect } from 'next/navigation';
import { getPostBySlug, getPostByYear, PostMeta } from "@/lib/blog";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "../page.css";
import resolveParams from "@/lib/resolveParams";
import { getDictionary, hasLocale } from "../../dictionaries";
import { generateMetadataAlternatives } from "@/utils/generateMetadataAlternatives";


type RouteParams = {
    lang: string;
    slugOrYear: string
};

type Props = {
    params?: Promise<RouteParams>;
};

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { lang, slugOrYear } = await resolveParams(params);
    if (!hasLocale(lang)) notFound();
    const dict = await getDictionary(lang);
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
                title: dict['metadata']['blog']['slug_or_year']['title'].replace('{slugOrYear}', year_acutal),
                description: dict['metadata']['blog']['slug_or_year']['description'].replace('{slugOrYear}', year_acutal),
                keywords: [...dict['metadata']['blog']['slug_or_year']['keywords'], year_acutal],
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
                openGraph: {
                    title: dict['metadata']['blog']['slug_or_year']['title'].replace('{slugOrYear}', year_acutal),
                    description: dict['metadata']['blog']['slug_or_year']['description'].replace('{slugOrYear}', year_acutal),
                    url: `https://techzjc.com/${lang}/blog/${year_acutal}`,
                    siteName: dict['metadata']['blog']['index']['title'],
                    images: [
                        {
                            url: `/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(dict['metadata']['blog']['slug_or_year']['opengraph_image_subtitle'].replace('{slugOrYear}', year_acutal))}`,
                            alt: dict['metadata']['blog']['slug_or_year']['opengraph_image_alt'].replace('{slugOrYear}', year_acutal)
                        }
                    ],
                    locale: lang,
                    type: "website",
                },
                alternates: generateMetadataAlternatives("https://techzjc.com", lang, `/blog/${year_acutal}`),
            }
        } else {
            return notFound();
        }
        //eslint-disable-next-line
    } catch (error) {
        return {
            title: dict['metadata']['blog']['page-not-found']['title'],
            description: dict['metadata']['blog']['page-not-found']['description'],
        };
    }

    return {
        metadataBase: new URL('https://techzjc.com/'),
        title: dict['metadata']['blog']['post']['title'].replace('{title}', Post.title),
        description: Post.description || dict['metadata']['blog']['post']['default_description'].replace('{title}', Post.title),
        keywords: [...dict['metadata']['blog']['post']['keywords'], Post.title, ...(Post.tags || [])],
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
        alternates:
            generateMetadataAlternatives("https://techzjc.com", Post.lang, `/blog/${Post.year}/${Post.month}/${Post.day}/${encodeURIComponent(Post.slug)}`, true),
    };
}

export default async function PostPage({ params }: Props) {
    const { lang, slugOrYear } = await resolveParams(params);
    if (!hasLocale(lang)) notFound();
    const dict = await getDictionary(lang);
    let Post: PostMeta | null = null;
    if (/^\d{4}$/.test(slugOrYear)) {
        const posts = getPostByYear(slugOrYear, lang);
        return (
            <>
                <Image alt="WeChat Share Image" src={`/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(dict['metadata']['blog']['slug_or_year']['opengraph_image_subtitle'].replace('{slugOrYear}', slugOrYear))}&width=800&height=800`} width={800} height={800} className="hidden-wechat" />
                <NavBar hasHero={false} dict={dict} />
                <main className="page-body container column-content dissolve-in blog">
                    <h1 className="page-title">{dict['blog']['slug_or_year']['title'].replace('{slugOrYear}', slugOrYear)}</h1>
                    <div className="breadcumb-link">
                        <Link href="/blog" className="breadcumb">{dict['blog']['title']}</Link>/
                        <Link href={`/blog/${slugOrYear}`} className="breadcumb">{slugOrYear}</Link>
                    </div>

                    {posts.length === 0 ? (
                        <p className="end-of-page">{dict['blog']['slug_or_year']['no_articles'].replace('{slugOrYear}', slugOrYear)}</p>
                    ) : (<><ul className="blog-post-list">
                        {posts.map((post) => (
                            <li key={post.slug}>
                                <Link href={`/blog/${post.year}/${post.month}/${post.day}/${post.slug}`} className="blog-post-link">
                                    <h2>{post.title}</h2>
                                    <p className="blog-post-date">{post.time}</p>
                                    <p>{post.description || dict['blog']['no_decription']}</p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                        <p className='end-of-page'>{dict['blog']['end_of_articles_page']}</p>
                    </>)}
                </main>
                <Footer dict={dict} />
            </>
        );
    }
    try {
        Post = getPostBySlug(slugOrYear);
        //eslint-disable-next-line
    } catch (error) {
        return notFound();
    }
    const url_to_redirect = `/blog/${Post.year}/${Post.month}/${Post.day}/${encodeURIComponent(Post.slug)}`;
    permanentRedirect(url_to_redirect);
}
