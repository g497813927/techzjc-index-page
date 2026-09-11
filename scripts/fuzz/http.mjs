// Bounded, deterministic HTTP fuzzing. Only connects to a literal loopback IP.
// Start an isolated production server with test credentials and telemetry off.
// node scripts/fuzz/http.mjs --base-url http://127.0.0.1:3219 --summary-only
import http from "node:http";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: {
  "base-url": { type: "string", default: "http://127.0.0.1:3219" },
  seed: { type: "string", default: "20260910" },
  cases: { type: "string", default: "800" },
  output: { type: "string" },
  "summary-only": { type: "boolean", default: false },
} });
const base = new URL(values["base-url"]);
if (base.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(base.hostname) || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
  throw new Error("Use a plain HTTP loopback origin for an isolated test server.");
}
const seed = Number(values.seed);
const randomCases = Number(values.cases);
if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff || !Number.isInteger(randomCases) || randomCases < 0 || randomCases > 5000) {
  throw new Error("seed must be 1..4294967295; cases must be 0..5000.");
}
let state = seed >>> 0;
function random(n) { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % n; }
const pick = (items) => items[random(items.length)];
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWMQVDIWVDJmgFAACq4BmbwhqwsAAAAASUVORK5CYII=";
const query = (path, params) => `${path}?${new URLSearchParams(params)}`;
const cases = [];
function add(group, path, options = {}) { cases.push({ id: cases.length, group, path, ...options }); }
const languages = ["", "en-US", "zh-CN", "fr-FR", "*", "en_US", "i-klingon", "x-private", "en-", "a", "0", "en-US,*;q=0.5", "zh-CN;q=1,en-US;q=0.5", "en-US;q=NaN", ";", "-", "en--US", "en-US;q=0", "../../", "a".repeat(256)];
const paths = ["/", "/en-US", "/zh-CN", "/blog", "/en-US/blog", "/en-US/markdown/blog", "/zh-CN/markdown/blog", "/en-US/markdown/blog/2026", "/en-US/markdown/blog/2026/01", "/en-US/markdown/blog/2026/01/23", "/en-US/blog/2026/01/23/missing", "/en-US/markdown/blog/2026/01/23/missing", "/scanner-404", "/missing-fuzz-route", "/.env", "/.git/config", "/wp-admin", "/test.php", "/%", "/%FF", "/%00", "/en-US/blog/%25", "/en-US/markdown/blog/%25", "/en-US/markdown/blog/2026/%0A", "/en-US/markdown/blog/2026/%E4%B8%AD", "/en-US/markdown/blog/2026/01/%E4%B8%AD", "/en-US/markdown/blog/2026/99/99/missing", "/en-US/markdown/blog/2026/01/23/%252e%252e%252fmissing", "/en-US/markdown/blog/2026/01/23/%2e%2e%2fmissing", "/en-US/markdown/blog/2026/01/23/%2525", "/en-US/markdown/blog/2026/01/23/%5c", "/en-US/markdown/blog/2026/01/23/%3Cscript%3Efuzz%3C%2Fscript%3E", "/en-US/markdown/blog/2026/01/23/" + "a".repeat(1024)];
const validEvent = { version: 1, action: "blocked", trigger: "link", source: { protocol: "https:", hostname: "techzjc.com" }, destination: { protocol: "https:", hostname: "example.invalid" } };
const bodies = ["", "{", "null", "true", "0", "\"x\"", "[]", "{}", "[null]", "[{}]", "{\"__proto__\":{\"polluted\":true}}", JSON.stringify(validEvent), JSON.stringify({ ...validEvent, source: [] }), JSON.stringify({ ...validEvent, version: "1" }), JSON.stringify({ "csp-report": { "blocked-uri": "javascript:fuzz", "document-uri": "https://example.invalid/private?secret=fuzz#fragment" } }), "[".repeat(128) + "0" + "]".repeat(128)];
const baseline = [
  { path: "/api/healthz", expected: [200] },
  { path: "/.env", expected: [404] },
  { path: "/en-US", expected: [200] },
  { path: "/en-US/markdown/blog", expected: [200] },
  { path: "/en-US/markdown/blog", headers: { accept: "text/markdown" }, expected: [200] },
  { path: query("/en-US/convert", { imageUrl: png }), expected: [200] },
  { path: query("/en-US/opengraph-image", { background_image: png, width: "64", height: "64", title: "Fuzz" }), expected: [200] },
  { path: query("/en-US/sharable-card", { background_image: png, quotation: "Fuzz", link: "https://example.invalid" }), expected: [200] },
  { path: "/api/security/navigation", method: "POST", body: JSON.stringify(validEvent), headers: { origin: "http://techzjc.com" }, expected: [204] },
  { path: "/api/security/csp-report", method: "POST", body: "{\"csp-report\":{}}", expected: [204] },
];
for (const lang of languages) for (const path of ["/", "/missing-fuzz-route", "/en-US", "/.env"]) add("locale", path, { headers: { "accept-language": lang } });
for (const path of paths) for (const accept of ["text/html", "text/markdown"]) add("path", path, { headers: { accept } });
for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE"]) for (const path of ["/", "/.env", "/api/healthz", "/en-US/convert"]) add("method", path, { method });
for (const host of ["untrusted.invalid", "techzjc.com.untrusted.invalid", "techzjc.com@untrusted.invalid", "https://techzjc.com", "techzjc.com:0", "techzjc.com:65536"]) add("host", "/api/healthz", { headers: { "x-forwarded-host": host }, expected: [404] });
for (const path of ["/api/security/navigation", "/api/security/csp-report"]) {
  for (const body of bodies) add("json", path, { method: "POST", body, headers: { origin: "http://techzjc.com" } });
  const max = path.endsWith("navigation") ? 12000 : 24000;
  for (const n of [max - 1, max, max + 1]) for (const chunked of [false, true]) add("body-limit", path, { method: "POST", body: "x".repeat(n), chunked, headers: { origin: "http://techzjc.com" }, expected: [n > max ? 413 : 400] });
  add("body-limit", path, { method: "POST", body: "中".repeat(Math.ceil(max / 3) + 1), chunked: true, headers: { origin: "http://techzjc.com" }, expected: [413] });
}
for (const origin of ["https://untrusted.invalid", "null", "", "http://techzjc.com:9999", "https://techzjc.com", "http://techzjc.com.untrusted.invalid"]) add("origin", "/api/security/navigation", { method: "POST", body: JSON.stringify(validEvent), headers: { origin }, expected: [403] });
for (const auth of ["", "Bearer", "Basic fuzz", "Bearer wrong", "Bearer local-fuzz-secret-extra"]) add("cron-auth", "/api/cron/sentry-monitor", { headers: { authorization: auth }, expected: [401] });
const images = ["", "not-a-url", "file:///fuzz-canary-not-present", "http://127.0.0.1/", "http://169.254.169.254/", "https://techzjc.com.untrusted.invalid/test.png", "https://techzjc.com@untrusted.invalid/test.png", "https://techzjc.com:444/test.png", "data:image/png;base64,", "data:image/png;base64,AA==", "data:image/jpeg;base64,SGVsbG8=", "data:image/png;base64,%%%", "data:image/svg+xml;base64,PHN2Zy8+", "data:image/gif;base64,R0lGODlh", png];
for (const imageUrl of images) add("image-convert", query("/en-US/convert", { imageUrl }), { expected: !imageUrl.startsWith("data:image/") ? [400] : imageUrl === png ? [200] : undefined });
for (const width of ["", "abc", "NaN", "Infinity", "-1", "0", "1", "1.5", "64", "64junk", "1e2", "0x40"]) add("image-dimensions", query("/en-US/opengraph-image", { background_image: png, title: "Fuzz", width, height: "64" }));
for (const height of ["", "abc", "-1", "0", "1", "64junk"]) add("image-dimensions", query("/en-US/opengraph-image", { background_image: png, title: "Fuzz", width: "64", height }));
for (const link of ["", "fuzz", "javascript:fuzz", "x".repeat(4096)]) add("card-link", query("/en-US/sharable-card", { background_image: png, quotation: "Fuzz", link }));
for (const background_image of ["data:image/png;base64,", "data:image/png;base64,AA==", "data:image/png;base64,%%%", "data:image/svg+xml;base64,PHN2Zy8+"]) for (const route of ["opengraph-image", "sharable-card"]) add("image-background", query(`/en-US/${route}`, { background_image, width: "64", height: "64", quotation: "Fuzz", link: "https://example.invalid" }));
const fragments = ["%", "%00", "%FF", "%25", "%2525", "%2e%2e%2f", "%252e%252e%252f", "%5c", "%0D%0A", "%E4%B8%AD", "%F0%9F%98%80", "null", "0000", "9999", "99", "__proto__", "constructor", "a".repeat(128)];
for (let i = 0; i < randomCases; i++) {
  switch (random(4)) {
    case 0: add("generated-locale", pick(["/", "/blog", "/missing-fuzz-route"]), { headers: { "accept-language": pick(languages) + pick(["", "," + pick(languages), ";q=" + pick(["1", "0", "-1", "2", "bogus"])]) } }); break;
    case 1: add("generated-path", pick(["/en-US/markdown/blog/", "/zh-CN/markdown/blog/", "/en-US/blog/"]) + Array.from({ length: 1 + random(4) }, () => pick(fragments)).join("/"), { headers: { accept: pick(["text/html", "text/markdown"]) } }); break;
    case 2: {
      let body = pick(bodies);
      if (random(2)) body = body.slice(0, random(body.length + 1)) + pick(["\u0000", "{", "}", "\"", "中", "false", " "]);
      add("generated-json", pick(["/api/security/navigation", "/api/security/csp-report"]), { method: "POST", body, chunked: random(2) === 0, headers: { origin: "http://techzjc.com" } }); break;
    }
    case 3: add("generated-headers", pick(["/api/healthz", "/.env", "/en-US/markdown/blog"]), { headers: { cookie: `locale=${pick(["en-US", "zh-CN", "%", "__proto__", "../../", "%00", ""])}; fuzz=${pick(fragments)}`, "x-forwarded-for": pick(["127.0.0.1", "unknown", "::1", "999.999.999.999", "1.2.3.4, 5.6.7.8"]), accept: pick(["text/markdown", "*/*", "text/html", "text/markdown;q=0,text/html;q=1"]) } }); break;
  }
}

