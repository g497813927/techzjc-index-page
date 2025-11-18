import { HeroSection } from '@/components/HeroSection'
import { NavBar } from '@/components/NavBar'
import { Publications } from '@/components/Publications';
import { Footer } from '@/components/Footer'
import { About } from '@/components/About';
import { PhotoWall } from '@/components/PhotoWall';

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
