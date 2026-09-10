import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy.ts";
import { hasValidPathEncoding } from "../../src/lib/requestPath.ts";

function request(path, accept = "text/html") {
  return new NextRequest(`https://techzjc.com${path}`, {
    headers: { host: "techzjc.com", "accept-language": "en-US", accept },
  });
}
const invalid = ["%", "%0", "%GG", "%FF", "%C0%AF", "%E4%B8", "%ED%A0%80", "%F4%90%80%80", "%00", "%0D%0A", "%7f"];

test("malformed and control-character paths fail before any rewrite", () => {
  for (const segment of invalid) {
    for (const prefix of ["/", "/api/", "/assets/", "/en-US/blog/", "/zh-CN/markdown/blog/2026/01/23/"]) {
      for (const accept of ["text/html", "text/markdown"]) {
        const response = proxy(request(`${prefix}${segment}`, accept));
        assert.equal(response.status, 400, `${prefix}${segment} ${accept}`);
        assert.equal(response.headers.get("x-middleware-rewrite"), null);
        assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
      }
    }
  }
});

test("valid Unicode, encoded percent and separators retain their original paths", () => {
  for (const segment of ["%25", "%2525", "%252e%252e%252f", "%2F", "%5C", "%E4%B8%AD", "%F0%9F%98%80", "hello-world"]) {
    const path = `/en-US/blog/${segment}`;
    assert.equal(hasValidPathEncoding(path), true, path);
    assert.equal(proxy(request(path)).headers.get("x-middleware-next"), "1");
    const markdown = proxy(request(path, "text/markdown"));
    assert.equal(new URL(markdown.headers.get("x-middleware-rewrite")).pathname, `/en-US/markdown/blog/${segment}`);
  }
});

test("the path check does not interpret query values or change locale routing", () => {
  const response = proxy(request("/?query=%FF&imageUrl=%00"));
  const destination = new URL(response.headers.get("x-middleware-rewrite"));
  assert.equal(destination.pathname, "/en-US");
  assert.equal(destination.search, "?query=%FF&imageUrl=%00");
  assert.equal(proxy(request("/api/healthz?query=%")).headers.get("x-middleware-next"), "1");
  assert.equal(proxy(request("/en-US")).headers.get("set-cookie"), null);
});
