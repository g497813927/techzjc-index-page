type SentryModule = typeof import("@sentry/nextjs");
type RouterTransitionStartArgs = Parameters<
  SentryModule["captureRouterTransitionStart"]
>;
type SentryBeforeSendEvent = {
  exception?: {
    values?: Array<{
      value?: string;
      mechanism?: {
        type?: string;
      };
      stacktrace?: {
        frames?: Array<{
          filename?: string;
        }>;
      };
    }>;
  };
  breadcrumbs?: Array<{
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
  }>;
};

const isGlobalBuild = process.env.NEXT_PUBLIC_VERCEL_ENV === "true";
const clientDsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://70be50dacaf31bdfb40465cf13af9f71@o4511261317398528.ingest.us.sentry.io/4511261318447104";
const sendDefaultPii = process.env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII === "true";
const knownBrowserNoiseMessage =
  "Non-Error promise rejection captured with value: Response not successful: Received status code 400";
const vercelToolbarNoisePatterns = ["/.well-known/vercel/jwe", /\/[a-z0-9]+\/view\b/i];
const clarityExtensionNoisePatterns = [
  "https://y.clarity.ms/",
  "chrome-extension://bngpiglbalmenaabohcooocpnljgfemj/",
  "injected-entry.js",
];

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

function getBreadcrumbMessage(breadcrumb: NonNullable<SentryBeforeSendEvent["breadcrumbs"]>[number]) {
  if (typeof breadcrumb.message === "string") {
    return breadcrumb.message;
  }

  if (
    breadcrumb.data &&
    typeof breadcrumb.data === "object" &&
    "url" in breadcrumb.data &&
    typeof breadcrumb.data.url === "string"
  ) {
    return breadcrumb.data.url;
  }

  return "";
}

function matchesAnyPattern(value: string, patterns: Array<string | RegExp>) {
  return patterns.some((pattern) =>
    typeof pattern === "string" ? value.includes(pattern) : pattern.test(value),
  );
}

function hasNoiseBreadcrumb(
  event: SentryBeforeSendEvent,
  patterns: Array<string | RegExp>,
) {
  return (event.breadcrumbs ?? []).some((breadcrumb) =>
    matchesAnyPattern(getBreadcrumbMessage(breadcrumb), patterns),
  );
}

function hasNoiseFrame(
  exception: NonNullable<NonNullable<SentryBeforeSendEvent["exception"]>["values"]>[number],
  patterns: Array<string | RegExp>,
) {
  return (exception.stacktrace?.frames ?? []).some(
    (frame) =>
      typeof frame.filename === "string" &&
      matchesAnyPattern(frame.filename, patterns),
  );
}

function isKnownBrowserNoise(event: SentryBeforeSendEvent) {
  const exception = event.exception?.values?.[0];
  if (exception?.value !== knownBrowserNoiseMessage) {
    return false;
  }

  const mechanismType = exception.mechanism?.type;
  if (mechanismType !== "onunhandledrejection") {
    return false;
  }

  return (
    hasNoiseBreadcrumb(event, vercelToolbarNoisePatterns) ||
    hasNoiseBreadcrumb(event, clarityExtensionNoisePatterns) ||
    hasNoiseFrame(exception, clarityExtensionNoisePatterns)
  );
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
        beforeSend(event) {
          if (isKnownBrowserNoise(event)) {
            return null;
          }

          return event;
        },
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
