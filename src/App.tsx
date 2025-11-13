import { HeroSection } from './components/HeroSection'
import { NavBar } from './components/NavBar'
import { Publications } from './components/Publications';
import { Footer } from './components/Footer'
import './App.css'
import { MoveToTop } from './components/MoveToTop'
import { About } from './components/About';

function App() {

  return (
    <>
      <NavBar />
      <HeroSection />
      <About />
      <Publications />
      <Footer />
      <MoveToTop />
    </>
  )
}

export default App
