import './HeroSection.css';
import Image from 'next/image';
import { ScrollDownBtn } from './ScrollDownBtn';

export function HeroSection() {
    return (
        <section className="hero-section">
            <div className="background-image">
                <Image
                    src="/assets/image/hero-image.webp"
                    alt={
                        `Hero image for Techzjc website. Star Trail over Tian Huang Ping, Anji, Zhejiang, China. Taken with Nikon Z8 on August 16, 2025 and stacked & processed using Adobe Photoshop & Adobe Lightroom. © ${new Date().getFullYear()} Techzjc (Jiacheng Zhao). All rights reserved.`
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
