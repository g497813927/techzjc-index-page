"use client";
import { useEffect } from "react";
import './NavBar.css';
import Link from "next/link";
export function NavBar({ hasHero }: { hasHero?: boolean }) {

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (hasHero) {
            const heroHeight = window.innerHeight;
            if (window.scrollY > heroHeight / 2) {
                document.getElementById("navbar")?.classList.add("scrolled");
            }
            const handleScroll = () => {
                const heroHeight = window.innerHeight;
                if (window.scrollY > heroHeight / 2) {
                    document.getElementById("navbar")?.classList.add("scrolled");
                } else {
                    document.getElementById("navbar")?.classList.remove("scrolled");
                }
            };

            window.addEventListener("scroll", handleScroll);
            return () => window.removeEventListener("scroll", handleScroll);
        }
    }, [hasHero]);

    return (
        <nav className="navbar" id="navbar">
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
