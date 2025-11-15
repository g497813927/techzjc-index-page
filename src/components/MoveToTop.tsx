"use client";
import { useEffect, useState } from "react";
import './MoveToTop.css';

export function MoveToTop() {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
        if (window.pageYOffset > window.innerHeight / 2) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        };
    }, []);

    return (
        <div className="move-to-top">
            {isVisible && 
                <button type="button" onClick={scrollToTop} className="move-to-top-button" aria-label="Move to top">
                    <span></span>
                    <span></span>
                </button>
            }
        </div>
    )
}
