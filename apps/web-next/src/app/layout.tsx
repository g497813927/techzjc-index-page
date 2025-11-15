// apps/web-next/app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";
import { DebugBootstrap } from "@/components/DebugBootstrap";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DebugBootstrap />
        {children}
      </body>
    </html>
  );
}
