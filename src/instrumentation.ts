type SentryModule = typeof import("@sentry/nextjs");
type RequestErrorArgs = Parameters<SentryModule["captureRequestError"]>;

const isGlobalBuild =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "true" &&
  process.env.IN_FC !== "true";
const serverDsn =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://70be50dacaf31bdfb40465cf13af9f71@o4511261317398528.ingest.us.sentry.io/4511261318447104";

let sentryModulePromise: Promise<SentryModule> | undefined;

function loadSentry() {
  sentryModulePromise ??= import("@sentry/nextjs");
  return sentryModulePromise;
}

export async function register() {
  if (!isGlobalBuild || !serverDsn) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (...args: RequestErrorArgs) => {
  if (!isGlobalBuild || !serverDsn) {
    return;
  }

  const Sentry = await loadSentry();
  return Sentry.captureRequestError(...args);
};
