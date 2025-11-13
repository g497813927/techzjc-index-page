import { HeroSection } from './components/HeroSection'
import { NavBar } from './components/NavBar'
import { Publications } from './components/Publications';
import { Footer } from './components/Footer'
import './App.css'
import { MoveToTop } from './components/MoveToTop'

function App() {

  return (
    <>
      <NavBar />
      <HeroSection />
      <Publications />
      <Footer />
      <MoveToTop />
    </>
  )
}

export default App
