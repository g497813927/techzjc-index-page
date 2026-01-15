'use client';

import { useLayoutEffect } from 'react';

export function UseNavHeightVar() {
  useLayoutEffect(() => {
    const nav = document.getElementById('navbar');
    if (!nav) return;

    const apply = () => {
      const h = nav.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--nav-height', `${h}px`);
    };

    // handle dynamic height changes (responsive, wrapping, etc.)
    const ro = new ResizeObserver(apply);
    ro.observe(nav);

    apply(); // initial
    window.addEventListener('resize', apply);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);

  return null;
}
