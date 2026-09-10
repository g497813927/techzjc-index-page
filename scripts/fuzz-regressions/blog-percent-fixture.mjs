import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { request, runBlogPercentHttp } from "./blog-percent-http.mjs";

// A disposable app exercises the installed production Next runtime without
// changing synchronized blog content, workspace environment files, or .next.
const require = createRequire(import.meta.url);
const nextPackagePath = require.resolve("next/package.json");
const nextCli = join(dirname(nextPackagePath), "dist/bin/next");
const fixture = await mkdtemp(join(tmpdir(), "next-blog-percent-"));
const environment = {
  PATH: process.env.PATH,
  ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
};
let server;
let serverLog = "";
const appendLog = (log, data) => (log + data.toString()).slice(-32_768);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function command(args) {
  const child = spawn(process.execPath, [nextCli, ...args], { cwd: fixture, env: environment, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (data) => { log = appendLog(log, data); });
  child.stderr.on("data", (data) => { log = appendLog(log, data); });
  let timer;
  const finished = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Next ${args[0]} failed (${signal ?? code}):\n${log}`));
    });
  });
  timer = setTimeout(() => child.kill("SIGKILL"), 180_000);
  try { await finished; } finally { clearTimeout(timer); }
}

async function freePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

try {
  await symlink(dirname(dirname(nextPackagePath)), join(fixture, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  await writeFile(join(fixture, "package.json"), JSON.stringify({ private: true }));
  await writeFile(join(fixture, "next.config.mjs"), `export default {
    async rewrites() { return [{ source: '/blog/:path*', destination: '/en-US/blog/:path*' }]; },
  };\n`);
  const pageDirectory = join(fixture, "app/[lang]/blog/[slugOrYear]/[month]/[day]/[slug]");
  await mkdir(pageDirectory, { recursive: true });
  await writeFile(join(fixture, "app/layout.js"), `export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n`);
  await writeFile(join(pageDirectory, "page.js"), `
import { notFound } from 'next/navigation';
import { randomUUID } from 'node:crypto';
export const dynamic = 'force-static';
export const revalidate = 3600;
export function generateStaticParams() {
  return ['en-US', 'zh-CN'].map(lang => ({ lang, slugOrYear: '2025', month: '01', day: '02', slug: 'cached-post' }));
}
export default async function Page({ params }) {
  const { lang, slugOrYear, month, day, slug: encodedSlug } = await params;
  // Next 16.3 exposes encoded render params here on both baseline and patched
  // builds. Mirror getPostBySlug: decode the slug once for the content lookup.
  const slug = decodeURIComponent(encodedSlug);
  if (!['en-US', 'zh-CN'].includes(lang) || slugOrYear !== '2025' || month !== '01' || day !== '02' ||
      !['cached-post', 'on-demand-post', '%', '100%', '%GG', '%FF', '%25', '中文', '😀'].includes(slug)) notFound();
  const data = Buffer.from(JSON.stringify({ lang, slugOrYear, month, day, slug: encodedSlug })).toString('hex');
  return <main data-params={data} data-slug={Buffer.from(slug).toString('hex')}><h1>{slug}</h1><p>{randomUUID()}</p></main>;
}
`);
  await command(["build", "--webpack"]);
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: fixture, env: environment, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (data) => { serverLog = appendLog(serverLog, data); });
  server.stderr.on("data", (data) => { serverLog = appendLog(serverLog, data); });
  let startupError;
  server.once("error", (error) => { startupError = error; });
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (startupError) throw startupError;
    if (server.exitCode !== null || server.signalCode !== null) throw new Error(`Next start exited: ${serverLog}`);
    try {
      const response = await request(baseUrl, "/en-US/blog/2025/01/02/cached-post");
      if (response.status === 200) { ready = true; break; }
    } catch { /* Allow the local production server to bind its socket. */ }
    await sleep(100);
  }
  assert.ok(ready, `Production fixture did not become ready: ${serverLog}`);
  const report = await runBlogPercentHttp({ baseUrl, fixture: true });
  report.nextVersion = JSON.parse(await readFile(nextPackagePath, "utf8")).version;
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) {
    console.error(serverLog);
    process.exitCode = 1;
  }
} finally {
  if (server?.pid && server.exitCode === null && server.signalCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    const killTimer = setTimeout(() => server.kill("SIGKILL"), 5_000);
    await exited;
    clearTimeout(killTimer);
  }
  await rm(fixture, { recursive: true, force: true });
}
