#!/usr/bin/env node
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  expandIpv6,
  getClientIp,
  handle,
  isTrustedCdnRequest,
  truncateIp,
  truncateIpv4,
} from "../src/app/scanner-404/route-logic.mjs";

describe("scanner-404 IPv4 truncation", () => {
  test("truncates canonical IPv4 addresses to /24", () => {
    assert.equal(truncateIpv4("203.0.113.47"), "203.0.113.0/24");
    assert.equal(truncateIpv4("0.0.0.0"), "0.0.0.0/24");
    assert.equal(truncateIpv4("255.255.255.255"), "255.255.255.0/24");
  });

  test("rejects malformed or non-canonical IPv4 addresses", () => {
    for (const ip of [
      "203.0.113",
      "203.0.113.47.1",
      "203.0.113.256",
      "203.0.113.-1",
      "203.0.113.47suffix",
      "203.0.113.047",
    ]) {
      assert.equal(truncateIpv4(ip), undefined, ip);
    }
  });
});

describe("scanner-404 IPv6 expansion", () => {
  test("expands compressed, full, and zone-qualified IPv6 addresses", () => {
    assert.deepEqual(expandIpv6("2001:0DB8::0001"), [
      "2001",
      "db8",
      "0",
      "0",
      "0",
      "0",
      "0",
      "1",
    ]);
    assert.deepEqual(expandIpv6("2001:db8:0:1:2:3:4:5"), [
      "2001",
      "db8",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    assert.deepEqual(expandIpv6("FE80::ABCD%en0"), [
      "fe80",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "abcd",
    ]);
  });

  test("rejects malformed IPv6 addresses", () => {
    for (const ip of [
      "2001:db8::1::1",
      "2001:db8:0:0:0:0:1",
      "2001:db8:0:0:0:0:0:0:1",
      "2001:db8::12345",
      "2001:db8::gggg",
    ]) {
      assert.equal(expandIpv6(ip), null, ip);
    }
  });

  test("preserves the current zero-hextet double-colon behavior", () => {
    assert.deepEqual(expandIpv6("1:2:3:4:5:6:7:8::"), [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
  });

  test("uses the expanded address when truncating IPv6 and mapped IPv4", () => {
    assert.equal(truncateIp("2001:0DB8:abcd::1"), "2001:db8::/32");
    assert.equal(truncateIp("::ffff:203.0.113.47"), "203.0.113.0/24");
    assert.equal(truncateIp("::ffff:203.0.113.256"), "invalid-ip");
    assert.equal(truncateIp("not-an-ip"), "invalid-ip");
    assert.equal(truncateIp("unknown"), "unknown");
  });
});

describe("scanner-404 CDN trust", () => {
  test("trusts only a matching, non-empty origin credential", () => {
    assert.equal(isTrustedCdnRequest("configured-token", "configured-token"), true);
    assert.equal(isTrustedCdnRequest("wrong-token", "configured-token"), false);
    assert.equal(isTrustedCdnRequest(null, undefined), false);
    assert.equal(isTrustedCdnRequest("", ""), false);
  });

  test("prefers CDN real IP and falls back to forwarded IP when trusted", () => {
    assert.deepEqual(
      getClientIp({
        originAuth: "configured-token",
        cdnOriginAuth: "configured-token",
        aliCdnRealIp: " 203.0.113.47, 198.51.100.8 ",
        forwardedIp: "198.51.100.9",
        realIp: "192.0.2.10",
      }),
      { rawIp: "203.0.113.47", source: "ali-cdn-real-ip" },
    );
    assert.deepEqual(
      getClientIp({
        originAuth: "configured-token",
        cdnOriginAuth: "configured-token",
        aliCdnRealIp: null,
        forwardedIp: "198.51.100.9, 192.0.2.10",
        realIp: "192.0.2.11",
      }),
      { rawIp: "198.51.100.9", source: "x-forwarded-for" },
    );
  });

  test("does not trust CDN-only headers when the credential is missing or wrong", () => {
    assert.deepEqual(
      getClientIp({
        originAuth: "wrong-token",
        cdnOriginAuth: "configured-token",
        aliCdnRealIp: "203.0.113.47",
        forwardedIp: "198.51.100.9",
        realIp: "192.0.2.10",
      }),
      { rawIp: "198.51.100.9", source: "untrusted-header" },
    );
    assert.deepEqual(
      getClientIp({
        originAuth: null,
        cdnOriginAuth: undefined,
        aliCdnRealIp: "203.0.113.47",
        forwardedIp: null,
        realIp: "192.0.2.10",
      }),
      { rawIp: "192.0.2.10", source: "untrusted-header" },
    );
  });

  test("does not fall back after selecting a malformed higher-priority header", () => {
    const clientIp = getClientIp({
      originAuth: "configured-token",
      cdnOriginAuth: "configured-token",
      aliCdnRealIp: "not-an-ip",
      forwardedIp: "198.51.100.9",
      realIp: "192.0.2.10",
    });

    assert.deepEqual(clientIp, {
      rawIp: "not-an-ip",
      source: "ali-cdn-real-ip",
    });
    assert.equal(truncateIp(clientIp.rawIp), "invalid-ip");
  });

  test("preserves the existing missing-header sources in both branches", () => {
    const emptyHeaders = {
      aliCdnRealIp: null,
      forwardedIp: null,
      realIp: null,
    };

    assert.deepEqual(
      getClientIp({
        ...emptyHeaders,
        originAuth: "configured-token",
        cdnOriginAuth: "configured-token",
      }),
      { rawIp: "unknown", source: "unknown" },
    );
    assert.deepEqual(
      getClientIp({
        ...emptyHeaders,
        originAuth: "wrong-token",
        cdnOriginAuth: "configured-token",
      }),
      { rawIp: "unknown", source: "untrusted-header" },
    );
  });
});

describe("scanner-404 handle", () => {
  function makeRequest(url, { method = "GET", acceptLanguage = "" } = {}) {
    return new Request(url, {
      method,
      headers: acceptLanguage ? { "accept-language": acceptLanguage } : {},
    });
  }

  test("returns 404 with English message for non-zh locale", async () => {
    const res = await handle(makeRequest("http://localhost/wp-login.php", {
      method: "POST",
      acceptLanguage: "en-US,en;q=0.9",
    }));

    assert.equal(res.status, 404);
    assert.equal(res.headers.get("Content-Type"), "text/plain; charset=utf-8");
    assert.equal(res.headers.get("Cache-Control"), "no-store, max-age=0");
    const body = await res.text();
    assert.match(body, /A wild scanner appeared/);
    assert.match(body, /wp-login\.php/);
    assert.match(body, /POST/);
  });

  test("returns 404 with Chinese message for zh locale", async () => {
    const res = await handle(makeRequest("http://localhost/admin", {
      method: "GET",
      acceptLanguage: "zh-CN,zh;q=0.9",
    }));

    assert.equal(res.status, 404);
    const body = await res.text();
    assert.match(body, /一个野生的扫描器出现了/);
    assert.match(body, /\/admin/);
  });

  test("defaults to English when accept-language is missing", async () => {
    const res = await handle(makeRequest("http://localhost/secret"));
    assert.equal(res.status, 404);
    const body = await res.text();
    assert.match(body, /A wild scanner appeared/);
  });

  test("does not log when SCANNER_404_LOG_REQUESTS is not true", async () => {
    const original = process.env.SCANNER_404_LOG_REQUESTS;
    delete process.env.SCANNER_404_LOG_REQUESTS;

    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args);

    try {
      await handle(makeRequest("http://localhost/test"));
      assert.equal(logs.length, 0);
    } finally {
      console.log = originalLog;
      if (original !== undefined) process.env.SCANNER_404_LOG_REQUESTS = original;
    }
  });

  test("logs request details when SCANNER_404_LOG_REQUESTS is true", async () => {
    const original = process.env.SCANNER_404_LOG_REQUESTS;
    process.env.SCANNER_404_LOG_REQUESTS = "true";

    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args);

    try {
      await handle(makeRequest("http://localhost/phpinfo.php", {
        method: "GET",
        acceptLanguage: "en-US",
      }));
      assert.equal(logs.length, 1);
      assert.equal(logs[0][0].type, "scanner-404");
      assert.equal(logs[0][0].method, "GET");
      assert.equal(logs[0][0].path, "/phpinfo.php");
    } finally {
      console.log = originalLog;
      if (original !== undefined) {
        process.env.SCANNER_404_LOG_REQUESTS = original;
      } else {
        delete process.env.SCANNER_404_LOG_REQUESTS;
      }
    }
  });
});
