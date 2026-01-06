import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { getPostByYearMonthAndDay } from "@/lib/blog";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "@/app/[lang]/blog/[slugOrYear]/page.css";
import "@/app/[lang]/blog/page.css";
import resolveParams from "@/lib/resolveParams";
import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { notFound } from "next/navigation";
import { generateMetadataAlternatives } from "@/utils/generateMetadataAlternatives";

//eslint-disable-next-line
type RouteParams = { lang: any; slugOrYear: string; month: string; day: string };

type Props = {
    params?: Promise<RouteParams>;
};

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { lang, slugOrYear: year, month, day } = await resolveParams(params);
    if (!hasLocale(lang)) notFound();
    const dict = await getDictionary(lang);

    try {
        return {
            metadataBase: new URL('https://techzjc.com/'),
            title: dict['metadata']['blog']['day']['title'].replace('{year}', year).replace('{month}', month).replace('{day}', day),
            description: dict['metadata']['blog']['day']['description'].replace('{year}', year).replace('{month}', month).replace('{day}', day),
            keywords: [...dict['metadata']['blog']['day']['keywords'], `${year}-${month}-${day}`, `${month}/${day}/${year}`],
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
                title: dict['metadata']['blog']['day']['title'].replace('{year}', year).replace('{month}', month).replace('{day}', day),
                description: dict['metadata']['blog']['day']['description'].replace('{year}', year).replace('{month}', month).replace('{day}', day),
                url: `https://techzjc.com/blog/${year}/${month}/${day}`,
                siteName: dict['metadata']['blog']['index']['title'],
                images: [
                    {
                        url: `/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(dict['metadata']['blog']['day']['opengraph_image_subtitle'].replace('{year}', year).replace('{month}', month).replace('{day}', day))}`,
                        alt: dict['metadata']['blog']['day']['opengraph_image_alt'].replace('{year}', year).replace('{month}', month).replace('{day}', day)
                    }
                ],
                locale: lang,
                type: "website",
            },
            alternates: generateMetadataAlternatives("https://techzjc.com", lang, `/blog/${year}/${month}/${day}`),
        }
    //eslint-disable-next-line
    } catch (error) {
        return {
            title: dict['metadata']['blog']['page-not-found']['title'],
            description: dict['metadata']['blog']['page-not-found']['description'],
        };
    }
}

export default async function PostPage({ params }: Props) {
    const { lang, slugOrYear: year, month, day } = await resolveParams(params);
    if (!hasLocale(lang)) notFound();
    const dict = await getDictionary(lang as typeof lang);
    const posts = getPostByYearMonthAndDay(year, month, day, lang);
    return (
        <>
            <Image alt="WeChat Share Image" src={`/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(`Blog Posts in ${year}-${month}-${day}`)}&width=800&height=800`} width={800} height={800} className="hidden-wechat" />
            <NavBar hasHero={false} dict={dict} />
            <main className="page-body container column-content dissolve-in blog">
                <h1 className="page-title">{dict['blog']['day']['title'].replace('{year}', year).replace('{month}', month).replace('{day}', day)}</h1>
                <div className="breadcumb-link">
                    <Link href="/blog" className="breadcumb">{dict['blog']['title']}</Link>/
                    <Link href={`/blog/${year}`} className="breadcumb">{year}</Link>/
                    <Link href={`/blog/${year}/${month}`} className="breadcumb">{month}</Link>/
                    <Link href={`/blog/${year}/${month}/${day}`} className="breadcumb">{day}</Link>
                </div>

                {posts.length === 0 ? (
                    <p className="end-of-page">{dict['blog']['day']['no_articles'].replace('{year}', year).replace('{month}', month).replace('{day}', day)}</p>
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
