'use client';

import { useLayoutEffect } from 'react';

export function UseNavHeightVar() {
  useLayoutEffect(() => {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    let rafId = 0;
    let lastHeight = -1;

    const apply = () => {
      const height = Math.round(nav.getBoundingClientRect().height);
      if (height === lastHeight) return;
      lastHeight = height;
      document.documentElement.style.setProperty('--nav-height', `${height}px`);
    };

    const scheduleApply = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        apply();
      });
    };

    // handle dynamic height changes (responsive, wrapping, etc.)
    const ro = new ResizeObserver(scheduleApply);
    ro.observe(nav);

    scheduleApply();
    window.addEventListener('resize', scheduleApply);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      ro.disconnect();
      window.removeEventListener('resize', scheduleApply);
    };
  }, []);

  return null;
}
