type SentryModule = typeof import("@sentry/nextjs");
type RouterTransitionStartArgs = Parameters<
  SentryModule["captureRouterTransitionStart"]
>;
type SentryFrame = {
  filename?: string;
};
type SentryBeforeSendHint = {
  originalException?: unknown;
};
type SentryBeforeSendEvent = {
  culprit?: string;
  exception?: {
    values?: Array<{
      mechanism?: {
        type?: string;
      };
      stacktrace?: {
        frames?: SentryFrame[];
      };
      value?: string;
    }>;
  };
  breadcrumbs?: Array<{
    message?: string;
    data?: Record<string, unknown>;
  }>;
  request?: {
    url?: string;
  };
  stacktrace?: {
    frames?: SentryFrame[];
  };
};

const isGlobalBuild = process.env.NEXT_PUBLIC_VERCEL_ENV === "true";
const clientDsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://70be50dacaf31bdfb40465cf13af9f71@o4511261317398528.ingest.us.sentry.io/4511261318447104";
const sentryApplicationKey =
  process.env.NEXT_PUBLIC_SENTRY_APPLICATION_KEY ?? "techzjc-site-index";
const sendDefaultPii = process.env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII === "true";
const knownBrowserNoiseMessage =
  "Non-Error promise rejection captured with value: Response not successful: Received status code 400";
const vercelToolbarNoisePatterns = ["/.well-known/vercel/jwe", /\/[a-z0-9]+\/view\b/i];
const browserExtensionUrlPrefixes = [
  "chrome-extension://",
  "moz-extension://",
  "ms-browser-extension://",
  "safari-extension://",
  "safari-web-extension://",
];
const browserExtensionNoisePatterns = [
  ...browserExtensionUrlPrefixes,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBrowserExtensionUrl(value: string) {
  return browserExtensionUrlPrefixes.some((prefix) => value.startsWith(prefix));
}

function hasNoiseBreadcrumb(
  event: SentryBeforeSendEvent,
  patterns: Array<string | RegExp>,
) {
  return (event.breadcrumbs ?? []).some((breadcrumb) =>
    matchesAnyPattern(getBreadcrumbMessage(breadcrumb), patterns),
  );
}

function getEventFrames(event: SentryBeforeSendEvent) {
  return [
    ...(event.stacktrace?.frames ?? []),
    ...(event.exception?.values ?? []).flatMap(
      (exception) => exception.stacktrace?.frames ?? [],
    ),
  ];
}

function isExtensionFrame(frame: SentryFrame) {
  return (
    typeof frame.filename === "string" &&
    matchesAnyPattern(frame.filename, browserExtensionNoisePatterns)
  );
}

function getUnhandledRejectionReason(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  if ("reason" in value) {
    return getUnhandledRejectionReason(value.reason);
  }

  if (isRecord(value.detail) && "reason" in value.detail) {
    return getUnhandledRejectionReason(value.detail.reason);
  }

  return value;
}

function collectCandidateStrings(
  value: unknown,
  seen = new Set<unknown>(),
  depth = 0,
): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (!value || depth > 3 || seen.has(value)) {
    return [];
  }

  if (Array.isArray(value)) {
    seen.add(value);
    return value.flatMap((item) =>
      collectCandidateStrings(item, seen, depth + 1),
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  seen.add(value);

  return Object.entries(value).flatMap(([key, entryValue]) => {
    if (
      typeof entryValue === "string" &&
      [
        "message",
        "name",
        "stack",
        "filename",
        "fileName",
        "sourceURL",
        "url",
        "href",
        "src",
      ].includes(key)
    ) {
      return [entryValue];
    }

    return collectCandidateStrings(entryValue, seen, depth + 1);
  });
}

function hasBrowserExtensionHint(hint?: SentryBeforeSendHint) {
  const originalException = hint?.originalException;
  if (!originalException) {
    return false;
  }

  const reason = getUnhandledRejectionReason(originalException);
  const candidateStrings = [
    ...collectCandidateStrings(originalException),
    ...collectCandidateStrings(reason),
  ];

  return candidateStrings.some((value) =>
    matchesAnyPattern(value, browserExtensionNoisePatterns),
  );
}

function hasOnlyBrowserExtensionFrames(event: SentryBeforeSendEvent) {
  const frames = getEventFrames(event);
  return frames.length > 0 && frames.every(isExtensionFrame);
}

function isBrowserExtensionEvent(
  event: SentryBeforeSendEvent,
  hint?: SentryBeforeSendHint,
) {
  if (
    typeof event.culprit === "string" &&
    matchesAnyPattern(event.culprit, browserExtensionNoisePatterns)
  ) {
    return true;
  }

  if (
    typeof event.request?.url === "string" &&
    isBrowserExtensionUrl(event.request.url)
  ) {
    return true;
  }

  if (hasOnlyBrowserExtensionFrames(event)) {
    return true;
  }

  if (hasNoiseBreadcrumb(event, browserExtensionNoisePatterns)) {
    return true;
  }

  return hasBrowserExtensionHint(hint);
}

function isKnownBrowserNoise(
  event: SentryBeforeSendEvent,
  hint?: SentryBeforeSendHint,
) {
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
    isBrowserExtensionEvent(event, hint)
  );
}

if (isGlobalBuild && clientDsn) {
  void loadSentry()
    .then((Sentry) => {
      Sentry.init({
        dsn: clientDsn,
        sendDefaultPii,
        tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
        integrations: [
          Sentry.thirdPartyErrorFilterIntegration({
            filterKeys: [sentryApplicationKey],
            behaviour:
              "drop-error-if-exclusively-contains-third-party-frames",
            ignoreSentryInternalFrames: true,
          }),
          Sentry.replayIntegration(),
        ],
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event, hint) {
          if (
            isBrowserExtensionEvent(event, hint) ||
            isKnownBrowserNoise(event, hint)
          ) {
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
