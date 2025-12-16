"use client";
import { useEffect, useState } from "react";
import './MoveToTop.css';

//eslint-disable-next-line
export function MoveToTop({ dict }: { dict: any }) {
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
                <button type="button" onClick={scrollToTop} className="move-to-top-button" aria-label={dict['move-to-top-btn']['aria_label']}>
                    <span></span>
                    <span></span>
                </button>
            }
        </div>
    )
}
