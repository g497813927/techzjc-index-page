"use client";
import { useState, useEffect } from "react";
import './NavBar.css';
import Link from "next/link";
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
                <Link href={"/"} className="home-link">
                    <h1 className="logo">TECHZJC</h1>
                </Link>
                <div className="nav-links">
                    <Link href={"/blog"} className="nav-link">Blog</Link>
                </div>
            </div>
        </nav>
    )
}
