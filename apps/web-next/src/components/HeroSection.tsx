import './HeroSection.css';
import Image from 'next/image';

export function HeroSection() {
    return (
        <section className="hero-section">
            <div className="background-image">
                <Image src="/assets/image/hero-image.webp" alt="Hero Background" loading="lazy" />
            </div>
            <div className="background-overlay"></div>
            <h1 id="hero-text">TECHZJC</h1>
            <button type="button" className="move-down-indicator" onClick={() => {
                window.scrollBy({
                    top: window.innerHeight,
                    left: 0,
                    behavior: 'smooth'
                });
            }} aria-label="Scroll down">
                <div className="arrow">
                    <span></span>
                    <span></span>
                </div>
                <div className="arrow">
                    <span></span>
                    <span></span>
                </div>
            </button>
        </section>
    )
}
