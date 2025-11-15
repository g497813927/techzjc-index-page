import { HeroSection } from './components/HeroSection'
import { NavBar } from './components/NavBar'
import { Publications } from './components/Publications';
import { Footer } from './components/Footer'
import './App.css'
import { MoveToTop } from './components/MoveToTop'
import { About } from './components/About';
import { PhotoWall } from './components/PhotoWall';
import { Analytics } from "@vercel/analytics/react"

function App() {

  return (
    <>
      <NavBar />
      <HeroSection />
      <About />
      <PhotoWall />
      <Publications />
      <Footer />
      <MoveToTop />
      {process.env.VERCEL === 'true' && <Analytics />}
    </>
  )
}

export default App
