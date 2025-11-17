"use client";
import { useState, useEffect } from "react";
import './NavBar.css';
export function NavBar({ hasHero }: { hasHero?: boolean }) {
    // Check if the user scolled below the hero section, if so, the show the navbar with a background
    const [scrolled, setScrolled] = useState(
        !hasHero ? true : typeof window === "undefined" ? false : window.scrollY > window.innerHeight / 2
    );

    useEffect(() => {
        if (hasHero) {
            const handleScroll = () => {
                const heroHeight = window.innerHeight;
                if (window.scrollY > heroHeight / 2) {
                    setScrolled(true);
                } else {
                    setScrolled(false);
                }
            };

            window.addEventListener("scroll", handleScroll);
            return () => window.removeEventListener("scroll", handleScroll);
        }
    }, [hasHero]);

    return (
        <nav className={scrolled ? "navbar scrolled" : "navbar"}>
            <div className="nav-content">
                <h1 className="logo">TECHZJC</h1>
            </div>
        </nav>
    )
}
