"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    typeof window !== "undefined"
      ? (localStorage.getItem("theme") as Theme) || "system"
      : "system"
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    const apply = (t: Theme) => {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const useDark = t === "dark" || (t === "system" && systemPrefersDark);
      root.classList.toggle("dark", useDark);
      root.setAttribute("data-theme", useDark ? "dark" : "light");
    };

    apply(theme);

    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const handler = (e: MediaQueryListEvent) => {
        apply("system");
      };
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (t === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", t);
    }
  };

  return { theme, setTheme };
}
