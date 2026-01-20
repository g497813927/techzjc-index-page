"use client";
import './PhotoWall.css';
import { ImageSkeleton } from './ImageSkeleton';
import { AnimatePresence, domAnimation, LazyMotion, motion } from 'motion/react';
import { copyrightNotice, fetchedPhotos1, fetchedPhotos2, photo_schema } from '@/data/photos';


// eslint-disable-next-line
export function PhotoWall(props: { dict: any }) {
    const photo_1 = [...fetchedPhotos1, ...fetchedPhotos1];
    const photo_2 = [...fetchedPhotos2, ...fetchedPhotos2];

    return (
        <LazyMotion features={domAnimation}>
            <AnimatePresence>
                <motion.div
                    className="container photo-wall"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(photo_schema) }} />
                    <h1>{props.dict['photos']['title']}</h1>
                    <div className="photos">
                        {photo_1.map((photo, index) => (
                            <ImageSkeleton key={index} url={photo.url} alt={photo.alt + ' ' + copyrightNotice || photo.name} />
                        ))}
                    </div>
                    <br />
                    <div className="photos reverse">
                        {photo_2.map((url, index) => (
                            <ImageSkeleton key={index} url={url.url} alt={url.alt + ' ' + copyrightNotice || url.name} />
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
        </LazyMotion>
    )
}
