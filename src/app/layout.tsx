import "./globals.css";
import { ReactNode } from "react";
import { DebugBootstrap } from "@/components/DebugBootstrap";
import { Metadata } from "next";
import { MoveToTop } from "@/components/MoveToTop";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: "Techzjc",
  keywords: ["techzjc", "科技ZJC网", "ZJC科技网", "Techzjc", "ZJC", "赵佳成", "g497813927", "Jiacheng Zhao", "John Zhao"],
  description: "Techzjc是一个持续拥有创新热情的网站，由赵佳成建立。",
  icons: {
    icon: "https://static.techzjc.com/icon/favicon_index_page.ico",
    apple: [
      {
        url: "https://static.techzjc.com/icon/bookmark_icon_index_page.png",
        sizes: "180x180",
        type: "image/png"
      }
    ],
    shortcut: "https://static.techzjc.com/icon/favicon_index_page.ico"
  },
  alternates: {
    canonical: "https://techzjc.com/"
  },
}
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
