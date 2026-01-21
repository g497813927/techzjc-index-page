"use client";

import { AnimatePresence, domAnimation, LazyMotion, motion } from "motion/react";


export function ScrollDownBtn() {
    return (
        <LazyMotion features={domAnimation}>
            <AnimatePresence>
                <motion.button
                    type="button"
                    className="move-down-indicator"
                    onClick={() => {
                        window.scrollBy({
                            top: window.innerHeight,
                            behavior: 'smooth'
                        });
                    }} aria-label="Scroll down"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="arrow">
                        <span></span>
                        <span></span>
                    </div>
                    <div className="arrow">
                        <span></span>
                        <span></span>
                    </div>
                </motion.button>
            </AnimatePresence>
        </LazyMotion>
    )
}
