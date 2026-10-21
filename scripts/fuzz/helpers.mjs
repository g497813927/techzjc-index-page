#!/usr/bin/env node
// Deterministic, offline property fuzzing. Reproduce with the seed/case count
// printed in the JSON summary. A failed invariant sets exit code 1.
// Usage: node scripts/fuzz/helpers.mjs --seed 1592594996 --cases 2500
// totalCases includes each family's fixed corpus. propertyChecks counts property
// evaluations, each of which can assert several related conditions.
import assert from "node:assert/strict";
import { register } from "node:module";
import { isIP } from "node:net";
import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = {};
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--summary-only") continue; // Reports already bound failure examples.
  if (argument === "--help") {
    console.log("Usage: node scripts/fuzz/helpers.mjs [--seed N] [--cases N] [--output FILE]\nOptions also accept --name=value. Seed: 0..4294967295; cases per family: 1..20000 (default 2500).");
    process.exit(0);
  }
  const match = /^--(seed|cases|output)(?:=(.*))?$/.exec(argument);
  if (!match) throw new Error(`Unsupported argument: ${argument}`);
  const name = match[1];
  if (Object.hasOwn(args, name)) throw new Error(`Duplicate option: --${name}`);
  const value = match[2] ?? process.argv[++index];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
  if (name !== "output" && !/^\d+$/.test(value)) throw new Error(`${name} must be an integer`);
  args[name] = name === "output" ? value : Number(value);
}
const seed = args.seed ?? 1_592_594_996;
const cases = args.cases ?? 2_500;
if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
  throw new Error("seed must be an unsigned 32-bit integer");
}
if (!Number.isSafeInteger(cases) || cases < 1 || cases > 20_000) {
  throw new Error("cases must be in 1..20000");
}

register("../typescript-test-loader.mjs", import.meta.url);
const {
  calculateExternalLinkManifestUsableUntil,
  canonicalizeNavigationUrl,
  classifyNavigation,
  isAllowedApplicationHost,
  normalizeHostAuthority,
  normalizeHostHeader,
  redactNavigationUrl,
  shouldAdoptExternalLinkManifest,
  unwrapApiEnvelope,
  validateExternalLinkManifest,
} = await import("../../src/lib/browserSecurity.ts");
const { readLimitedRequestBody } = await import("../../src/lib/readLimitedRequestBody.ts");
const { expandIpv6, getClientIp, isTrustedCdnRequest, truncateIp, truncateIpv4 } =
  await import("../../src/app/scanner-404/route-logic.mjs");

let state = seed;
function random() {
  state = (state + 0x6d2b79f5) >>> 0;
  let value = state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
}
const integer = (maximum) => Math.floor(random() * maximum);
const pick = (values) => values[integer(values.length)];
const alphabet = [..."abcXYZ019.:/@\\?#%=-_ ,\t\r\n\0", "中", "💡", "\ud800"];
function noise(maximum = 48) {
  return Array.from({ length: integer(maximum + 1) }, () => pick(alphabet)).join("");
}
function mutate(value) {
  const at = integer(value.length + 1);
  switch (integer(5)) {
    case 0: return value.slice(0, at) + noise(8) + value.slice(at);
    case 1: return value.slice(0, at) + value.slice(at + 1);
    case 2: return value.toUpperCase();
    case 3: return value.slice(0, at) + pick(["%00", "%2f", "%5c", "..", "@", ":0", ":65536"]);
    default: return noise();
  }
}

const started = performance.now();
const families = {};
const failures = new Map();
let propertyChecks = 0;
let knownIpv6ZeroWidthCompression = 0;
function check(family, id, input, test) {
  propertyChecks += 1;
  try {
    test();
  } catch (error) {
    const entry = failures.get(id) ?? { id, family, count: 0, examples: [] };
    entry.count += 1;
    if (entry.examples.length < 3) {
      const serialized = JSON.stringify(input);
      const compactInput = serialized.length <= 4_096 ? input
        : { preview: serialized.slice(0, 4_096), omittedCharacters: serialized.length - 4_096 };
      entry.examples.push({ case: families[family], input: compactInput, message: error.message });
    }
    failures.set(id, entry);
  }
}
function begin(family) {
  families[family] = (families[family] ?? 0) + 1;
}

