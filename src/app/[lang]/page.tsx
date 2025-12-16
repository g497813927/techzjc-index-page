import { HeroSection } from '@/components/HeroSection'
import { NavBar } from '@/components/NavBar'
import { Publications } from '@/components/Publications';
import { Footer } from '@/components/Footer'
import { About } from '@/components/About';
import { copyrightNotice, fetchedPhotos1, fetchedPhotos2, PhotoWall } from '@/components/PhotoWall';
import Image from 'next/image';
import { Metadata } from 'next';
import { getDictionary, hasLocale } from './dictionaries';
import { notFound } from 'next/navigation';
import { generateMetadataAlternatives } from '@/utils/generateMetadataAlternatives';

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
    const { lang } = await params;
    if (!hasLocale(lang)) notFound();
    const dict = await getDictionary(lang);
    return {
        metadataBase: new URL('https://techzjc.com/'),
        title: dict['metadata']['index']['title'],
        keywords: dict['metadata']['index']['keywords'],
        description: dict['metadata']['index']['description'],
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
            title: dict['metadata']['index']['title'],
            description: dict['metadata']['index']['description'],
            url: `https://techzjc.com/${lang}`,
            siteName: dict['metadata']['index']['title'],
            images: [
                {
                    url: "/opengraph-image?title=Techzjc",
                    alt: dict['metadata']['index']['opengraph_image_alt']
                },
                ...fetchedPhotos1.map(photo => ({
                    url: "https://techzjc.com" + photo.url,
                    alt: photo.alt + ' ' + copyrightNotice || photo.name
                })),
                ...fetchedPhotos2.map(photo => ({
                    url: "https://techzjc.com" + photo.url,
                    alt: photo.alt + ' ' + copyrightNotice || photo.name
                }))
            ],
            locale: lang,
            type: "website",
        },
        alternates: generateMetadataAlternatives("https://techzjc.com", lang, "/"),
        verification: {
            google: 'zYWiqqOStJLM35MbqWJdyRL6Ch4XEuf8lncXB-rPFZ0'
        },
        other: {
            'baidu-site-verification': 'codeva-M9OxrFq2pz'
        }
    }
}

async function App({ params }: PageProps<'/[lang]'>) {
    const { lang } = await params;
    if (!hasLocale(lang)) notFound();
    const dict = await getDictionary(lang);
    return (
        <>
            <Image alt="WeChat Share Image" src="/opengraph-image?title=Techzjc&width=800&height=800" width={800} height={800} className="hidden-wechat" />
            <NavBar hasHero={true} dict={dict} />
            <HeroSection dict={dict} />
            <About dict={dict} />
            <PhotoWall dict={dict} />
            <Publications dict={dict} />
            <Footer dict={dict} />
        </>
    )
}

export default App
