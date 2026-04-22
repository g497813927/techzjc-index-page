"use client";

import NextError from "next/error";
import { useEffect } from "react";

const isGlobalBuild = process.env.NEXT_PUBLIC_VERCEL_ENV === "true";
const clientDsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://70be50dacaf31bdfb40465cf13af9f71@o4511261317398528.ingest.us.sentry.io/4511261318447104";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (!isGlobalBuild || !clientDsn) {
      return;
    }

    void import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureException(error);
      })
      .catch(() => {
        // Best-effort reporting: ignore failures to load Sentry in the error boundary.
      });
  }, [error]);

  return (
    <html lang="en-US">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
