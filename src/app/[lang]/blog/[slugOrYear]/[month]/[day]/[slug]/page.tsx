import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import "./page.css";
import { notFound } from 'next/navigation';
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { Metadata } from "next";
import "./style-theme.css";
import Link from "next/link";
import Image from "next/image";
import resolveParams from "@/lib/resolveParams";
import CommentSection from "@/components/blog/CommentSection";
import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { generateMetadataAlternatives } from "@/utils/generateMetadataAlternatives";
import { getMdxCompiled } from "@/lib/mdx";
import ArticleProgress from "@/components/blog/ArticleProgress";
import { UseNavHeightVar } from "@/components/UseNavBarVar";

export const dynamic = 'force-static'

type RouteParams = {
    //eslint-disable-next-line
    lang: any;
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
        lang,
        slugOrYear: year,
        month,
        day,
        slug
    } = await resolveParams(params);
    if (!hasLocale(lang)) notFound();
    const dict = await getDictionary(lang);
    let Post = null;
    try {
        Post = getPostBySlug(slug, year, month, day);
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
        keywords: [
            ...dict['metadata']['blog']['post']['keywords'],
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
        alternates: generateMetadataAlternatives("https://techzjc.com", Post.lang, `/blog/${year}/${month}/${day}/${encodeURIComponent(slug)}`, true),
        openGraph: {
            title: dict['metadata']['blog']['post']['title'].replace('{title}', Post.title),
            description: Post.description || dict['metadata']['blog']['post']['default_description'].replace('{title}', Post.title),
            url: `https://techzjc.com/${lang}/blog/${year}/${month}/${day}/${slug}`,
            siteName: dict['metadata']['blog']['index']['title'],
            images: [
                {
                    url: `/opengraph-image?title=${encodeURIComponent(Post.title.length > 40 ? Post.title.slice(0, 37) + '...' : Post.title)}&subtitle=${encodeURIComponent(dict['metadata']['blog']['index']['title'])}`,
                    alt: dict['metadata']['blog']['post']['opengraph_image_alt'].replace('{title}', Post.title)
                }
            ],
            locale: lang,
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
        lang,
        slugOrYear: year,
        month,
        day,
        slug
    } = await resolveParams(params);
    const dict = await getDictionary(lang as typeof lang);
    let Post = null;
    try {
        Post = getPostBySlug(slug, year, month, day);
        //eslint-disable-next-line
    } catch (error) {
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
                "@id": `https://techzjc.com/${lang}/#about`,
                name: dict['metadata']['blog']['author'],
                alternateName: [
                    { "@value": "Jiacheng Zhao", "@language": "en-US" },
                    { "@value": "John Zhao", "@language": "en-US" },
                    { "@value": "Techzjc", "@language": "en-US" },
                    { "@value": "赵佳成", "@language": "zh-CN" },
                    { "@value": "Techzjc", "@language": "zh-CN" }
                ],
                email: "mailto:admin@techzjc.com",
                url: "https://techzjc.com/",
            }
        ]
    };
    const { content } = await getMdxCompiled(Post.content);
    return (
        <>
            <Image alt="WeChat Share Image" src={`/opengraph-image?title=${encodeURIComponent(Post.title.length > 40 ? Post.title.slice(0, 37) + '...' : Post.title)}&subtitle=${encodeURIComponent(`by Techzjc`)}&width=800&height=800`} width={800} height={800} className="hidden-wechat" />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }} />
            <UseNavHeightVar />
            <NavBar hasHero={false} dict={dict} />
            <article className="page-body article-content column-content container markdown-body dissolve-in" role="main">
                <ArticleProgress content={
                    <>
                        <div className="breadcumb-link">
                            <Link href="/blog" className="breadcumb">{dict['blog']['title']}</Link>/
                            <Link href={`/blog/${year}`} className="breadcumb">{year}</Link>/
                            <Link href={`/blog/${year}/${month}`} className="breadcumb">{month}</Link>/
                            <Link href={`/blog/${year}/${month}/${day}`} className="breadcumb">{day}</Link>/
                            <Link href={`/blog/${year}/${month}/${day}/${slug}`} className="breadcumb">{Post.title}</Link>
                        </div>
                        <h1 className="article-title">{Post.title}</h1>
                        <p className="article-date">{Post.time}</p>
                        {
                            lang !== Post.lang &&
                            <div className="markdown-alert markdown-alert-warning">
                                <p className="markdown-alert-title">
                                    <svg aria-label="warning icon" className="octicon octicon-alert mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>
                                    {dict['blog']['post']['lang_mismatch_warning']['title']}
                                </p>
                                <p>{dict['blog']['post']['lang_mismatch_warning']['content']}</p>
                            </div>
                        }
                        {content}
                    </>
                } />
                {
                    process.env.NEXT_PUBLIC_ENABLE_COMMENTS === 'true' &&
                    <CommentSection />
                }
            </article>
            <Footer dict={dict} />
        </>
    );
}
