import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseOptions, run } from "./fuzz.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

function assertPortClosed(origin) {
  const url = new URL(origin);
  assert.equal(url.protocol, "http:");
  assert.equal(url.hostname, "127.0.0.1");
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: url.hostname, port: Number(url.port) });
    socket.setTimeout(2000, () => socket.destroy(new Error("Timed out checking production server cleanup")));
    socket.once("connect", () => {
      socket.destroy();
      reject(new Error("The production server is still listening after cleanup"));
    });
    socket.once("error", (error) => error.code === "ECONNREFUSED" ? resolve() : reject(error));
  });
}

test("a production HTTP campaign builds, verifies routes, saves evidence, and cleans up", { timeout: 480_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "fuzz-production-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, "reports");
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const options = parseOptions(["--suite", "http", "--duration", "0.001s", "--cases", "1", "--seed", "123", "--output", output]);

  const exitCode = await run(options);
  const summary = JSON.parse(await readFile(join(output, "summary.json"), "utf8"));
  try {
    assert.equal(exitCode, 0, "The production HTTP campaign failed");

    assert.equal(summary.status, "passed");
    assert.equal(summary.failed, 0);
    assert.ok(summary.batches >= 1, "Even a 1ms campaign must complete a bounded HTTP batch");
    assert.ok(summary.httpCases > 0);
    assert.equal(summary.helperCases, 0);
    assert.ok(summary.baselineChecks > 0);
    assert.equal(summary.healthAfter, true);
    assert.equal(summary.cleanedUp, true);
    assert.equal(summary.cleanupError, undefined);
    assert.equal(summary.activeBatch, null);
    assert.equal(summary.source.commit, commit);
    assert.equal(summary.options.durationMs, 1);

    const latest = JSON.parse(await readFile(join(output, "last-http.json"), "utf8"));
    assert.equal(latest.overallPassed, true);
    assert.equal(latest.failed, 0);
    assert.ok(latest.total > 0);
    assert.ok(latest.baselineResults.length > 0);
    assert.ok(latest.baselineResults.every((result) => result.passed));
    assert.equal(latest.seed, summary.lastBatch.seed);

    const startedAt = Date.parse(summary.startedAt);
    const finishedAt = Date.parse(summary.finishedAt);
    const buildLog = await stat(join(output, "build.log"));
    assert.ok(startedAt > Date.parse(summary.createdAt));
    assert.ok(buildLog.mtimeMs <= startedAt + 1, "The fuzz duration must start after the production build finishes");
    assert.ok(finishedAt >= startedAt);
    assert.ok(Math.abs(summary.elapsedSeconds - (finishedAt - startedAt) / 1000) <= 1);

    assert.equal(typeof summary.sandbox, "string");
    await assert.rejects(access(summary.sandbox), { code: "ENOENT" });
    await assertPortClosed(summary.origin);
  } catch (error) {
    const logs = {};
    for (const name of ["build.log", "server.log", "worker.log"]) {
      try { logs[name] = (await readFile(join(output, name), "utf8")).slice(-8000); }
      catch (readError) { if (readError.code !== "ENOENT") logs[name] = readError.message; }
    }
    throw new Error(`${error.message}\n${JSON.stringify({ exitCode, summary, logs }, null, 2)}`, { cause: error });
  }
});
