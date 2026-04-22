import * as Sentry from "@sentry/nextjs";

const isGlobalBuild =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "true" &&
  process.env.IN_FC !== "true";
const dsn =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://70be50dacaf31bdfb40465cf13af9f71@o4511261317398528.ingest.us.sentry.io/4511261318447104";
const sendDefaultPii = process.env.SENTRY_SEND_DEFAULT_PII === "true";

if (isGlobalBuild && dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  });
}
