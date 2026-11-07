import assert from "node:assert/strict";
import { test } from "node:test";
import { NodeClient, requestDataIntegration } from "@sentry/nextjs";
import { buildSentryDataCollection } from "../src/lib/sentryDataCollection.ts";

function processRequest(sendDefaultPii) {
  const client = new NodeClient({
    dataCollection: buildSentryDataCollection(sendDefaultPii),
    integrations: [],
    stackParser: () => [],
    transport: () => ({
      send: async () => {
        throw new Error("Privacy regression tests must not send telemetry");
      },
      flush: async () => true,
    }),
  });
  const event = requestDataIntegration().processEvent(
    {
      sdkProcessingMetadata: {
        ipAddress: "203.0.113.1",
        normalizedRequest: {
          method: "GET",
          url: "https://example.test/?page=1&remote-user=alice",
          headers: {
            "content-type": "text/html",
            "x-forwarded-for": "203.0.113.1",
            "remote-user": "alice",
            cookie: "theme=dark",
          },
          cookies: { theme: "dark" },
          query_string: "page=1&remote-user=alice",
        },
      },
    },
    {},
    client,
  );
  return { event, collection: client.getDataCollectionOptions() };
}

test("default Sentry collection strips visitor identity and cookies", () => {
  const { event, collection } = processRequest(false);
  assert.equal(event.user?.ip_address, undefined);
  assert.equal(event.request.cookies, undefined);
  assert.equal(event.request.headers.cookie, undefined);
  assert.equal(event.request.headers["x-forwarded-for"], undefined);
  assert.equal(event.request.headers["remote-user"], "[Filtered]");
  assert.equal(event.request.headers["content-type"], "text/html");
  for (const params of [
    new URLSearchParams(event.request.query_string),
    new URL(event.request.url).searchParams,
  ]) {
    assert.equal(params.get("page"), "1");
    assert.equal(params.get("remote-user"), "[Filtered]");
  }
  assert.deepEqual(collection.httpBodies, []);
  assert.equal(collection.databaseQueryData, false);
  assert.deepEqual(collection.genAI, { inputs: false, outputs: false });
  assert.deepEqual(collection.graphQL, { document: false, variables: false });
});

test("the existing explicit PII opt-in still enables identity collection", () => {
  const { event, collection } = processRequest(true);
  assert.equal(event.user.ip_address, "203.0.113.1");
  assert.equal(event.request.cookies.theme, "dark");
  assert.equal(event.request.headers["remote-user"], "alice");
  assert.equal(collection.userInfo, true);
});
