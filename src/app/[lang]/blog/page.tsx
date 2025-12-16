import './page.css';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import { Metadata } from 'next';
import { getDictionary, hasLocale } from '../dictionaries';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { generateMetadataAlternatives } from '@/utils/generateMetadataAlternatives';

export async function generateMetadata({ params }: PageProps<'/[lang]/blog'>): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return {
    metadataBase: new URL('https://techzjc.com/'),
    title: dict['metadata']['blog']['index']['title'],
    keywords: dict['metadata']['blog']['index']['keywords'],
    description: dict['metadata']['blog']['index']['description'],
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
      title: dict['metadata']['blog']['index']['title'],
      description: dict['metadata']['index']['description'],
      url: `https://techzjc.com/${lang}/blog`,
      siteName: dict['metadata']['blog']['index']['title'],
      images: [
        {
          url: `/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(dict['metadata']['blog']['index']['opengraph_image_subtitle'])}`,
          alt: dict['metadata']['blog']['index']['opengraph_image_alt']
        }
      ],
      locale: lang,
      type: "website",
    },
    alternates: generateMetadataAlternatives("https://techzjc.com", lang, "/blog"),
  }
}

  export default async function BlogPage({ params }: PageProps<'/[lang]/blog'>) {
    const posts = getAllPosts();
    const { lang } = await params;
    if (!hasLocale(lang)) notFound();
    const dict = await getDictionary(lang);
    return (
      <>
        <Image alt="WeChat Share Image" src={`/opengraph-image?title=Techzjc&subtitle=${encodeURIComponent(dict['metadata']['blog']['index']['opengraph_image_subtitle'])}&width=800&height=800`} width={800} height={800} className="hidden-wechat" />
        <NavBar hasHero={false} dict={dict} />
        <main className="page-body container column-content dissolve-in blog">
          <h1 className="page-title">{dict['blog']['title']}</h1>
          <ul className="blog-post-list">
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
        </main>
        <Footer dict={dict} />
      </>
    );
  }
