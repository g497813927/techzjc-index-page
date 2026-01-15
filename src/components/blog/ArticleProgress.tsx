"use client";

import React, { useEffect, useRef } from "react";
import { motion, useSpring } from "motion/react";
import "./ArticleProgress.css";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export default function ArticleProgress({ content }: { content: React.ReactNode }) {
  const articleRef = useRef<HTMLDivElement | null>(null);

  const scaleX = useSpring(0, { stiffness: 200, damping: 30 });
  const opacity = useSpring(1, { stiffness: 250, damping: 35 });

  useEffect(() => {
    const getCssPxVar = (name: string, fallback: number) => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : fallback;
    };

    const update = () => {
      const el = articleRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();

      const navH = getCssPxVar("--nav-height", 0);
      const progH = getCssPxVar("--progress-height", 10);
      const visibleTop = navH + progH;

      const visibleBottom = window.innerHeight;

      const startBottom = visibleTop + rect.height;
      const endBottom = visibleBottom;

      const denom = startBottom - endBottom;
      let fill = 0;

      if (Math.abs(denom) < 1e-6) {
        fill = rect.bottom <= visibleBottom ? 1 : 0;
      } else {
        fill = ((startBottom - rect.bottom) / denom);
      }

      fill = clamp01(fill);

      const fadeBandPx = 40;
      const fadeStart = visibleTop + 8;
      const fadeEnd = visibleTop - (fadeBandPx - 8);

      const t = clamp01((fadeStart - rect.bottom) / (fadeStart - fadeEnd));
      const o = clamp01(1 - t);

      scaleX.set(fill);
      opacity.set(o);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [opacity, scaleX]);

  return (
    <>
      <motion.div
        id="scroll-indicator"
        className="scroll-indicator"
        style={{
          scaleX,
          opacity,
          position: "fixed",
          left: 0,
          right: 0,
          height: 10,
          originX: 0,
          zIndex: 10,
        }}
      />
      <div className="article-content-wrapper" ref={articleRef}>
        {content}
      </div>
    </>
  );
}
