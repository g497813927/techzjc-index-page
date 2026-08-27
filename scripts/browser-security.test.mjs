#!/usr/bin/env node
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildContentSecurityPolicy,
  calculateExternalLinkManifestUsableUntil,
  canonicalizeNavigationUrl,
  classifyNavigation,
  firstHeaderListValue,
  getConfiguredVercelHostnames,
  isAllowedApplicationHost,
  isOwnedSiteHostname,
  normalizeHostAuthority,
  normalizeHostHeader,
  normalizeHostname,
  redactNavigationUrl,
  shouldAdoptExternalLinkManifest,
  unwrapApiEnvelope,
  validateExternalLinkManifest,
} from "../src/lib/browserSecurity.ts";
import { readLimitedRequestBody } from "../src/lib/readLimitedRequestBody.ts";

function getPolicySources(policy, directiveName) {
  const directive = policy
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${directiveName} `));
  return directive?.split(/\s+/).slice(1) ?? [];
}

describe("browser security host matching", () => {
  test("normalizes ports, case, trailing dots, and IPv6 loopback", () => {
    assert.equal(normalizeHostname("TECHZJC.com.:443"), "techzjc.com");
    assert.equal(normalizeHostname("[::1]:3000"), "[::1]");
    assert.equal(normalizeHostname("not a host"), "");
  });

  test("matches only the exact application hosts", () => {
    assert.equal(isOwnedSiteHostname("techzjc.com"), true);
    assert.equal(isOwnedSiteHostname("test-cn.techzjc.com"), true);
    assert.equal(isOwnedSiteHostname("static.techzjc.com"), false);
    assert.equal(isOwnedSiteHostname("techzjc.com.attacker.example"), false);
    assert.equal(isOwnedSiteHostname("nottechzjc.com"), false);
  });

  test("rejects URL syntax and malformed values in Host authorities", () => {
    assert.equal(normalizeHostHeader("TECHZJC.com:443"), "techzjc.com");
    assert.equal(normalizeHostHeader("[::1]:3000"), "[::1]");
    for (const invalid of [
      "https://techzjc.com",
      "techzjc.com/path",
      "techzjc.com?x=1",
      "techzjc.com\\@evil.example",
      "techzjc.com:70000",
      "techzjc.com,evil.example",
    ]) {
      assert.equal(normalizeHostHeader(invalid), "");
    }
  });

  test("selects and validates the first forwarded Host authority", () => {
    assert.equal(
      firstHeaderListValue("TECHZJC.com:443, proxy.internal"),
      "TECHZJC.com:443",
    );
    assert.equal(normalizeHostAuthority("TECHZJC.com:443"), "techzjc.com:443");
    assert.equal(normalizeHostAuthority("TECHZJC.com."), "techzjc.com.");
    assert.equal(normalizeHostAuthority("[::1]:3000"), "[::1]:3000");
    for (const invalid of [
      "techzjc.com@evil.example",
      "techzjc.com/path",
      "techzjc.com,evil.example",
      "999.999.999.999",
    ]) {
      assert.equal(normalizeHostAuthority(invalid), "");
    }
  });

  test("allows exact Vercel deployment hosts without trusting vercel.app", () => {
    const env = {
      NODE_ENV: "production",
      VERCEL_URL: "site-index-a1b2c3.vercel.app",
      VERCEL_BRANCH_URL: "site-index-git-main-owner.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "site-index.vercel.app",
    };

    assert.deepEqual(getConfiguredVercelHostnames(env), [
      "site-index-a1b2c3.vercel.app",
      "site-index-git-main-owner.vercel.app",
      "site-index.vercel.app",
    ]);
    assert.equal(
      isAllowedApplicationHost("site-index-a1b2c3.vercel.app", env),
      true,
    );
    assert.equal(
      isAllowedApplicationHost("unrelated-project.vercel.app", env),
      false,
    );
  });

  test("allows loopback hosts only in development", () => {
    assert.equal(
      isAllowedApplicationHost("localhost:3000", { NODE_ENV: "development" }),
      true,
    );
    assert.equal(
      isAllowedApplicationHost("127.0.0.1:3000", { NODE_ENV: "production" }),
      false,
    );
  });
});

describe("outbound navigation policy", () => {
  const currentUrl = "https://techzjc.com/en-US";

  test("allows same-origin, exact application hosts, and deployment aliases", () => {
    assert.equal(
      classifyNavigation("/blog", { currentUrl }).decision,
      "allow",
    );
    assert.equal(
      classifyNavigation("https://test-cn.techzjc.com/en-US", {
        currentUrl,
      }).decision,
      "allow",
    );
    assert.equal(
      classifyNavigation("https://static.techzjc.com/image.webp", {
        currentUrl,
      }).decision,
      "confirm",
    );
    assert.equal(
      classifyNavigation("https://test-cn.techzjc.com:8443/en-US", {
        currentUrl,
      }).decision,
      "confirm",
    );
    assert.equal(
      classifyNavigation("https://site-index.vercel.app/en-US", {
        currentUrl,
        trustedHostnames: ["site-index.vercel.app"],
      }).decision,
      "allow",
    );
    assert.equal(
      classifyNavigation("https://other.vercel.app/en-US", {
        currentUrl,
        trustedHostnames: ["site-index.vercel.app"],
      }).decision,
      "confirm",
    );
  });

  test("allows cross-port loopback navigation only from local development", () => {
    assert.equal(
      classifyNavigation("http://127.0.0.1:4000/test", {
        currentUrl: "http://localhost:3000/",
      }).decision,
      "allow",
    );
    assert.equal(
      classifyNavigation("http://127.0.0.1:4000/test", {
        currentUrl,
      }).decision,
      "confirm",
    );
  });

  test("allows only exact canonical manifest URLs", () => {
    const trustedUrls = new Set([
      "https://github.com/g497813927#profile",
    ]);
    assert.equal(
      classifyNavigation("https://github.com/g497813927#profile", {
        currentUrl,
        trustedUrls,
      }).decision,
      "allow",
    );
    assert.equal(
      classifyNavigation("https://github.com/g497813927#admin", {
        currentUrl,
        trustedUrls,
      }).decision,
      "confirm",
    );
    assert.equal(
      classifyNavigation("https://github.com/g497813927?tab=repositories", {
        currentUrl,
        trustedUrls,
      }).decision,
      "confirm",
    );
  });

  test("blocks unsafe schemes regardless of manifest content", () => {
    assert.equal(
      classifyNavigation("javascript:alert(1)", {
        currentUrl,
        trustedUrls: ["javascript:alert(1)"],
      }).decision,
      "block",
    );
    assert.equal(
      classifyNavigation("data:text/html,test", {
        currentUrl,
        trustedUrls: ["data:text/html,test"],
      }).decision,
      "block",
    );
    assert.equal(
      classifyNavigation("https://user:secret@techzjc.com/", {
        currentUrl,
      }).decision,
      "block",
    );
  });

  test("redacts credentials, paths, queries, fragments, and mail addresses", () => {
    assert.deepEqual(
      redactNavigationUrl(
        "https://user:secret@evil.example/path?token=secret&token=again&id=42#x",
      ),
      {
        protocol: "https:",
        hostname: "evil.example",
        port: "",
        pathname: "[redacted]",
        queryKeys: [],
        hadFragment: true,
      },
    );
    assert.deepEqual(redactNavigationUrl("mailto:private@example.com"), {
      protocol: "mailto:",
      hostname: "",
      port: "",
      pathname: "[redacted]",
      queryKeys: [],
      hadFragment: false,
    });
  });
});

describe("external-link manifest", () => {
  const now = Date.parse("2026-08-27T00:00:00Z");

  test("canonicalizes safe URLs without weakening exact path and query matching", () => {
    assert.equal(
      canonicalizeNavigationUrl(
        "HTTPS://GitHub.COM:443/g497813927?tab=repositories#readme",
      ),
      "https://github.com/g497813927?tab=repositories#readme",
    );
    assert.equal(
      canonicalizeNavigationUrl("javascript:alert(1)"),
      null,
    );
    assert.equal(
      canonicalizeNavigationUrl("https://user:secret@example.com/path"),
      null,
    );
  });

  test("unwraps only successful REST API envelopes", () => {
    const data = { revision: "one" };
    assert.equal(unwrapApiEnvelope({ code: 0, message: "", data }), data);
    assert.equal(unwrapApiEnvelope({ code: -1, message: "failed", data }), null);
    assert.equal(unwrapApiEnvelope({ code: 0, data }), null);
    assert.equal(unwrapApiEnvelope(data), null);
  });

  test("validates and canonicalizes an unexpired exact-URL manifest", () => {
    const result = validateExternalLinkManifest(
      {
        schemaVersion: 1,
        revision: "2026-08-27-1",
        issuedAt: "2026-08-27T00:00:00Z",
        servedAt: "2026-08-27T00:00:00Z",
        expiresAt: "2026-09-27T00:00:00Z",
        urls: [
          "https://github.com/g497813927#profile",
          "https://orcid.org/0009-0003-5719-909X",
        ],
      },
      { now },
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual([...result.urls], [
        "https://github.com/g497813927#profile",
        "https://orcid.org/0009-0003-5719-909X",
      ]);
    }
  });

  test("binds a fetched manifest to the revision requested by the client", () => {
    const manifest = {
      schemaVersion: 1,
      revision: "2026-08-27-1",
      issuedAt: "2026-08-27T00:00:00Z",
      servedAt: "2026-08-27T00:00:00Z",
      expiresAt: "2026-09-27T00:00:00Z",
      urls: ["https://github.com/g497813927"],
    };

    assert.equal(
      validateExternalLinkManifest(manifest, {
        now,
        expectedRevision: "2026-08-27-1",
      }).ok,
      true,
    );
    assert.deepEqual(
      validateExternalLinkManifest(manifest, {
        now,
        expectedRevision: "2026-08-28-1",
      }),
      { ok: false, reason: "unexpected-revision" },
    );
  });

  test("fails closed for expired, unsafe, or oversized manifests", () => {
    assert.deepEqual(
      validateExternalLinkManifest(
        {
          schemaVersion: 1,
          revision: "old",
          issuedAt: "2026-08-26T00:00:00Z",
          servedAt: "2026-08-26T23:59:00Z",
          expiresAt: "2026-08-26T00:00:00Z",
          urls: ["https://github.com/g497813927"],
        },
        { now },
      ),
      { ok: false, reason: "expired" },
    );
    assert.deepEqual(
      validateExternalLinkManifest(
        {
          schemaVersion: 1,
          revision: "unsafe",
          issuedAt: "2026-08-27T00:00:00Z",
          servedAt: "2026-08-27T00:00:00Z",
          expiresAt: "2026-09-27T00:00:00Z",
          urls: ["javascript:alert(1)"],
        },
        { now },
      ),
      { ok: false, reason: "invalid-url" },
    );
    assert.deepEqual(
      validateExternalLinkManifest(
        {
          schemaVersion: 1,
          revision: "large",
          issuedAt: "2026-08-27T00:00:00Z",
          servedAt: "2026-08-27T00:00:00Z",
          expiresAt: "2026-09-27T00:00:00Z",
          urls: ["https://example.com/one", "https://example.com/two"],
        },
        { now, maxEntries: 1 },
      ),
      { ok: false, reason: "too-many-urls" },
    );
  });

  test("rejects stale or rolled-back response timestamps", () => {
    assert.deepEqual(
      validateExternalLinkManifest(
        {
          schemaVersion: 1,
          revision: "stale",
          issuedAt: "2026-08-26T00:00:00Z",
          servedAt: "2026-08-26T23:30:00Z",
          expiresAt: "2026-09-27T00:00:00Z",
          urls: ["https://github.com/g497813927"],
        },
        { now },
      ),
      { ok: false, reason: "stale-response" },
    );
  });

  test("caps cache usability at the original response freshness deadline", () => {
    const servedAt = now - 14 * 60 * 1_000;
    const cachedAt = now;
    const expiresAt = now + 24 * 60 * 60 * 1_000;

    assert.equal(
      calculateExternalLinkManifestUsableUntil(
        expiresAt,
        servedAt,
        cachedAt,
        15 * 60 * 1_000,
      ),
      now + 60 * 1_000,
    );
  });

  test("rejects equal-issued-at conflicting or older manifests", () => {
    const current = {
      revision: "revision-2",
      issuedAtMs: now,
      servedAtMs: now + 60_000,
      urls: new Set(["https://github.com/g497813927"]),
    };
    assert.equal(
      shouldAdoptExternalLinkManifest(
        {
          ...current,
          revision: "revision-1",
          servedAtMs: now + 120_000,
        },
        current,
      ),
      false,
    );
    assert.equal(
      shouldAdoptExternalLinkManifest(
        { ...current, servedAtMs: now },
        current,
      ),
      false,
    );
    assert.equal(
      shouldAdoptExternalLinkManifest(
        {
          ...current,
          servedAtMs: now + 120_000,
          urls: new Set(["https://orcid.org/0009-0003-5719-909X"]),
        },
        current,
      ),
      false,
    );
    assert.equal(
      shouldAdoptExternalLinkManifest(
        { ...current, servedAtMs: now + 120_000 },
        current,
      ),
      true,
    );
  });
});

describe("bounded request bodies", () => {
  test("stops reading a streamed request once its byte limit is exceeded", async () => {
    const encoder = new TextEncoder();
    const request = new Request("https://techzjc.com/api/security/navigation", {
      method: "POST",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode("1234"));
          controller.enqueue(encoder.encode("5678"));
          controller.close();
        },
      }),
      duplex: "half",
    });

    assert.deepEqual(await readLimitedRequestBody(request, 6), {
      ok: false,
      reason: "too-large",
    });
  });

  test("returns text when a streamed request stays within the byte limit", async () => {
    const request = new Request("https://techzjc.com/api/security/navigation", {
      method: "POST",
      body: "你好",
    });

    assert.deepEqual(await readLimitedRequestBody(request, 6), {
      ok: true,
      text: "你好",
    });
  });
});

describe("content security policy", () => {
  test("restricts external scripts to the deployed providers", () => {
    const policy = buildContentSecurityPolicy();
    assert.match(policy, /script-src 'self' 'unsafe-inline'/);
    assert.match(policy, /https:\/\/www\.googletagmanager\.com/);
    assert.match(policy, /https:\/\/va\.vercel-scripts\.com/);
    assert.match(policy, /connect-src[^;]*https:\/\/api\.techzjc\.com/);
    assert.match(policy, /img-src[^;]*https:\/\/www\.googletagmanager\.com/);
    assert.match(policy, /frame-src 'self'/);
    assert.match(policy, /frame-src[^;]*https:\/\/giscus\.app/);
    assert.match(policy, /script-src-attr 'none'/);
    assert.match(policy, /report-uri \/api\/security\/csp-report/);
    assert.doesNotMatch(policy, /51\.la|lovehgg|tnm589/);
    assert.doesNotMatch(policy, /unsafe-eval/);
  });

  test("allows Microsoft Clarity sources only when Microsoft Clarity is enabled", () => {
    const policy = buildContentSecurityPolicy({
      enableMicrosoftClarity: true,
    });

    const letteredSources = [..."abcdefghijklmnopqrstuvwxyz"].map(
      (letter) => `https://${letter}.clarity.ms`,
    );
    const guidanceSources = [
      "https://www.clarity.ms",
      "https://c.bing.com",
      ...letteredSources,
    ];
    const isClaritySource = (source) =>
      source.endsWith(".clarity.ms") || source === "https://c.bing.com";

    assert.deepEqual(
      getPolicySources(policy, "default-src").filter(isClaritySource),
      guidanceSources,
    );
    assert.deepEqual(
      getPolicySources(policy, "script-src").filter(isClaritySource),
      ["https://www.clarity.ms", "https://scripts.clarity.ms"],
    );
    assert.deepEqual(
      getPolicySources(policy, "connect-src").filter(isClaritySource),
      guidanceSources,
    );
    assert.deepEqual(
      getPolicySources(policy, "img-src").filter(isClaritySource),
      [...letteredSources, "https://c.bing.com"],
    );
    assert.deepEqual(
      getPolicySources(policy, "worker-src").filter(isClaritySource),
      [],
    );
    assert.doesNotMatch(policy, /https:\/\/\*\.clarity\.ms/);

    const policyWithoutMicrosoftClarity = buildContentSecurityPolicy();
    assert.doesNotMatch(
      policyWithoutMicrosoftClarity,
      /clarity\.ms|c\.bing\.com/,
    );
  });

  test("adds unsafe-eval only for the Next.js development runtime", () => {
    assert.match(
      buildContentSecurityPolicy({ isDevelopment: true }),
      /'unsafe-eval'/,
    );
  });
});
