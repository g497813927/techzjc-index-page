import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { NextRequest } from "next/server.js";
import { proxy } from "../../src/proxy.ts";
import {
  canonicalizeNavigationUrl,
  classifyNavigation,
  getConfiguredVercelHostnames,
  isAllowedApplicationHost,
  isLoopbackHostname,
  isOwnedSiteHostname,
  normalizeHostAuthority,
  normalizeHostHeader,
  normalizeHostname,
  validateExternalLinkManifest,
} from "../../src/lib/browserSecurity.ts";

const malformedUrls = [
  "https://techzjc.com../",
  "https://techzjc.com.../",
  "http:..",
  "https://.../",
  "https://techzjc.com%2e%2e/",
  "https://techzjc.com\u3002\u3002/",
];

describe("F7: hostname normalization is stable", () => {
  test("rejects repeated root dots, including URL parser aliases", () => {
    for (const url of malformedUrls) {
      assert.equal(canonicalizeNavigationUrl(url), null, url);
      assert.equal(canonicalizeNavigationUrl(new URL(url)), null, url);
      assert.equal(normalizeHostname(url), "", url);
    }
    assert.equal(canonicalizeNavigationUrl("/path", "https://techzjc.com../"), null);
  });

  test("canonical output stays unchanged across repeated calls", () => {
    for (const [input, expected] of [
      ["HTTPS://TECHZJC.COM.:443/Path?a=1&a=2#Hash", "https://techzjc.com/Path?a=1&a=2#Hash"],
      ["http://localhost.:3000/path", "http://localhost:3000/path"],
      ["https://[2001:db8::1]:443/path", "https://[2001:db8::1]/path"],
      ["http://[::1]:3000/path", "http://[::1]:3000/path"],
      ["https://b\u00fccher.example./", "https://xn--bcher-kva.example/"],
      ["mailto:person@example.com", "mailto:person@example.com"],
      ["tel:+1234567890", "tel:+1234567890"],
    ]) {
      const canonical = canonicalizeNavigationUrl(input);
      assert.equal(canonical, expected);
      assert.equal(canonicalizeNavigationUrl(canonical), canonical);
    }
    assert.equal(
      canonicalizeNavigationUrl("../Path?x=1#Hash", "https://TECHZJC.COM./en-US/"),
      "https://techzjc.com/Path?x=1#Hash",
    );
  });

  test("preserves valid hostname-helper inputs and a single DNS root dot", () => {
    for (const [input, expected] of [
      ["TECHZJC.COM.:443", "techzjc.com"],
      ["https://TECHZJC.COM.:443/path", "techzjc.com"],
      ["techzjc.com., proxy.internal", "techzjc.com"],
      ["[::1]:3000", "[::1]"],
      ["[2001:db8::1]", "[2001:db8::1]"],
    ]) {
      assert.equal(normalizeHostname(input), expected);
      assert.equal(normalizeHostname(normalizeHostname(input)), expected);
    }
    assert.equal(normalizeHostAuthority("TECHZJC.COM.:443"), "techzjc.com.:443");
    assert.equal(normalizeHostHeader("TECHZJC.COM.:443"), "techzjc.com");
    assert.equal(normalizeHostAuthority("[::1]:3000"), "[::1]:3000");
    assert.equal(isOwnedSiteHostname("techzjc.com."), true);
    assert.equal(isLoopbackHostname("localhost."), true);
    assert.deepEqual(
      getConfiguredVercelHostnames({ VERCEL_URL: "preview.vercel.app." }),
      ["preview.vercel.app"],
    );
  });

  test("does not turn malformed Host authorities into trusted hosts on a second pass", () => {
    for (const hostname of ["techzjc.com..", "techzjc.com...", "localhost..", ".."]) {
      for (const host of [hostname, `${hostname}:443`]) {
        assert.equal(normalizeHostAuthority(host), "", host);
        assert.equal(normalizeHostHeader(host), "", host);
        assert.equal(normalizeHostname(host), "", host);
        assert.equal(
          isAllowedApplicationHost(normalizeHostHeader(host), { NODE_ENV: "development" }),
          false,
          host,
        );
      }
    }
    assert.equal(isOwnedSiteHostname("techzjc.com.."), false);
    assert.equal(isLoopbackHostname("localhost.."), false);
    assert.deepEqual(getConfiguredVercelHostnames({ VERCEL_URL: "preview.vercel.app.." }), []);
  });

  test("proxy rejects malformed direct and forwarded hosts after its normalization step", () => {
    const previousInFc = process.env.IN_FC;
    process.env.IN_FC = "false";
    try {
      for (const headers of [
        { host: "techzjc.com.." },
        { host: "techzjc.com", "x-forwarded-host": "techzjc.com.., proxy.internal" },
      ]) {
        const response = proxy(new NextRequest("https://techzjc.com/en-US", { headers }));
        assert.equal(response.headers.get("x-middleware-rewrite"), "https://techzjc.com/scanner-404");
      }
      const response = proxy(new NextRequest("https://techzjc.com/en-US", {
        headers: { host: "techzjc.com." },
      }));
      assert.equal(response.headers.get("x-middleware-next"), "1");
    } finally {
      if (previousInFc === undefined) delete process.env.IN_FC;
      else process.env.IN_FC = previousInFc;
    }
  });

  test("rejects malformed manifest entries and cannot allowlist their normalized aliases", () => {
    const now = Date.parse("2026-09-10T12:00:00Z");
    for (const url of malformedUrls) {
      assert.deepEqual(validateExternalLinkManifest({
        schemaVersion: 1,
        revision: "one",
        issuedAt: new Date(now).toISOString(),
        servedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 60_000).toISOString(),
        urls: [url],
      }, { now }), { ok: false, reason: "invalid-url" });
    }
    assert.equal(classifyNavigation("https://other.example../path", {
      currentUrl: "https://techzjc.com/",
      trustedUrls: ["https://other.example./path"],
      trustedHostnames: ["other.example."],
    }).decision, "confirm");
    assert.equal(classifyNavigation("https://other.example./Path?x=1#Hash", {
      currentUrl: "https://techzjc.com/",
      trustedUrls: ["https://other.example/Path?x=1#Hash"],
    }).decision, "allow");
  });
});
