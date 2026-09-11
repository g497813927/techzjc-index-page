#!/usr/bin/env node
import { spawn, execFileSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const LOG_LIMIT = 2 * 1024 * 1024;
const SERVER_BATCH_LIMIT = 100;
export const HELP = `Usage: npm run fuzz -- [options]
  --duration 15m     Fuzz for a duration (s, m, h; bare numbers are seconds).
                    Default: 60s. Build/readiness time is excluded.
  --forever         Continue until Ctrl+C, a finding, or an infrastructure error.
                    Mutually exclusive with --duration.
  --suite all       all (default), http (both HTTP corpora), or helpers (offline).
  --seed N          Initial seed, 1..4294967295 (random by default).
  --cases N         Random cases per HTTP batch / cases per helper family.
                    Default: 600; range: 1..3000. Fixed regressions always run.
  --output DIR      New report directory (must not already exist).
  --help            Show this help.

A timed run finishes its current bounded batch before stopping. Each batch has
an additional 120-second timeout. No fuzz traffic is sent to the live site.
Reports include the current/replay seed and retain only the latest batch per
suite. SIGINT/SIGTERM save completed results and stop all child processes.
`;

export function parseOptions(args) {
  const { values } = parseArgs({ args, options: {
    duration: { type: "string" }, forever: { type: "boolean" },
    suite: { type: "string", default: "all" }, seed: { type: "string" },
    cases: { type: "string", default: "600" }, output: { type: "string" }, help: { type: "boolean" },
  } });
  if (values.help) return { help: true };
  if (values.forever && values.duration !== undefined) throw new Error("--forever and --duration are mutually exclusive.");
  if (!["all", "http", "helpers"].includes(values.suite)) throw new Error("--suite must be all, http, or helpers.");
  const duration = values.duration ?? "60s";
  const match = /^(\d+(?:\.\d+)?)(s|m|h)?$/.exec(duration);
  const durationMs = match ? Number(match[1]) * ({ s: 1000, m: 60000, h: 3600000 }[match[2] ?? "s"]) : NaN;
  if (!Number.isFinite(durationMs) || durationMs < 1 || durationMs > Number.MAX_SAFE_INTEGER) throw new Error("--duration must be positive seconds, minutes, or hours, e.g. 30s, 15m, 2h.");
  const seed = values.seed === undefined ? randomInt(1, 0x100000000) : Number(values.seed);
  const cases = Number(values.cases);
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff) throw new Error("--seed must be 1..4294967295.");
  if (!Number.isInteger(cases) || cases < 1 || cases > 3000) throw new Error("--cases must be 1..3000.");
  if (values.output !== undefined && !values.output.trim()) throw new Error("--output must be a nonempty directory path.");
  return { suite: values.suite, seed, cases, durationMs: values.forever ? null : durationMs,
    output: resolve(values.output ?? join(ROOT, "reports/fuzz/runs", `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`)) };
}

export function nextSeed(seed) {
  let state = seed >>> 0;
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  return state >>> 0;
}

export async function writeJson(path, value) {
  const pending = `${path}.tmp`;
  await writeFile(pending, JSON.stringify(value, null, 2) + "\n");
  await rename(pending, path);
}

