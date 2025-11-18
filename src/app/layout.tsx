import "./globals.css";
import { ReactNode } from "react";
import { DebugBootstrap } from "@/components/DebugBootstrap";
import { MoveToTop } from "@/components/MoveToTop";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
