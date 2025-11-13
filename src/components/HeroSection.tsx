import './HeroSection.css';

export function HeroSection() {
    return (
        <section className="hero-section">
            <div className="background-overlay"></div>
            <h1>TECHZJC</h1>
            <button type="button" className="move-down-indicator" onClick={() => {
                window.scrollBy({
                    top: window.innerHeight,
                    left: 0,
                    behavior: 'smooth'
                });
            }}>scroll down
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

