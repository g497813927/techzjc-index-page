import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { NextRequest } from "next/server.js";
import { proxy } from "../../src/proxy.ts";

function request(pathname, headers = {}) {
  return new NextRequest(`https://techzjc.com${pathname}`, {
    headers: { host: "techzjc.com", ...headers },
  });
}

function expectRewrite(response, pathname) {
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    `https://techzjc.com${pathname}`,
  );
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("cache-control"), null);
}

describe("F1: malformed language preferences remain controlled", () => {
  test("falls back to English when no usable language remains", () => {
    for (const language of ["*", "en_US", "en--US", "en_US,*;q=0.8", ""]) {
      for (const pathname of ["/", "/missing-page"]) {
        expectRewrite(
          proxy(request(pathname, { "accept-language": language })),
          pathname === "/" ? "/en-US" : `/en-US${pathname}`,
        );
      }
    }
    expectRewrite(proxy(request("/")), "/en-US");
  });

  test("keeps valid preferences before and after invalid tags", () => {
    for (const language of [
      "zh-CN,*;q=0.9",
      "*,zh-CN;q=0.9",
      "en_US,zh-CN;q=0.9,en-US;q=0.8",
      "en--US,zh-CN;q=0.9",
      "zh-Hans-CN,en_US;q=0.8",
    ]) {
      expectRewrite(
        proxy(request("/", { "accept-language": language })),
        "/zh-CN",
      );
    }
  });

  test("preserves quality ordering and excludes zero-quality preferences", () => {
    for (const [language, locale] of [
      ["en-US;q=0.5,*,zh-CN;q=0.9", "zh-CN"],
      ["zh-CN;q=0.5,en_US,en-US;q=0.9", "en-US"],
      ["en-US,zh-CN", "en-US"],
      ["zh-CN,en-US", "zh-CN"],
      ["zh-CN;q=0,en_US,en-US;q=0.5", "en-US"],
    ]) {
      expectRewrite(
        proxy(request("/", { "accept-language": language })),
        `/${locale}`,
      );
    }
  });

  test("valid private-use and Unicode extensions do not break matching", () => {
    for (const [language, locale] of [
      ["en-x-u-ca", "en-US"],
      ["zh-x-u-ca-chinese", "zh-CN"],
      ["en-u-ca-gregory-x-u-ab", "en-US"],
      ["zh-CN-u-ca-chinese", "zh-CN"],
      ["en-US-u-nu-latn;q=0.5,zh-x-u-ca-chinese;q=0.9", "zh-CN"],
    ]) {
      expectRewrite(proxy(request("/", { "accept-language": language })), `/${locale}`);
    }
  });

  test("keeps a supported locale cookie authoritative", () => {
    for (const language of ["*", "en_US", "en-US"]) {
      expectRewrite(
        proxy(request("/blog?view=all", {
          "accept-language": language,
          cookie: "locale=zh-CN",
        })),
        "/zh-CN/blog?view=all",
      );
    }
    expectRewrite(
      proxy(request("/", {
        "accept-language": "en_US,zh-CN;q=0.8",
        cookie: "locale=invalid",
      })),
      "/zh-CN",
    );
  });

  test("keeps explicit locale paths authoritative and cacheable", () => {
    const response = proxy(request("/en-US/blog", {
      "accept-language": "*",
      cookie: "locale=zh-CN",
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.headers.get("x-middleware-rewrite"), null);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("cache-control"), null);
  });

  test("preserves Markdown rewriting for fallback, cookie, and explicit locale", () => {
    for (const [pathname, cookie, expected] of [
      ["/blog", "", "/en-US/markdown/blog"],
      ["/blog", "locale=zh-CN", "/zh-CN/markdown/blog"],
      ["/en-US/blog", "locale=zh-CN", "/en-US/markdown/blog"],
    ]) {
      expectRewrite(
        proxy(request(pathname, {
          "accept-language": "*",
          accept: "text/markdown",
          cookie,
        })),
        expected,
      );
    }
  });

  test("continues bypassing language negotiation for API requests", () => {
    const response = proxy(request("/api/healthz", { "accept-language": "*" }));
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.headers.get("x-middleware-rewrite"), null);
  });
});
