import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import http from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Use an explicit request path, rather than fetch/URL normalization, so malformed
// wire encodings reach the same production request validation as the fuzz input.
export function request(baseUrl, path, method = "GET", headers = {}) {
  const target = new URL(baseUrl);
  assert.equal(target.protocol, "http:", "Use a local HTTP production server");
  assert.ok(["127.0.0.1", "[::1]"].includes(target.hostname), "Only literal loopback addresses are accepted");
  assert.equal(target.username + target.password + target.search + target.hash, "");
  assert.equal(target.pathname, "/", "The base URL must not include a path");
  assert.ok(path.startsWith("/") && !/[\r\n]/.test(path));
  return new Promise((resolveRequest, reject) => {
    const req = http.request({
      hostname: target.hostname === "[::1]" ? "::1" : target.hostname,
      port: target.port,
      path,
      method,
      headers: { accept: "text/html", "accept-language": "en-US", ...headers },
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on("data", (chunk) => {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) {
          req.destroy(new Error("Response exceeded the 2 MiB test limit"));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => resolveRequest({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
      res.on("error", reject);
    });
    req.setTimeout(10_000, () => req.destroy(new Error("Request exceeded 10 seconds")));
    req.on("error", reject);
    req.end();
  });
}

export async function runBlogPercentHttp({ baseUrl, existingPosts = [], fixture = false }) {
  const started = Date.now();
  const report = { profile: fixture ? "framework-fixture" : "site", requests: 0, assertions: 0, failures: [], cacheControls: [] };
  const check = async (label, action) => {
    try {
      await action();
    } catch (error) {
      report.failures.push({ label, message: error.message });
    }
  };
  const send = async (...args) => {
    report.requests += 1;
    return request(baseUrl, ...args);
  };
  const equal = (actual, expected, message = "Unexpected value") => {
    report.assertions += 1;
    assert.equal(actual, expected, message);
  };
  const ok = (value, message = "Expected a truthy value") => {
    report.assertions += 1;
    assert.ok(value, message);
  };
  const prefixes = ["/en-US", "/zh-CN", ""];
  const validMissing = ["%25", "100%25", "%25GG", "%25FF", "%2525", "%E4%B8%AD%E6%96%87", "%F0%9F%98%80"];
  const malformed = ["%", "%0", "%GG", "%FF", "%C0%AF", "%00", "%0D%0A", "%7F", "%C2%80"];
  for (const [tokens, expected] of [[validMissing, 404], ...(fixture ? [] : [[malformed, 400]])]) {
    for (const prefix of prefixes) {
      for (let position = 0; position < 4; position += 1) {
        for (const token of tokens) {
          const params = ["2026", "01", "01", "missing-percent-regression-post"];
          params[position] = token;
          const path = `${prefix}/blog/${params.join("/")}`;
          for (const method of ["GET", "HEAD", "POST"]) {
            await check(`${method} ${path}`, async () => {
              const response = await send(path, method);
              equal(response.status, expected, "Unexpected HTTP status");
              if (method === "HEAD") equal(response.body, "", "HEAD must not return a body");
              if (expected === 400) equal(response.headers["cache-control"], "no-store, max-age=0");
            });
          }
        }
      }
    }
  }

  const controls = [...existingPosts];
  if (fixture) {
    for (const prefix of prefixes) {
      for (const slug of ["cached-post", "on-demand-post", "%", "100%", "%GG", "%FF", "%25", "中文", "😀"]) {
        controls.push(`${prefix}/blog/2025/01/02/${encodeURIComponent(slug)}`);
      }
    }
  }
  for (const path of controls) {
    await check(`cached existing post ${path}`, async () => {
      const first = await send(path);
      equal(first.status, 200);
      if (fixture && !path.startsWith("/blog/")) {
        equal(first.headers["x-nextjs-cache"], path.endsWith("/cached-post") ? "HIT" : "MISS", "Prerendered and on-demand posts must retain their cache behavior");
      }
      const second = await send(path);
      equal(second.status, 200);
      equal(createHash("sha256").update(second.body).digest("hex"), createHash("sha256").update(first.body).digest("hex"), "Repeated static responses must be identical");
      equal(second.headers["cache-control"], first.headers["cache-control"], "Static cache policy changed between requests");
      ok(/(?:^|,)\s*s-maxage=[1-9][0-9]*(?:,|$)/.test(second.headers["cache-control"] ?? ""), "Expected shared static caching");
      equal(second.headers["x-nextjs-cache"], "HIT", "Second request must use the static response cache");
      const head = await send(path, "HEAD");
      equal(head.status, 200);
      equal(head.body, "");
      equal(head.headers["cache-control"], second.headers["cache-control"]);
      if (second.headers.etag) {
        const conditional = await send(path, "GET", { "if-none-match": second.headers.etag });
        equal(conditional.status, 304, "Existing static ETags must remain valid");
        equal(conditional.body, "");
      }
      if (fixture) {
        const segments = path.split("/");
        const expected = { lang: path.startsWith("/zh-CN/") ? "zh-CN" : "en-US", slugOrYear: "2025", month: "01", day: "02", slug: segments.at(-1) };
        const expectedHex = Buffer.from(JSON.stringify(expected)).toString("hex");
        ok(second.body.includes(`data-params="${expectedHex}"`), "Encoded render params must preserve the baseline representation");
        const logicalSlugHex = Buffer.from(decodeURIComponent(segments.at(-1))).toString("hex");
        ok(second.body.includes(`data-slug="${logicalSlugHex}"`), "The content lookup must preserve the literal percent or Unicode slug");
      }
      report.cacheControls.push({ path, firstCache: first.headers["x-nextjs-cache"], cacheControl: second.headers["cache-control"], cache: second.headers["x-nextjs-cache"] });
    });
  }
  report.durationMs = Date.now() - started;
  report.passed = report.failures.length === 0;
  return report;
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = { existingPosts: [] };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--base-url") options.baseUrl = args[++index];
    else if (args[index] === "--existing-post") options.existingPosts.push(args[++index]);
    else throw new Error(`Unknown argument: ${args[index]}`);
  }
  assert.ok(options.baseUrl, "Usage: node scripts/fuzz-regressions/blog-percent-http.mjs --base-url http://127.0.0.1:3000 [--existing-post /en-US/blog/YYYY/MM/DD/slug]");
  const report = await runBlogPercentHttp(options);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
