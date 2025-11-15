import { HeroSection } from '@/components/HeroSection'
import { NavBar } from '@/components/NavBar'
import { Publications } from '@/components/Publications';
import { Footer } from '@/components/Footer'
import { MoveToTop } from '@/components/MoveToTop'
import { About } from '@/components/About';
import { PhotoWall } from '@/components/PhotoWall';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Helmet } from "react-helmet";

function App() {

  return (
    <>
      <Helmet>
        <link rel="canonical" href={`https://techzjc.com${window.location.pathname}`} />
      </Helmet>
      <NavBar />
      <HeroSection />
      <About />
      <PhotoWall />
      <Publications />
      <Footer />
      <MoveToTop />
      {process.env.VERCEL_ENV === 'true' && <>
        <SpeedInsights />
        <Analytics />
      </>}
    </>
  )
}

export default App
