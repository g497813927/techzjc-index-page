"use client";

import { useState } from "react";
import './ImageSkeleton.css';
import Image from "next/image";
import { AnimatePresence, domAnimation, LazyMotion, motion } from "motion/react";

export function ImageSkeleton({ url, alt }: { url: string; alt: string }) {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <LazyMotion features={domAnimation}>
            <AnimatePresence>
                <div className="photo-card">
                    <motion.div
                        className={`skeleton ${isLoaded ? 'hidden' : 'show'}`}
                        animate={{
                            scale: [1, 2, 2, 1, 1],
                            rotate: [0, 0, 180, 180, 0],
                            borderRadius: ["20%", "20%", "50%", "50%", "20%"],
                        }}
                        transition={{
                            duration: 2,
                            ease: "easeInOut",
                            times: [0, 0.2, 0.5, 0.8, 1],
                            repeat: Infinity,
                            repeatDelay: 1,
                        }}
                    ></motion.div>
                    <noscript>
                        <Image src={url} alt={alt} width={374} height={250} className="show move-in" />
                    </noscript>
                    <Image
                        src={url}
                        loading="lazy"
                        alt={`${alt}`}
                        onLoad={() => setIsLoaded(true)}
                        width={374}
                        height={250}
                        className={isLoaded ? 'show move-in' : 'hidden'}
                        onError={(e) => {
                            console.log(`Failed to load image: ${url}`);
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            </AnimatePresence>
        </LazyMotion>
    )
}
