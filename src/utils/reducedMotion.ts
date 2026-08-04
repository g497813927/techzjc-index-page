"use client";

/**
 * Returns true when the user has requested reduced motion
 * via the `prefers-reduced-motion` media query.
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns the appropriate scroll behavior based on the user's
 * reduced motion preference. JS-initiated smooth scrolling
 * (`behavior: 'smooth'`) is not affected by CSS media queries,
 * so it must be resolved manually.
 */
export function scrollBehavior(): ScrollBehavior {
    return prefersReducedMotion() ? 'auto' : 'smooth';
}
