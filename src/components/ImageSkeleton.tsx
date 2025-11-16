"use client";

import { useState } from "react";
import './ImageSkeleton.css';
import Image from "next/image";

export function ImageSkeleton({ url, alt }: { url: string; alt: string }) {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div className="photo-card">
            <div className={`skeleton ${isLoaded ? 'hidden' : 'show'}`}>
                <div className="concave"></div>
                <div className="convex"></div>
            </div>
            <Image
                src={url}
                loading="lazy"
                alt={`${alt}`}
                onLoad={() => setIsLoaded(true)}
                width={374}
                className={isLoaded ? 'show move-in' : 'hidden'}
                onError={(e) => {
                    console.log(`Failed to load image: ${url}`);
                    e.currentTarget.style.display = 'none';
                }}
            />
        </div>
    )
}