const currentUrl = "https://techzjc.com/en-US";
const safeProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);
const urlCorpus = [
  "/", "", "../secret?token=private#fragment", "//evil.example/path",
  "javascript:alert(1)", "JaVaScRiPt:\nalert(1)", "data:text/html,<script>1</script>",
  "file:///etc/passwd", "blob:https://techzjc.com/id", "mailto:private@example.com",
  "tel:+1234567890", "https://user:password@techzjc.com/", "https://techzjc.com@evil.example/",
  "https://evil.example\\@techzjc.com/", "https://techzjc.com.evil.example/",
  "https://test-cn.techzjc.com/", "https://techzjc.com.:443/", "https://techzjc.com../",
  "https://../", "http://[::1]:3000/", "https://example.com:65536/", "https://%00/",
  "https://外部.example/秘密?秘密=值#片段", "\0https://evil.example/",
];
for (let index = 0; index < cases + urlCorpus.length; index += 1) {
  begin("navigation");
  const raw = index < urlCorpus.length ? urlCorpus[index] : mutate(pick(urlCorpus));
  check("navigation", "navigation-security-and-redaction", raw, () => {
    const decision = classifyNavigation(raw, { currentUrl, trustedUrls: [raw] });
    let parsed;
    try { parsed = new URL(raw, currentUrl); } catch { /* invalid URL is expected */ }
    if (!parsed || !safeProtocols.has(parsed.protocol) || parsed.username || parsed.password) {
      assert.equal(decision.decision, "block");
    }
    const redacted = redactNavigationUrl(raw, currentUrl);
    assert.ok(["", "[redacted]"].includes(redacted.pathname));
    assert.deepEqual(redacted.queryKeys, []);
    assert.ok(redacted.hostname.length <= 253);
    assert.ok(redacted.protocol.length <= 16);
    if (parsed && !["http:", "https:"].includes(parsed.protocol)) assert.equal(redacted.hostname, "");
    const canonical = canonicalizeNavigationUrl(raw, currentUrl);
    if (canonical !== null) {
      const url = new URL(canonical);
      assert.ok(safeProtocols.has(url.protocol));
      assert.equal(url.username + url.password, "");
    }
  });
  check("navigation", "canonical-url-idempotence", raw, () => {
    const once = canonicalizeNavigationUrl(raw, currentUrl);
    if (once !== null) assert.equal(canonicalizeNavigationUrl(once), once);
  });
  const id = `${index}-${integer(1_000_000)}`;
  const trustedUrl = `https://external.example/Path/${id}?key=one&second=two#first`;
  check("navigation", "exact-url-allowlist-isolation", trustedUrl, () => {
    assert.equal(classifyNavigation(trustedUrl, { currentUrl, trustedUrls: [trustedUrl] }).decision, "allow");
    for (const changed of [
      trustedUrl.replace("#first", "#second"), trustedUrl.replace("key=one", "key=two"),
      trustedUrl.replace("/Path/", "/path/"), trustedUrl.replace("https:", "http:"),
      trustedUrl.replace("?key=one&second=two", "?second=two&key=one"),
    ]) {
      assert.equal(classifyNavigation(changed, { currentUrl, trustedUrls: [trustedUrl] }).decision, "confirm");
    }
  });
}

