"use client";
import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

// Client-side wrapper so the motion/react entrypoint is never pulled into
// the Server Component module graph of the root layout.
export function MotionProvider({ children }: { children: ReactNode }) {
    // Respect the user's prefers-reduced-motion setting for all motion components
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
