import "./globals.css";
import { ReactNode } from "react";
import { DebugBootstrap } from "@/components/DebugBootstrap";
import { MoveToTop } from "@/components/MoveToTop";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: ReactNode }) {
  const themeScript = `
  (function() {
    try {
      var storedTheme = window.localStorage.getItem('theme');
      var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var useDark = storedTheme === 'dark' || (!storedTheme && systemPrefersDark);
      if (useDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  })();
  `;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body>
        {process.env.VERCEL_ENV === 'true' && <>
          <SpeedInsights />
          <Analytics />
        </>}
        <DebugBootstrap />
        <MoveToTop />
        {children}
      </body>
    </html>
  );
}
