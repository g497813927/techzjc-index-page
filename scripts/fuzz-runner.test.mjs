import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { childProcess, mergeBatch, nextSeed, parseOptions, stopChild, waitChild } from "./fuzz.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const runner = fileURLToPath(new URL("./fuzz.mjs", import.meta.url));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(predicate, message, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await pause(20);
  }
  assert.fail(message);
}

function emptySummary() {
  return { batches: 0, failed: 0, helperCases: 0, propertyChecks: 0, knownIpv6Behavior: 0,
    httpCases: 0, baselineChecks: 0, coverage: {} };
}

function helperReport() {
  return { totalCases: 5, propertyChecks: 8, failed: 0, overallPassed: true,
    knownBehavior: { zeroWidthIpv6CompressionAccepted: 1 }, families: { navigation: 2, streamed: 3 } };
}

function managed(t, args, options = {}) {
  const child = childProcess(args, options);
  t.after(() => stopChild(child, 100));
  return child;
}

async function outputDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), "fuzz-runner-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return join(directory, "reports");
}

test("duration and forever options have bounded defaults and reject ambiguous runs", () => {
  const defaults = parseOptions([]);
  assert.equal(defaults.durationMs, 60_000);
  assert.equal(defaults.suite, "all");
  assert.ok(defaults.seed >= 1 && defaults.seed <= 0xffffffff);
  assert.equal(parseOptions(["--duration", "15m"]).durationMs, 900_000);
  assert.equal(parseOptions(["--duration=1.5s"]).durationMs, 1500);
  assert.equal(parseOptions(["--duration", "2h"]).durationMs, 7_200_000);
  assert.equal(parseOptions(["--forever", "--suite", "helpers"]).durationMs, null);
  for (const args of [
    ["--forever", "--duration", "15m"], ["--duration", "0"], ["--duration=-1"],
    ["--duration", "forever"], ["--duration", "Infinity"], ["--duration", "2d"],
    ["--seed", "0"], ["--seed", "4294967296"], ["--cases", "0"],
    ["--cases", "3001"], ["--suite", "production"], ["--output", " "],
  ]) assert.throws(() => parseOptions(args), Error, args.join(" "));
});

test("replay seed progression is deterministic and remains nonzero", () => {
  assert.deepEqual([nextSeed(1), nextSeed(270369), nextSeed(67634689)], [270369, 67634689, 2647435461]);
  for (const initial of [1, 1592594996, 0xffffffff]) {
    let seed = initial;
    const seen = new Set();
    for (let index = 0; index < 10_000; index += 1) {
      seed = nextSeed(seed);
      assert.ok(Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff);
      assert.ok(!seen.has(seed), "Distinct batches should not repeat a seed");
      seen.add(seed);
    }
  }
});

test("batch reports accumulate helper properties, HTTP statuses, and findings", () => {
  const summary = emptySummary();
  mergeBatch(summary, "helpers", helperReport());
  mergeBatch(summary, "helpers", helperReport());
  mergeBatch(summary, "http", { total: 4, failed: 1, overallPassed: false,
    groups: { routes: { count: 4, statuses: { 400: 3, 500: 1 } } }, baselineResults: [{}, {}] });
  assert.deepEqual(summary, { batches: 3, failed: 1, helperCases: 10, propertyChecks: 16,
    knownIpv6Behavior: 2, httpCases: 4, baselineChecks: 2, coverage: {
      "helpers:navigation": { count: 4, statuses: {} },
      "helpers:streamed": { count: 6, statuses: {} },
      "http:routes": { count: 4, statuses: { 400: 3, 500: 1 } },
    } });
});

test("a failed HTTP baseline is retained even before generated cases begin", () => {
  const summary = emptySummary();
  mergeBatch(summary, "http", { total: 0, failed: 1, overallPassed: false,
    groups: {}, baselineResults: [{ path: "/api/healthz", status: 500, passed: false }] });
  assert.equal(summary.batches, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.baselineChecks, 1);
  assert.equal(summary.httpCases, 0);
  assert.deepEqual(summary.coverage, {});
});

test("malformed worker reports are rejected without counting incomplete work", () => {
  for (const report of [
    { ...helperReport(), totalCases: 0 }, { ...helperReport(), totalCases: NaN },
    { ...helperReport(), failed: -1 }, { ...helperReport(), failed: 1 },
    { ...helperReport(), overallPassed: "yes" }, { ...helperReport(), propertyChecks: 4 },
    { ...helperReport(), propertyChecks: 8.5 },
    { ...helperReport(), families: { navigation: NaN } },
    { ...helperReport(), knownBehavior: { zeroWidthIpv6CompressionAccepted: -1 } },
  ]) {
    const summary = emptySummary();
    assert.throws(() => mergeBatch(summary, "helpers", report), Error);
    assert.deepEqual(summary, emptySummary());
  }
  const summary = emptySummary();
  assert.throws(() => mergeBatch(summary, "http", { total: 1, failed: 0, overallPassed: true,
    groups: { routes: { count: 1, statuses: { 200: -1 } } } }), Error);
  assert.deepEqual(summary, emptySummary());
});