const hostCorpus = [
  "techzjc.com", "TECHZJC.com.:443", "test-cn.techzjc.com", "localhost:3000", "[::1]:3000",
  "https://techzjc.com", "techzjc.com/", "techzjc.com@evil.example", "techzjc.com,evil.example",
  "techzjc.com:0", "techzjc.com:65535", "techzjc.com:65536", "techzjc.com:00080",
  " techzjc.com", "techzjc.com\t", "techzjc.com../", "127.1", "0x7f000001", "2130706433",
];
for (let index = 0; index < cases + hostCorpus.length; index += 1) {
  begin("host-authorities");
  const raw = index < hostCorpus.length ? hostCorpus[index] : mutate(pick(hostCorpus));
  check("host-authorities", "host-parser-syntax-and-trust", raw, () => {
    const authority = normalizeHostAuthority(raw);
    const hostname = normalizeHostHeader(raw);
    if (/[\s/\\@?#,]/.test(raw)) assert.equal(authority, "");
    if (authority) {
      assert.equal(normalizeHostAuthority(authority), authority);
      const parsed = new URL(`http://${authority}`);
      assert.equal(parsed.username + parsed.password + parsed.search + parsed.hash, "");
      assert.equal(parsed.pathname, "/");
      assert.equal(parsed.hostname.replace(/\.$/, ""), hostname);
    } else assert.equal(hostname, "");
    if (isAllowedApplicationHost(raw, { NODE_ENV: "production" })) {
      assert.ok(["techzjc.com", "test-cn.techzjc.com"].includes(hostname));
    }
    assert.equal(isAllowedApplicationHost(`techzjc.com.${index}.evil.example`, { NODE_ENV: "production" }), false);
  });
}

const now = Date.parse("2026-09-10T12:00:00Z");
const baseManifest = () => ({
  schemaVersion: 1, revision: "fuzz-1", issuedAt: new Date(now - 60_000).toISOString(),
  servedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3_600_000).toISOString(),
  urls: ["https://external.example/safe?one=two#three"],
});
const invalidManifestMutations = [
  (m) => ({ ...m, schemaVersion: pick([null, "1", 0, 2, [], {}]) }),
  (m) => ({ ...m, revision: pick([null, "", " padded", "x".repeat(129), 1, []]) }),
  (m) => ({ ...m, expiresAt: new Date(now - integer(3_600_000)).toISOString() }),
  (m) => ({ ...m, issuedAt: new Date(now + 300_001 + integer(3_600_000)).toISOString() }),
  (m) => ({ ...m, servedAt: new Date(now - 900_001 - integer(3_600_000)).toISOString() }),
  (m) => ({ ...m, urls: pick([null, {}, 1, "https://external.example/"]) }),
  (m) => ({ ...m, urls: [pick(["javascript:alert(1)", "https://u:p@example.com/", "", null, {}, 1])] }),
  (m) => ({ ...m, urls: ["https://example.com/" + "x".repeat(2_049)] }),
  (m) => ({ ...m, urls: Array(1_025).fill("https://external.example/") }),
  () => pick([null, [], 1, "x", true, {}]),
];
for (let index = 0; index < cases; index += 1) {
  begin("manifest-documents");
  const valid = integer(4) === 0;
  const manifest = valid ? baseManifest() : pick(invalidManifestMutations)(baseManifest());
  check("manifest-documents", "manifest-fail-closed", { valid, manifest }, () => {
    const decoded = JSON.parse(JSON.stringify(manifest));
    const result = validateExternalLinkManifest(decoded, { now, expectedRevision: "fuzz-1" });
    assert.equal(result.ok, valid);
    if (result.ok) {
      assert.ok(result.urls.size <= 1_024);
      for (const url of result.urls) assert.equal(canonicalizeNavigationUrl(url), url);
    }
    assert.equal(validateExternalLinkManifest(baseManifest(), { now, expectedRevision: `wrong-${index}` }).ok, false);
    assert.equal(validateExternalLinkManifest(baseManifest(), { now, maxEntries: 0 }).ok, false);
    assert.equal(unwrapApiEnvelope({ code: 0, message: "", data: decoded }), decoded);
    assert.equal(unwrapApiEnvelope({ code: 1, message: "", data: decoded }), null);
  });
}

for (let index = 0; index < cases; index += 1) {
  begin("manifest-cache");
  const issuedAtMs = now - integer(600_000);
  const current = { revision: "current", issuedAtMs, servedAtMs: now, urls: new Set(["https://external.example/"]) };
  const delta = 1 + integer(60_000);
  const ttl = integer(1_800_000);
  check("manifest-cache", "manifest-monotonicity-and-expiry", { issuedAtMs, delta, ttl }, () => {
    assert.equal(shouldAdoptExternalLinkManifest({ ...current, issuedAtMs: issuedAtMs - delta }, current), false);
    assert.equal(shouldAdoptExternalLinkManifest({ ...current, revision: "other" }, current), false);
    assert.equal(shouldAdoptExternalLinkManifest({ ...current, servedAtMs: now - delta }, current), false);
    assert.equal(shouldAdoptExternalLinkManifest({ ...current, urls: new Set(["https://other.example/"]) }, current), false);
    assert.equal(shouldAdoptExternalLinkManifest({ ...current, servedAtMs: now + delta }, current), true);
    const until = calculateExternalLinkManifestUsableUntil(now + delta, now - delta, now, ttl);
    assert.ok(until <= now + delta && until <= now - delta + 900_000 && until <= now + ttl);
    assert.ok(Number.isNaN(calculateExternalLinkManifestUsableUntil(now, now, now, -delta)));
  });
}

const ipCorpus = ["", "unknown", "0.0.0.0", "255.255.255.255", "256.0.0.0", "01.2.3.4",
  "::", "::1", "2001:db8::abcd", "::ffff:203.0.113.47", "1:2:3:4:5:6:7:8::", "1::2::3", "fe80::1%eth0"];
for (let index = 0; index < cases + ipCorpus.length; index += 1) {
  begin("ip-addresses");
  const octets = Array.from({ length: 4 }, () => integer(256));
  const ipv4 = octets.join(".");
  const words = Array.from({ length: 8 }, () => integer(65_536).toString(16));
  const leftCount = integer(8);
  const compressedCount = 1 + integer(8 - leftCount);
  const ipv6 = `${words.slice(0, leftCount).join(":")}::${words.slice(leftCount + compressedCount).join(":")}`;
  const raw = index < ipCorpus.length ? ipCorpus[index] : mutate(pick([ipv4, ipv6, ...ipCorpus]));
  check("ip-addresses", "valid-ip-network-masking", { ipv4, ipv6 }, () => {
    assert.equal(isIP(ipv4), 4);
    assert.equal(truncateIpv4(ipv4), `${octets.slice(0, 3).join(".")}.0/24`);
    assert.equal(truncateIp(`::ffff:${ipv4}`), `${octets.slice(0, 3).join(".")}.0/24`);
    assert.equal(isIP(ipv6), 6);
    assert.ok(expandIpv6(ipv6));
    const expandedExpected = [
      ...words.slice(0, leftCount), ...Array(compressedCount).fill("0"), ...words.slice(leftCount + compressedCount),
    ];
    assert.deepEqual(expandIpv6(ipv6), expandedExpected);
    assert.equal(truncateIp(ipv6), `${expandedExpected[0]}:${expandedExpected[1]}::/32`);
    assert.equal(truncateIp(`${ipv6}%eth0`), truncateIp(ipv6));
  });
  check("ip-addresses", "malformed-ip-never-leaks-raw-address", raw, () => {
    const output = truncateIp(raw);
    assert.match(output, /^(?:unknown|invalid-ip|\d{1,3}\.\d{1,3}\.\d{1,3}\.0\/24|[a-f0-9]{1,4}:[a-f0-9]{1,4}::\/32)$/);
    const withoutZone = raw.split("%")[0];
    if (truncateIpv4(raw) !== undefined) assert.equal(isIP(raw), 4);
    const expanded = expandIpv6(raw);
    if (expanded && isIP(withoutZone) !== 6) {
      // Existing scanner-404.test.mjs explicitly preserves this behavior.
      // Record its frequency without presenting it as a new regression.
      assert.equal(withoutZone.split("::").length, 2);
      assert.equal(withoutZone.split(":").filter(Boolean).length, 8);
      knownIpv6ZeroWidthCompression += 1;
    }
  });
  check("ip-addresses", "forwarding-header-trust-boundary", raw, () => {
    const invalidAuth = `${noise(32)}!`;
    const selected = getClientIp({ originAuth: invalidAuth, cdnOriginAuth: "fuzz-secret",
      aliCdnRealIp: ipv4, forwardedIp: raw, realIp: null });
    assert.equal(selected.source, "untrusted-header");
    assert.ok(selected.rawIp.length <= 128);
    assert.equal(selected.rawIp, raw.split(",")[0].trim().length > 128 ? "unknown" : raw.split(",")[0].trim() || "unknown");
    assert.equal(isTrustedCdnRequest(invalidAuth, "fuzz-secret"), false);
    assert.equal(isTrustedCdnRequest("", ""), false);
    assert.equal(isTrustedCdnRequest("fuzz-secret", "fuzz-secret"), true);
  });
}

for (let index = 0; index < cases; index += 1) {
  begin("streamed-bodies");
  const bytes = index % 3 === 0 ? new TextEncoder().encode(noise(256))
    : Uint8Array.from({ length: integer(513) }, () => integer(256));
  const maximumBytes = pick([0, bytes.length, Math.max(0, bytes.length - 1), bytes.length + integer(128)]);
  const declared = pick([null, "invalid", "-1", "0", String(bytes.length), String(maximumBytes + 1)]);
  const failStream = integer(12) === 0;
  let offset = 0;
  let canceled = false;
  let pullCount = 0;
  const chunks = [];
  while (offset < bytes.length) {
    const end = Math.min(bytes.length, offset + 1 + integer(32));
    chunks.push(bytes.slice(offset, end));
    offset = end;
  }
  const request = new Request("http://localhost/fuzz-only", {
    method: "POST", duplex: "half", headers: declared === null ? {} : { "content-length": declared },
    body: new ReadableStream({
      pull(controller) {
        if (failStream) { controller.error(new Error("intentional fuzz stream failure")); return; }
        if (pullCount < chunks.length) controller.enqueue(chunks[pullCount++]);
        else controller.close();
      },
      cancel() { canceled = true; },
    }, { highWaterMark: 0 }),
  });
  let result;
  let readFailed = false;
  let readError;
  try {
    result = await readLimitedRequestBody(request, maximumBytes);
  } catch (error) {
    readFailed = true;
    readError = error;
  }
  check("streamed-bodies", "stream-byte-limit-and-utf8", {
    bytes: Buffer.from(bytes).toString("hex"), maximumBytes, declared, failStream, chunkSizes: chunks.map((chunk) => chunk.length),
  }, () => {
    if (readFailed) throw new Error("readLimitedRequestBody unexpectedly threw", { cause: readError });
    const rejectedByHeader = Number.isFinite(Number(declared)) && Number(declared) > maximumBytes;
    if (rejectedByHeader) {
      assert.deepEqual(result, { ok: false, reason: "too-large" });
      assert.equal(pullCount, 0);
    } else if (failStream) assert.deepEqual(result, { ok: false, reason: "read-error" });
    else if (bytes.length > maximumBytes) {
      assert.deepEqual(result, { ok: false, reason: "too-large" });
      assert.equal(canceled, true);
    } else assert.deepEqual(result, { ok: true, text: new TextDecoder().decode(bytes) });
    assert.equal(request.body.locked, false);
  });
}

const unstableCanonical = failures.get("canonical-url-idempotence");
if (unstableCanonical) {
  let input = unstableCanonical.examples[0].input;
  const fails = (value) => {
    const once = canonicalizeNavigationUrl(value);
    return once !== null && canonicalizeNavigationUrl(once) !== once;
  };
  if (fails(input)) {
    for (let index = 0; index < input.length;) {
      const candidate = input.slice(0, index) + input.slice(index + 1);
      if (fails(candidate)) { input = candidate; index = 0; } else index += 1;
    }
    const once = canonicalizeNavigationUrl(input);
    unstableCanonical.minimized = { input, once, twice: canonicalizeNavigationUrl(once) };
  }
}

const failureList = [...failures.values()];
const report = {
  suite: "offline-input-helper-fuzz", seed, casesPerFamily: cases,
  reproduction: `node scripts/fuzz/helpers.mjs --seed ${seed} --cases ${cases}`,
  totalCases: Object.values(families).reduce((sum, count) => sum + count, 0), propertyChecks,
  families, elapsedMs: Math.round(performance.now() - started),
  knownBehavior: { zeroWidthIpv6CompressionAccepted: knownIpv6ZeroWidthCompression },
  failed: failureList.reduce((sum, failure) => sum + failure.count, 0),
  overallPassed: failures.size === 0,
  failures: failureList,
};
const serializedReport = JSON.stringify(report, null, 2) + "\n";
if (args.output) {
  const output = resolve(args.output);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, serializedReport);
}
process.stdout.write(serializedReport);
if (!report.overallPassed) process.exitCode = 1;