// Missing dates keep these oracles independent of externally synchronized posts.
// Mutate each full-route parameter: the original crash occurs before page code.
for (const prefix of ["/en-US", "/zh-CN", ""]) {
  for (let position = 0; position < 4; position++) {
    for (const [tokens, status] of [
      [["%25", "100%25", "%25GG", "%25FF", "%2525", "%E4%B8%AD", "%F0%9F%98%80"], 404],
      [["%", "%0", "%GG", "%FF", "%C0%AF", "%00", "%0D%0A", "%7F", "%C2%80"], 400],
    ]) {
      for (const token of tokens) {
        const params = ["0000", "00", "00", "missing-percent-regression-post"];
        params[position] = token;
        for (const method of ["GET", "HEAD", "POST"]) {
          add(status === 404 ? "blog-percent-oracle" : "blog-malformed-oracle", `${prefix}/blog/${params.join("/")}`, {
            method, expected: [status], ...(method === "HEAD" ? { emptyBody: true } : {}),
          });
        }
      }
    }
  }
}

async function request(test) {
  const started = performance.now();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; clearTimeout(deadline); resolve({ ...result, ms: Math.round(performance.now() - started) }); } };
    const headers = { host: base.host, "accept-language": "en-US", "user-agent": "site-index-local-fuzz/1", ...test.headers };
    if (headers.origin === "http://techzjc.com") headers.origin = base.origin;
    if (test.body !== undefined) {
      headers["content-type"] = "application/json";
      if (!test.chunked) headers["content-length"] = Buffer.byteLength(test.body);
    }
    const req = http.request({ hostname: base.hostname.replace(/^\[|\]$/g, ""), port: base.port || 80, method: test.method || "GET", path: test.path, headers, agent: false }, (res) => {
      const chunks = [];
      let bytes = 0;
      res.on("data", (chunk) => { if (bytes < 512) chunks.push(chunk.subarray(0, 512 - bytes)); bytes += chunk.length; if (bytes > 4 * 1024 * 1024) { finish({ status: res.statusCode, error: "response exceeded 4 MiB" }); req.destroy(); } });
      res.on("end", () => finish({ status: res.statusCode, bytes, type: res.headers["content-type"], location: res.headers.location, sample: /image\//.test(res.headers["content-type"] || "") ? "[image]" : Buffer.concat(chunks).toString("utf8") }));
      res.on("error", (error) => finish({ status: res.statusCode, error: error.message }));
    });
    const deadline = setTimeout(() => { finish({ error: "15 second deadline exceeded" }); req.destroy(); }, 15000);
    req.on("upgrade", (res, socket) => { finish({ status: res.statusCode, error: "unexpected protocol upgrade" }); socket.destroy(); });
    req.on("error", (error) => finish({ error: error.message }));
    if (test.chunked && test.body !== undefined) {
      const data = Buffer.from(test.body);
      // Byte boundaries intentionally split multibyte UTF-8 sequences.
      for (let i = 0; i < data.length; i += 97) req.write(data.subarray(i, i + 97));
    } else if (test.body !== undefined) req.write(test.body);
    req.end();
  });
}
const started = new Date().toISOString();
const startedClock = performance.now();
const failures = [];
const results = [];
const groups = {};
const baselineResults = [];
let completed = 0;