export function childProcess(args, { cwd, env, limit = LOG_LIMIT } = {}) {
  const child = spawn(process.execPath, args, { cwd, env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
  let tail = Buffer.alloc(0);
  const append = (chunk) => { tail = Buffer.concat([tail, chunk]).subarray(-limit); };
  child.stdout.on("data", append); child.stderr.on("data", append);
  const done = new Promise((resolveDone) => {
    child.once("error", (error) => resolveDone({ error }));
    child.once("close", (code, signal) => resolveDone({ code, signal }));
  });
  const kill = (signal) => {
    if (!child.pid) return;
    try {
      if (process.platform === "win32") child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code === "ESRCH") return;
      // On macOS an exited but not yet reaped child can make group signaling
      // return EPERM before Node emits close. Signal the owned child directly;
      // stopChild still retries the entire group after waiting for close.
      if (error.code === "EPERM" && child.exitCode === null && child.signalCode === null) {
        child.kill(signal);
        return;
      }
      error.message += ` (pid=${child.pid}, signal=${signal}, exit=${child.exitCode}, signalCode=${child.signalCode})`;
      throw error;
    }
  };
  return { child, done, kill, log: () => tail.toString("utf8") };
}

export async function stopChild(processInfo, graceMs = 2000) {
  if (!processInfo?.child.pid) return;
  // macOS can briefly return EPERM for a group containing only unreaped workers.
  // Retry both signals; never treat a persistent denial as successful cleanup.
  const signalGroup = async (signal) => {
    const deadline = performance.now() + 2000;
    for (;;) {
      try { processInfo.kill(signal); return; }
      catch (error) {
        if (error.code !== "EPERM" || performance.now() >= deadline) throw error;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
      }
    }
  };
  await signalGroup("SIGTERM");
  let timer;
  await Promise.race([processInfo.done, new Promise((resolveDelay) => { timer = setTimeout(resolveDelay, graceMs); })]);
  clearTimeout(timer);
  // Kill the group even when its parent already exited: build workers may remain.
  await signalGroup("SIGKILL");
  await processInfo.done;
}

export async function waitChild(processInfo, label, timeoutMs, signal) {
  let timer, abort;
  try {
    if (signal?.aborted) throw new Error("Interrupted");
    const result = await Promise.race([
      processInfo.done,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs / 1000}s`)), timeoutMs); }),
      new Promise((_, reject) => {
        abort = () => reject(new Error("Interrupted"));
        signal?.addEventListener("abort", abort, { once: true });
      }),
    ]);
    if (result.error) throw result.error;
    if (result.signal) throw new Error(`${label} exited with ${result.signal}`);
    return result.code;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export function mergeBatch(summary, suite, report) {
  const total = suite === "helpers" ? report.totalCases : report.total;
  const count = (value) => Number.isSafeInteger(value) && value >= 0;
  if (!count(total) || !count(report.failed) || typeof report.overallPassed !== "boolean" ||
      (report.overallPassed && (report.failed > 0 || total === 0))) throw new Error("Invalid, inconsistent, or empty worker report");
  if (suite === "helpers" && (!count(report.propertyChecks) || report.propertyChecks < total ||
      !count(report.knownBehavior?.zeroWidthIpv6CompressionAccepted ?? 0))) throw new Error("Invalid helper property count");
  const grouped = suite === "helpers" ? report.families : report.groups;
  if (!grouped || typeof grouped !== "object" || Array.isArray(grouped)) throw new Error("Invalid worker coverage");
  let covered = 0;
  for (const [name, value] of Object.entries(grouped)) {
    const n = typeof value === "number" ? value : value?.count;
    if (!name || name.length > 100 || !count(n)) throw new Error("Invalid worker coverage count");
    covered += n;
    if (suite !== "helpers") {
      if (!value.statuses || typeof value.statuses !== "object" || Array.isArray(value.statuses)) throw new Error("Invalid response statuses");
      let responses = 0;
      for (const [status, amount] of Object.entries(value.statuses)) {
        if (!/^(?:[1-5][0-9]{2}|transport-error)$/.test(status) || !count(amount)) throw new Error("Invalid response status count");
        responses += amount;
      }
      if (responses !== n) throw new Error("Inconsistent response status count");
    }
  }
  if (covered !== total || Object.keys(grouped).length > 100) throw new Error("Inconsistent worker coverage total");
  summary.batches += 1;
  summary.failed += report.failed;
  if (suite === "helpers") {
    summary.helperCases += total;
    summary.propertyChecks += report.propertyChecks;
    summary.knownIpv6Behavior += report.knownBehavior?.zeroWidthIpv6CompressionAccepted ?? 0;
  } else {
    summary.httpCases += total;
    summary.baselineChecks += report.baselineResults?.length ?? 0;
  }
  for (const [name, value] of Object.entries(grouped)) {
    const key = `${suite}:${name}`;
    const target = summary.coverage[key] ??= { count: 0, statuses: {} };
    target.count += typeof value === "number" ? value : value.count;
    for (const [status, amount] of Object.entries(value.statuses ?? {})) target.statuses[status] = (target.statuses[status] ?? 0) + amount;
  }
}

function health(origin, path = "/api/healthz", headers = {}) {
  return new Promise((resolveHealth) => {
    let done = false;
    const finish = (value) => { if (!done) { done = true; clearTimeout(timer); resolveHealth(value); } };
    const request = http.get(origin + path, { agent: false, headers }, (response) => {
      response.resume(); response.on("end", () => finish(response.statusCode === 200)); response.on("error", () => finish(false));
    });
    const timer = setTimeout(() => { finish(false); request.destroy(); }, 2000);
    request.on("error", () => finish(false));
  });
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolveListen); });
  const port = server.address().port;
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function prepareSite(root, sandbox, origin) {
  const entries = ["src", "public", "package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "postcss.config.mjs"];
  for (const entry of entries) await cp(join(root, entry), join(sandbox, entry), { recursive: true,
    filter: (path) => !basename(path).startsWith(".env") && basename(path) !== ".git" });
  // Content is external to this repository. Copy it if available; otherwise seed
  // only this disposable copy so a fresh checkout is immediately testable.
  let content = "workspace copy";
  try { await cp(join(root, "content"), join(sandbox, "content"), { recursive: true, dereference: true }); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    content = "synthetic local fixtures";
    const posts = join(sandbox, "content/blog/2025/12/20");
    await mkdir(posts, { recursive: true });
    for (const lang of ["en-US", "zh-CN"]) await writeFile(join(posts, `fuzz-${lang}.mdx`), `---\ntitle: Local fuzz fixture\ntime: "2025-12-20 12:00:00"\nlang: ${lang}\nslug: fuzz-${lang}\n---\n\nLocal production fuzz fixture.\n`);
  }
  await symlink(await realpath(join(root, "node_modules")), join(sandbox, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  const configPath = join(sandbox, "next.config.ts");
  const config = await readFile(configPath, "utf8");
  // next start uses the full build, avoiding symlink tracing into standalone.
  await writeFile(configPath, config.replace(/^\s*output:\s*["']standalone["'],\s*$/m, ""));
  const guard = join(sandbox, "fuzz-fetch-guard.cjs");
  await writeFile(guard, `const nativeFetch = globalThis.fetch.bind(globalThis);
const origins = new Set(${JSON.stringify([origin, origin.replace("127.0.0.1", "localhost")])});
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.protocol !== "data:" && (!origins.has(url.origin) || url.username || url.password)) throw new Error("Local fuzzing blocked external fetch: " + url.origin);
  return nativeFetch(input, { ...init, redirect: "error" });
};\n`);
  return { content, guard };
}

export async function run(options, root = ROOT) {
  // Refuse to overwrite another campaign's evidence.
  await mkdir(dirname(options.output), { recursive: true });
  await mkdir(options.output);
  const summaryPath = join(options.output, "summary.json");
  const controller = new AbortController();
  let signalName, sandbox, server, current, startedMono, initialBuild, env;
  let signalCount = 0;
  let httpBatches = 0;
  const processes = new Set();
  const launch = (args, cwd, environment = env) => {
    controller.signal.throwIfAborted();
    const managed = childProcess(args, { cwd, env: environment }); processes.add(managed); return managed;
  };
  const interrupt = (name) => {
    signalCount += 1;
    if (!signalName) { signalName = name; controller.abort(); }
    for (const managed of processes) {
      try { managed.kill(signalCount === 1 ? "SIGTERM" : "SIGKILL"); }
      catch { /* stopChild retries and verifies cleanup in finally. */ }
    }
  };
  const onInt = () => interrupt("SIGINT"), onTerm = () => interrupt("SIGTERM");
  process.on("SIGINT", onInt); process.on("SIGTERM", onTerm);
  const summary = { version: 1, createdAt: new Date().toISOString(), startedAt: null, finishedAt: null,
    status: "preparing", options, source: { root, node: process.version }, batches: 0, httpCases: 0, helperCases: 0,
    propertyChecks: 0, baselineChecks: 0, knownIpv6Behavior: 0, failed: 0, coverage: {}, restarts: 0, lastBatch: null, activeBatch: null };
  try { summary.source.commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { summary.source.commit = null; }
  const snapshot = async () => {
    summary.elapsedSeconds = startedMono === undefined ? 0 : Math.round((performance.now() - startedMono) / 1000);
    await writeJson(summaryPath, summary);
    if (server) await writeFile(join(options.output, "server.log"), server.log());
  };
  const stopServer = async () => { if (server) { await stopChild(server); processes.delete(server); await writeFile(join(options.output, "server.log"), server.log()); server = undefined; } };
  const startServer = async () => {
    const next = join(root, "node_modules/next/dist/bin/next");
    server = launch(["--require", join(sandbox, "src/app/scanner-404/trace-guard.cjs"), next, "start", "--hostname", "localhost", "--port", String(new URL(summary.origin).port)], sandbox);
    summary.serverPid = server.child.pid;
    const deadline = performance.now() + 60000;
    while (performance.now() < deadline) {
      controller.signal.throwIfAborted();
      if (server.child.exitCode !== null || server.child.signalCode !== null || !server.child.pid) throw new Error("Production server exited before readiness; inspect server.log");
      if (await health(summary.origin) && await health(summary.origin, "/en-US/markdown/blog", { accept: "text/markdown" })) return;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
    throw new Error("Production readiness exceeded 60s; inspect server.log");
  };
  try {
    console.log(`Fuzz reports: ${options.output}`);
    await snapshot();
    env = Object.fromEntries(["PATH", "SystemRoot", "TMPDIR", "TEMP", "TMP"].filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
    Object.assign(env, { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_VERCEL_ENV: "false", SENTRY_DSN: "", NEXT_PUBLIC_SENTRY_DSN: "", SENTRY_UPLOAD_SOURCEMAPS: "false", CRON_SECRET: "local-fuzz-secret", CDN_ORIGIN_AUTH: "local-fuzz-origin", VERCEL_URL: "127.0.0.1", VERCEL_BRANCH_URL: "localhost" });
    if (options.suite !== "helpers") {
      sandbox = await mkdtemp(join(tmpdir(), "site-index-fuzz-")); summary.sandbox = sandbox;
      summary.origin = `http://127.0.0.1:${await freePort()}`;
      const prepared = await prepareSite(root, sandbox, summary.origin); summary.content = prepared.content;
      env.NODE_OPTIONS = `--dns-result-order=ipv4first --require ${JSON.stringify(prepared.guard)}`;
      console.log("Building an isolated production copy (build time is excluded from --duration).");
      current = launch([join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"], sandbox);
      try { if (await waitChild(current, "Production build", 300000, controller.signal) !== 0) throw new Error("Production build failed; inspect build.log"); }
      finally { await stopChild(current); processes.delete(current); await writeFile(join(options.output, "build.log"), current.log()); current = undefined; }
      initialBuild = join(sandbox, ".next-pristine");
      await cp(join(sandbox, ".next"), initialBuild, { recursive: true });
      await startServer();
    }
    summary.status = "running"; summary.startedAt = new Date().toISOString(); startedMono = performance.now();
    const suites = options.suite === "helpers" ? ["helpers"] : options.suite === "http" ? ["http", "extended-http"] : ["http", "extended-http", "helpers"];
    let seed = options.seed, nextProgress = startedMono;
    console.log(`Fuzzing ${options.suite}; seed=${seed}; ${options.durationMs === null ? "until stopped" : `duration=${options.durationMs / 1000}s`}`);
    await snapshot();
    while (!controller.signal.aborted && (summary.batches === 0 || options.durationMs === null || performance.now() - startedMono < options.durationMs)) {
      const suite = suites[summary.batches % suites.length];
      if (suite !== "helpers" && httpBatches >= SERVER_BATCH_LIMIT) {
        await stopServer();
        await rm(join(sandbox, ".next"), { recursive: true, force: true });
        await cp(initialBuild, join(sandbox, ".next"), { recursive: true });
        await startServer(); httpBatches = 0; summary.restarts += 1;
      }
      const output = join(options.output, `last-${suite}.json`);
      await rm(output, { force: true });
      summary.activeBatch = { index: summary.batches, suite, seed, cases: options.cases };
      await snapshot();
      const args = [join(root, `scripts/fuzz/${suite}.mjs`), "--seed", String(seed), "--cases", String(options.cases), "--output", output, "--summary-only"];
      if (suite !== "helpers") args.push("--base-url", summary.origin);
      current = launch(args, root);
      let code;
      try { code = await waitChild(current, `${suite} batch`, 120000, controller.signal); }
      finally { await stopChild(current); processes.delete(current); await writeFile(join(options.output, "worker.log"), current.log()); current = undefined; }
      const report = JSON.parse(await readFile(output, "utf8"));
      mergeBatch(summary, suite, report);
      summary.lastBatch = summary.activeBatch; summary.activeBatch = null;
      if (suite !== "helpers") httpBatches += 1;
      if (code !== 0 || !report.overallPassed) {
        summary.status = report.failed > 0 ? "failed" : "error";
        summary.error = `${suite} batch failed; replay seed=${seed}, cases=${options.cases}; see ${basename(output)}`;
        break;
      }
      if (server && !(await health(summary.origin))) throw new Error("Production health check failed after batch");
      seed = nextSeed(seed); summary.nextSeed = seed;
      if (performance.now() >= nextProgress) {
        console.log(JSON.stringify({ seconds: Math.round((performance.now() - startedMono) / 1000), batches: summary.batches, httpCases: summary.httpCases, helperCases: summary.helperCases, failed: summary.failed }));
        nextProgress = performance.now() + 30000;
      }
      await snapshot();
    }
    if (summary.status === "running") summary.status = signalName ? "interrupted" : "passed";
    if (server && !signalName) { summary.healthAfter = await health(summary.origin); if (!summary.healthAfter) throw new Error("Final health check failed"); }
  } catch (error) {
    summary.status = signalName ? "interrupted" : "error";
    summary.error = error.message;
  } finally {
    try {
      await Promise.all([...processes].map((managed) => stopChild(managed)));
      if (server) await writeFile(join(options.output, "server.log"), server.log());
      if (sandbox) await rm(sandbox, { recursive: true, force: true });
      summary.cleanedUp = true;
    } catch (error) { summary.cleanupError = error.message; summary.status = "error"; }
    summary.signal = signalName ?? null;
    summary.finishedAt = new Date().toISOString();
    try { await snapshot(); }
    finally { process.removeListener("SIGINT", onInt); process.removeListener("SIGTERM", onTerm); }
  }
  console.log(JSON.stringify({ status: summary.status, seconds: summary.elapsedSeconds, httpCases: summary.httpCases, helperCases: summary.helperCases, propertyChecks: summary.propertyChecks, failed: summary.failed, report: summaryPath }));
  return summary.status === "passed" ? 0 : summary.status === "interrupted" ? (signalName === "SIGTERM" ? 143 : 130) : 1;
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseOptions(process.argv.slice(2));
    if (options.help) console.log(HELP);
    else process.exitCode = await run(options);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
