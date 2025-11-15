"use client";

export function ScrollDownBtn() {
    return (
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
    )
}
