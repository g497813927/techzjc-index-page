"use client";
import { useEffect } from "react";
import './NavBar.css';
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

//eslint-disable-next-line
export function NavBar({ hasHero, dict }: { hasHero?: boolean; dict: any }) {
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
        } else {
            document.getElementById("navbar")?.classList.add("scrolled");
        }
    }, [hasHero]);

    return (
        <nav className="navbar" id="navbar">
            <div className="nav-content">
                <Link href={"/"} className="home-link">
                    <h1 className="logo">TECHZJC</h1>
                </Link>
                <div className="nav-links">
                    <Link href={"/blog"} className="nav-link">{dict['navbar']['blog']}</Link>
                    <ThemeToggle dict={dict} />
                </div>
            </div>
        </nav>
    )
}
