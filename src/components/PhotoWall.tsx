"use client";
import { useCallback } from 'react';
import './PhotoWall.css';
import { ImageSkeleton } from './ImageSkeleton';
import { AnimatePresence, domAnimation, LazyMotion, motion } from 'motion/react';
import { copyrightNotice, fetchedPhotos1, fetchedPhotos2, photo_schema } from '@/data/photos';

// Matches the old CSS marquee: one copy of the photos (= half of the track)
// passes by in 20 seconds.
const MARQUEE_DURATION_SECONDS = 20;
// How long auto-scrolling stays paused after a wheel/keyboard interaction
const RESUME_DELAY_MS = 1500;
const KEYBOARD_SCROLL_STEP = 80;

// Drives the marquee by scrolling the container instead of animating a CSS
// transform. Auto-scrolling and manual scrolling therefore share the same
// coordinate system (scrollLeft), so they never fight each other and the
// track can never be moved into a position that leaves blank space.
// The track holds two identical copies of the photos, so jumping by exactly
// half of the scroll width is invisible and makes scrolling loop forever.
function usePhotoRowRef(direction: 1 | -1) {
    return useCallback((el: HTMLDivElement | null) => {
        if (!el) {
            return;
        }

        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        let half = el.scrollWidth / 2;
        let hovering = false;
        let focused = false;
        let touching = false;
        let interacting = false;
        let idleTimer = 0;
        let rafId = 0;
        let lastTs = 0;

        const canAutoScroll = () =>
            !reducedMotionQuery.matches && half > el.clientWidth;
        const isPaused = () => hovering || focused || touching || interacting;

        const setScrollWrapped = (x: number) => {
            if (half <= 0) {
                return;
            }
            let next = x % half;
            if (next < 0) {
                next += half;
            }
            el.scrollLeft = next;
        };

        const step = (ts: number) => {
            rafId = requestAnimationFrame(step);
            if (!lastTs) {
                lastTs = ts;
                return;
            }
            const dt = Math.min((ts - lastTs) / 1000, 0.05);
            lastTs = ts;
            if (!canAutoScroll() || isPaused()) {
                return;
            }
            const speed = half / MARQUEE_DURATION_SECONDS;
            setScrollWrapped(el.scrollLeft + direction * speed * dt);
        };

        const scheduleResume = () => {
            interacting = true;
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(() => {
                interacting = false;
            }, RESUME_DELAY_MS);
        };

        // Forward wrap for manual scrolling: once scrolled past the first
        // copy, jump back one copy (invisible because the copies are identical)
        const onScroll = () => {
            if (half > 0 && el.scrollLeft >= half) {
                el.scrollLeft -= half;
            }
        };

        // Backward wrap: native scrolling cannot go below 0, so intercept
        // leftward wheel scrolling at the edge and wrap around instead
        const onWheel = (event: WheelEvent) => {
            scheduleResume();
            const delta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
                ? event.deltaX
                : (event.shiftKey ? event.deltaY : 0);
            if (delta < 0 && el.scrollLeft <= 0 && half > el.clientWidth) {
                event.preventDefault();
                setScrollWrapped(half + delta);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            scheduleResume();
            if (event.key === 'ArrowLeft' && el.scrollLeft <= 0 && half > el.clientWidth) {
                event.preventDefault();
                setScrollWrapped(half - KEYBOARD_SCROLL_STEP);
            }
        };

        let lastTouchX: number | null = null;
        const onTouchStart = () => {
            touching = true;
            lastTouchX = null;
        };
        const onTouchMove = (event: TouchEvent) => {
            if (event.touches.length !== 1) {
                return;
            }
            const x = event.touches[0].clientX;
            if (lastTouchX !== null) {
                const dx = x - lastTouchX;
                // Swiping right while at the left edge -> wrap to the duplicated copy
                if (dx > 0 && el.scrollLeft <= 0 && half > el.clientWidth) {
                    event.preventDefault();
                    setScrollWrapped(half - dx);
                }
            }
            lastTouchX = x;
        };
        const onTouchEnd = () => {
            touching = false;
            lastTouchX = null;
        };

        const onMouseEnter = () => { hovering = true; };
        const onMouseLeave = () => { hovering = false; };
        const onFocusIn = () => { focused = true; };
        const onFocusOut = () => { focused = false; };
        const onResize = () => { half = el.scrollWidth / 2; };

        window.addEventListener('resize', onResize);
        el.addEventListener('scroll', onScroll, { passive: true });
        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('keydown', onKeyDown);
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd);
        el.addEventListener('touchcancel', onTouchEnd);
        el.addEventListener('mouseenter', onMouseEnter);
        el.addEventListener('mouseleave', onMouseLeave);
        el.addEventListener('focusin', onFocusIn);
        el.addEventListener('focusout', onFocusOut);

        rafId = requestAnimationFrame(step);

        return () => {
            cancelAnimationFrame(rafId);
            window.clearTimeout(idleTimer);
            window.removeEventListener('resize', onResize);
            el.removeEventListener('scroll', onScroll);
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('keydown', onKeyDown);
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
            el.removeEventListener('mouseenter', onMouseEnter);
            el.removeEventListener('mouseleave', onMouseLeave);
            el.removeEventListener('focusin', onFocusIn);
            el.removeEventListener('focusout', onFocusOut);
        };
    }, [direction]);
}


// eslint-disable-next-line
export function PhotoWall(props: { dict: any }) {
    const photo_1 = [...fetchedPhotos1, ...fetchedPhotos1];
    const photo_2 = [...fetchedPhotos2, ...fetchedPhotos2];
    const forwardRowRef = usePhotoRowRef(1);
    const reverseRowRef = usePhotoRowRef(-1);

    return (
        <LazyMotion features={domAnimation}>
            <AnimatePresence>
                <motion.div
                    className="container photo-wall"
                    data-motion-no-js="visible"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(photo_schema) }} />
                    <h1>{props.dict['photos']['title']}</h1>
                    <div
                        className="photos"
                        ref={forwardRowRef}
                        tabIndex={0}
                        aria-label={props.dict['photos']['title']}
                    >
                        <div className="photos-track">
                            {photo_1.map((photo, index) => (
                                <ImageSkeleton key={index} url={photo.url} alt={photo.alt + ' ' + copyrightNotice || photo.name} />
                            ))}
                        </div>
                    </div>
                    <br />
                    <div
                        className="photos reverse"
                        ref={reverseRowRef}
                        tabIndex={0}
                        aria-label={props.dict['photos']['title']}
                    >
                        <div className="photos-track">
                            {photo_2.map((url, index) => (
                                <ImageSkeleton key={index} url={url.url} alt={url.alt + ' ' + copyrightNotice || url.name} />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </LazyMotion>
    )
}
