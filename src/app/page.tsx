import { HeroSection } from '@/components/HeroSection'
import { NavBar } from '@/components/NavBar'
import { Publications } from '@/components/Publications';
import { Footer } from '@/components/Footer'
import { About } from '@/components/About';
import { copyrightNotice, fetchedPhotos1, fetchedPhotos2, PhotoWall } from '@/components/PhotoWall';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Techzjc",
  keywords: ["techzjc", "科技ZJC网", "ZJC科技网", "Techzjc", "ZJC", "赵佳成", "g497813927", "Jiacheng Zhao", "John Zhao"],
  description: "Techzjc是一个持续拥有创新热情的网站，由赵佳成建立。",
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
    canonical: `https://techzjc.com/`,
  },
  openGraph: {
    title: "Techzjc",
    description: "Techzjc是一个持续拥有创新热情的网站，由赵佳成建立。",
    url: "https://techzjc.com/",
    siteName: "Techzjc",
    images: [
      {
        url: "https://techzjc.com/assets/image/hero-image.webp",
        alt: "Hero Image for Techzjc Website"
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
    locale: "en-US",
    type: "website",
  },
  other: {
    'baidu-site-verification': 'codeva-M9OxrFq2pz'
  }
}

function App() {
  return (
    <>
      <NavBar hasHero={true} />
      <HeroSection />
      <About />
      <PhotoWall />
      <Publications />
      <Footer />
    </>
  )
}

export default App
