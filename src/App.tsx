import { HeroSection } from './components/HeroSection'
import { NavBar } from './components/NavBar'
import { Publications } from './components/Publications';
import { Footer } from './components/Footer'
import './App.css'
import { MoveToTop } from './components/MoveToTop'
import { About } from './components/About';
import { PhotoWall } from './components/PhotoWall';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  if (__VERCEL_ENV__ === 'true') {
    console.log(`%c VERCEL ENVIRONMENT DETECTED %c`, 
      "background: #000000; color: #FFFFFF; padding: 4px 8px; border-radius: 4px 0 0 4px;",
      "background: transparent;"
    );
  }

  return (
    <>
      <NavBar />
      <HeroSection />
      <About />
      <PhotoWall />
      <Publications />
      <Footer />
      <MoveToTop />
      {__VERCEL_ENV__ === 'true' && <>
        <SpeedInsights />
        <Analytics />
      </>}
    </>
  )
}

export default App
