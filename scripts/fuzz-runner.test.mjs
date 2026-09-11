import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

test("a one-second helper campaign completes and saves reproducible counts", { timeout: 30_000 }, async (t) => {
  const output = await outputDirectory(t);
  const processInfo = managed(t, [runner, "--suite", "helpers", "--duration", "1s", "--cases", "1", "--seed", "123", "--output", output], { cwd: root });
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
