import type { init } from "@sentry/nextjs";

type SentryDataCollection = NonNullable<
  Parameters<typeof init>[0]["dataCollection"]
>;

export function buildSentryDataCollection(
  sendDefaultPii: boolean,
): SentryDataCollection {
  if (sendDefaultPii) {
    return { frameContextLines: 7 };
  }

  // Sentry 11 collects more by default. Preserve the v10 opt-out baseline.
  const deny = ["forwarded", "-ip", "remote-", "via", "-user"];
  return {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: { deny },
      response: { deny },
    },
    httpBodies: [],
    urlQueryParams: { deny },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    graphQL: { document: false, variables: false },
    frameContextLines: 7,
  };
}
