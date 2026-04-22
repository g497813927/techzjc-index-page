type SentryModule = typeof import("@sentry/nextjs");
type RouterTransitionStartArgs = Parameters<
  SentryModule["captureRouterTransitionStart"]
>;

const isGlobalBuild = process.env.NEXT_PUBLIC_VERCEL_ENV === "true";
const clientDsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://70be50dacaf31bdfb40465cf13af9f71@o4511261317398528.ingest.us.sentry.io/4511261318447104";
const sendDefaultPii = process.env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII === "true";

let sentryModulePromise: Promise<SentryModule> | undefined;

function loadSentry() {
  sentryModulePromise ??= import("@sentry/nextjs");
  return sentryModulePromise;
}

function handleSentryLoadError(context: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`Failed to load Sentry for ${context}.`, error);
  }
}

if (isGlobalBuild && clientDsn) {
  void loadSentry()
    .then((Sentry) => {
      Sentry.init({
        dsn: clientDsn,
        sendDefaultPii,
        tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
        integrations: [Sentry.replayIntegration()],
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
    })
    .catch((error) => {
      handleSentryLoadError("client initialization", error);
    });
}

export const onRouterTransitionStart = (...args: RouterTransitionStartArgs) => {
  if (!isGlobalBuild || !clientDsn) {
    return;
  }

  void loadSentry()
    .then((Sentry) => {
      Sentry.captureRouterTransitionStart(...args);
    })
    .catch((error) => {
      handleSentryLoadError("router transition instrumentation", error);
    });
};
