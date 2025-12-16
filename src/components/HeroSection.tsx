import './HeroSection.css';
import Image from 'next/image';
import { ScrollDownBtn } from './ScrollDownBtn';

//eslint-disable-next-line
export function HeroSection({ dict }: { dict: any }) {
    return (
        <section className="hero-section">
            <div className="background-image">
                <Image
                    src="/assets/image/hero-image.webp"
                    alt={
                        dict['hero-section']['alt']
                    }
                    fill
                    sizes="100vw"
                    loading="lazy"
                />
            </div>
            <div className="background-overlay"></div>
            <h1 id="hero-text">TECHZJC</h1>
            <ScrollDownBtn />
        </section>
    )
}
