import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy.ts";

function request(path, { method = "GET", headers = {} } = {}) {
  return new NextRequest(`https://techzjc.com${path}`, {
    method,
    headers: { host: "techzjc.com", "accept-language": "en-US", ...headers },
  });
}

const actionHeaders = {
  "next-action": "cachefn",
  "content-type": "text/x-component",
  accept: "text/x-component",
};

test("unsupported action POSTs return an empty, uncacheable rejection before page rendering", async () => {
  // Cover both wire URLs and the normalized pathname delivered to Proxy.
  for (const path of ["/en-US.rsc", "/en-US", "/zh-CN", "/blog", "/en-US/blog?_rsc=test"]) {
    for (const action of ["cachefn", "", "0".repeat(40)]) {
      const response = proxy(request(path, {
        method: "POST",
        headers: { ...actionHeaders, "next-action": action, rsc: "1" },
      }));
      assert.equal(response.status, 405, `${path}: ${action}`);
      assert.equal(response.headers.get("allow"), "GET, HEAD");
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("x-middleware-rewrite"), null);
      assert.equal(response.headers.get("x-middleware-next"), null);
      assert.equal(await response.text(), "");
    }
  }
});

test("HTML, RSC navigation, and prefetch GET/HEAD requests retain normal routing", () => {
  for (const method of ["GET", "HEAD"]) {
    for (const headers of [
      { accept: "text/html" },
      { accept: "text/x-component", rsc: "1" },
      { accept: "text/x-component", rsc: "1", "next-router-prefetch": "1" },
    ]) {
      const response = proxy(request("/en-US?_rsc=test", { method, headers }));
      assert.equal(response.headers.get("x-middleware-next"), "1");
      assert.equal(response.headers.get("x-middleware-rewrite"), null);
      assert.equal(response.headers.get("cache-control"), null);
    }
    const response = proxy(request("/blog?_rsc=test", {
      method,
      headers: { accept: "text/x-component", rsc: "1" },
    }));
    assert.equal(response.headers.get("x-middleware-rewrite"), "https://techzjc.com/en-US/blog?_rsc=test");
  }
});

test("API POSTs remain exempt even when an action header is present", () => {
  for (const path of ["/api/security/navigation", "/api/security/csp-report"]) {
    for (const headers of [{}, actionHeaders]) {
      const response = proxy(request(path, { method: "POST", headers }));
      assert.equal(response.headers.get("x-middleware-next"), "1");
      assert.equal(response.headers.get("x-middleware-rewrite"), null);
      assert.equal(response.headers.get("allow"), null);
    }
  }
});

test("the FC invoke POST keeps its existing exemption", () => {
  const previous = process.env.IN_FC;
  process.env.IN_FC = "true";
  try {
    const response = proxy(request("/invoke", { method: "POST", headers: actionHeaders }));
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.headers.get("x-middleware-rewrite"), null);
  } finally {
    if (previous === undefined) delete process.env.IN_FC;
    else process.env.IN_FC = previous;
  }
});

test("ordinary page POSTs and Markdown GET negotiation remain unchanged", () => {
  const ordinaryPost = proxy(request("/en-US", { method: "POST" }));
  assert.equal(ordinaryPost.headers.get("x-middleware-next"), "1");
  const markdown = proxy(request("/en-US", { headers: { accept: "text/markdown" } }));
  assert.equal(markdown.headers.get("x-middleware-rewrite"), "https://techzjc.com/en-US/markdown");
});

test("path validation and scanner routing still take precedence over action rejection", () => {
  const malformed = proxy(request("/en-US/%FF", { method: "POST", headers: actionHeaders }));
  assert.equal(malformed.status, 400);
  for (const path of ["/.env", "/wp-admin"]) {
    const response = proxy(request(path, { method: "POST", headers: actionHeaders }));
    assert.equal(response.headers.get("x-middleware-rewrite"), "https://techzjc.com/scanner-404");
  }
});
