import './HeroSection.css';
import Image from 'next/image';
import { ScrollDownBtn } from './ScrollDownBtn';

export function HeroSection() {
    return (
        <section className="hero-section">
            <div className="background-image">
                <Image src="/assets/image/hero-image.webp" alt="Hero Background" fill sizes="100vw" loading="lazy" />
            </div>
            <div className="background-overlay"></div>
            <h1 id="hero-text">TECHZJC</h1>
            <ScrollDownBtn />
        </section>
    )
}