function reasonsFor(test, result) {
  const reasons = [];
  if (result.error) reasons.push(result.error);
  if (result.status >= 500) reasons.push(`server error ${result.status}`);
  if (test.expected && !test.expected.includes(result.status)) reasons.push(`expected ${test.expected}, got ${result.status}`);
  if (test.emptyBody && result.bytes !== 0) reasons.push("Expected an empty response body");
  if (test.expectedLang && !result.sample?.includes(`<html lang="${test.expectedLang}"`)) reasons.push(`expected rendered HTML language ${test.expectedLang}`);
  return reasons;
}

for (const test of baseline) {
  const result = await request(test);
  const reasons = reasonsFor(test, result);
  baselineResults.push({ ...test, ...result, passed: reasons.length === 0 });
  if (reasons.length) {
    failures.push({ test: { group: "baseline", ...test }, result, reasons });
    break;
  }
}
if (!failures.length) {
  let next = 0;
  await Promise.all(Array.from({ length: 1 }, async () => {
    while (next < cases.length) {
      const test = cases[next++];
      const result = await request(test);
      const group = groups[test.group] ??= { count: 0, statuses: {}, maxMs: 0 };
      group.count++;
      group.maxMs = Math.max(group.maxMs, result.ms);
      const key = result.error ? "transport-error" : String(result.status);
      group.statuses[key] = (group.statuses[key] || 0) + 1;
      const reasons = reasonsFor(test, result);
      if (reasons.length) failures.push({ test, result, reasons });
      if (!values["summary-only"]) results.push({ id: test.id, group: test.group, ...result });
      completed++;
    }
  }));
}
const healthAfter = await request({ path: "/api/healthz" });
const overallPassed = completed === cases.length && completed > 0 && failures.length === 0 && healthAfter.status === 200 && !healthAfter.error;
const report = {
  suite: "http",
  seed, randomCases: randomCases, baseUrl: base.origin,
  started, finished: new Date().toISOString(), elapsedMs: Math.round(performance.now() - startedClock),
  total: completed, failed: failures.length, overallPassed, groups, baselineResults, healthAfter, failures,
  ...(!values["summary-only"] ? { results } : {}),
};
const serialized = JSON.stringify(report, null, 2) + "\n";
if (values.output) await writeFile(values.output, serialized);
process.stdout.write(serialized);
if (!overallPassed) process.exitCode = 1;