test("child output retains only the bounded tail", async (t) => {
  const processInfo = managed(t, ["-e", "process.stdout.write('x'.repeat(10000) + 'END')"], { limit: 64 });
  assert.equal(await waitChild(processInfo, "log fixture", 5000), 0);
  assert.equal(processInfo.log(), "x".repeat(61) + "END");
});

test("both HTTP workers accept bracketed IPv6 loopback and reach the server", { timeout: 15_000 }, async (t) => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ path: request.url, host: request.headers.host, address: request.socket.remoteAddress });
    response.writeHead(503, { "content-type": "text/plain", connection: "close" });
    response.end("Intentional unavailable baseline for IPv6 transport verification");
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "::1", () => { server.removeListener("error", reject); resolve(); });
    });
  } catch (error) {
    if (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL") {
      t.skip(`IPv6 loopback binding is unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const origin = `http://[::1]:${server.address().port}`;
  assert.equal(new URL(origin).hostname, "[::1]");
  for (const suite of ["http", "extended-http"]) {
    await t.test(suite, async (t) => {
      const start = requests.length;
      const worker = managed(t, [join(root, `scripts/fuzz/${suite}.mjs`), "--base-url", origin, "--seed", "1", "--cases", "0", "--summary-only"]);
      assert.equal(await waitChild(worker, `${suite} IPv6 baseline`, 5000), 1, worker.log());
      const report = JSON.parse(worker.log());
      assert.equal(report.suite, suite);
      assert.equal(report.baseUrl, origin);
      assert.equal(report.total, 0, "The intentionally failed baseline must stop the fuzz corpus");
      assert.equal(report.failed, 1);
      assert.equal(report.overallPassed, false);
      assert.equal(report.baselineResults.length, 1);
      assert.equal(report.baselineResults[0].status, 503);
      assert.equal(report.baselineResults[0].passed, false);
      assert.equal(report.baselineResults[0].error, undefined);
      assert.equal(report.failures[0].result.status, 503);
      assert.ok(report.failures[0].reasons.includes("server error 503"));
      assert.ok(requests.length > start, "The worker must connect through IPv6, not reject the origin");
      for (const request of requests.slice(start)) {
        assert.equal(request.path, "/api/healthz");
        assert.equal(request.host, new URL(origin).host);
        assert.equal(request.address, "::1");
      }
    });
  }
});

test("child waits detect timeout, abort, and signal exits and allow cleanup", async (t) => {
  await t.test("timeout", async (t) => {
    const processInfo = managed(t, ["-e", "setInterval(() => {}, 1000)"]);
    await assert.rejects(waitChild(processInfo, "timeout fixture", 50), /exceeded/);
    await stopChild(processInfo, 100);
    assert.notEqual((await processInfo.done).signal, null);
  });
  await t.test("abort", async (t) => {
    const processInfo = managed(t, ["-e", "setInterval(() => {}, 1000)"]);
    const controller = new AbortController();
    const pending = waitChild(processInfo, "abort fixture", 5000, controller.signal);
    controller.abort();
    await assert.rejects(pending, /Interrupted/);
    await stopChild(processInfo, 100);
  });
  await t.test("signal", { skip: process.platform === "win32" }, async (t) => {
    const processInfo = managed(t, ["-e", "process.stdout.write('ready'); setInterval(() => {}, 1000)"]);
    await until(() => processInfo.log().includes("ready"), "Signal fixture did not start");
    processInfo.kill("SIGTERM");
    await assert.rejects(waitChild(processInfo, "signal fixture", 5000), /SIGTERM/);
  });
});

test("cleanup retries transient group denial but reports persistent denial", { timeout: 4000 }, async (t) => {
  await t.test("a closed parent does not hide transient descendant cleanup errors", async () => {
    const signals = [];
    const groupAttempts = { SIGTERM: 0, SIGKILL: 0 };
    const processInfo = {
      child: { pid: 123, exitCode: 0, signalCode: null },
      done: Promise.resolve({ code: 0, signal: null }),
      kill(signal) {
        signals.push(signal);
        if (++groupAttempts[signal] <= 2) {
          throw Object.assign(new Error("Group contains an unreaped descendant"), { code: "EPERM" });
        }
        // The managed kill API returns normally when the group is gone (ESRCH).
      },
    };
    await stopChild(processInfo, 1);
    assert.equal(signals[0], "SIGTERM");
    assert.deepEqual(groupAttempts, { SIGTERM: 3, SIGKILL: 3 }, "Cleanup must retry both signals instead of swallowing EPERM");
  });
  await t.test("persistent denial fails cleanup within three seconds", async () => {
    let groupAttempts = 0;
    const processInfo = {
      child: { pid: 123, exitCode: 0, signalCode: null },
      done: Promise.resolve({ code: 0, signal: null }),
      kill(signal) {
        if (signal === "SIGKILL") {
          groupAttempts += 1;
          throw Object.assign(new Error("Persistent group denial"), { code: "EPERM" });
        }
      },
    };
    const started = performance.now();
    await assert.rejects(stopChild(processInfo, 1), { code: "EPERM" });
    assert.ok(groupAttempts > 1);
    assert.ok(performance.now() - started < 3000, "Cleanup retry must remain bounded");
  });
});

test("cleanup stops a child and its process-group descendant", { skip: process.platform === "win32", timeout: 15_000 }, async (t) => {
  const program = `
    const { spawn } = require('node:child_process');
    const worker = spawn(process.execPath, ['-e', "process.stdout.write('ready'); setInterval(() => {}, 1000)"], { stdio: ['ignore', 'pipe', 'inherit'] });
    worker.stdout.once('data', () => console.log(JSON.stringify({ descendant: worker.pid })));
    process.on('SIGTERM', () => {
      if (worker.exitCode !== null || worker.signalCode !== null) process.exit(0);
      else worker.once('exit', () => process.exit(0));
    });
  `;
  const processInfo = managed(t, ["-e", program]);
  await until(() => processInfo.log().includes("descendant"), "Descendant fixture did not start");
  const { descendant } = JSON.parse(processInfo.log());
  await stopChild(processInfo, 1000);
  await until(() => {
    try { process.kill(descendant, 0); return false; }
    catch (error) { if (error.code === "ESRCH") return true; throw error; }
  }, "Descendant survived process-group cleanup", 3000);
});

test("timed helper campaigns complete at least one batch and save reproducible counts", { timeout: 30_000 }, async (t) => {
  for (const duration of ["1s", "0.001s"]) {
    await t.test(duration, async (t) => {
      const output = await outputDirectory(t);
      const processInfo = managed(t, [runner, "--suite", "helpers", "--duration", duration, "--cases", "1", "--seed", "123", "--output", output], { cwd: root });
      assert.equal(await waitChild(processInfo, "timed helper campaign", 25_000), 0, processInfo.log());
      const summary = JSON.parse(await readFile(join(output, "summary.json"), "utf8"));
      assert.equal(summary.status, "passed");
      assert.equal(summary.cleanedUp, true);
      assert.equal(summary.signal, null);
      assert.equal(summary.failed, 0);
      assert.ok(summary.batches >= 1);
      assert.equal(summary.helperCases, summary.batches * 62);
      assert.equal(summary.propertyChecks, summary.batches * 140);
      assert.equal(summary.httpCases, 0);
      assert.equal(summary.options.seed, 123);
      assert.equal(summary.activeBatch, null);
      const last = JSON.parse(await readFile(join(output, "last-helpers.json"), "utf8"));
      assert.equal(last.seed, summary.lastBatch.seed);
      assert.equal(last.overallPassed, true);
    });
  }
});

test("Ctrl+C ends a forever helper campaign with saved counts and exit 130", { skip: process.platform === "win32", timeout: 30_000 }, async (t) => {
  const output = await outputDirectory(t);
  const processInfo = managed(t, [runner, "--suite", "helpers", "--forever", "--cases", "1", "--seed", "321", "--output", output], { cwd: root });
  await until(async () => {
    try {
      const summary = JSON.parse(await readFile(join(output, "summary.json"), "utf8"));
      return summary.status === "running" && summary.batches >= 1;
    } catch (error) { if (error.code === "ENOENT") return false; throw error; }
  }, `Forever campaign did not finish a batch: ${processInfo.log()}`);
  processInfo.child.kill("SIGINT");
  const exitCode = await waitChild(processInfo, "interrupted helper campaign", 10_000);
  const summary = JSON.parse(await readFile(join(output, "summary.json"), "utf8"));
  assert.equal(exitCode, 130, `${processInfo.log()}\n${JSON.stringify(summary)}`);
  assert.equal(summary.status, "interrupted");
  assert.equal(summary.signal, "SIGINT");
  assert.equal(summary.cleanedUp, true);
  assert.equal(summary.options.durationMs, null);
  assert.ok(summary.finishedAt);
  assert.ok(summary.batches >= 1);
  assert.equal(summary.helperCases, summary.batches * 62);
  assert.equal(summary.failed, 0);
});
