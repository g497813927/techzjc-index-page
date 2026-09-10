import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { once } from "node:events";
import { test } from "node:test";

const require = createRequire(import.meta.url);
require("../../src/app/scanner-404/trace-guard.cjs");

test("TRACE is rejected before the first listener and does not disclose input", async () => {
  const received = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push(req.method);
    res.end(JSON.stringify({ method: req.method, path: req.url, body: Buffer.concat(chunks).toString() }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const agent = new http.Agent({ keepAlive: true });
  async function request(method, path = "/", body = "") {
    return new Promise((resolve, reject) => {
      const req = http.request({ host: "127.0.0.1", port: server.address().port, method, path, agent,
        headers: { authorization: "secret-fuzz-canary", "content-length": Buffer.byteLength(body) } }, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
        res.on("error", reject);
      });
      req.setTimeout(2000, () => req.destroy(new Error("request timed out")));
      req.on("error", reject);
      req.end(body);
    });
  }
  try {
    // TRACE is the very first request, including a body and malformed URL.
    for (const path of ["/", "/api/healthz", "/.env", "/%FF"]) {
      const result = await request("TRACE", path, "private-body");
      assert.equal(result.status, 404);
      assert.equal(result.body, "");
      assert.equal(result.headers["cache-control"], "no-store, max-age=0");
      assert.equal(result.headers["x-content-type-options"], "nosniff");
    }
    assert.deepEqual(received, []);
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const result = await request(method, "/normal?x=1", "normal-body");
      assert.equal(result.status, 200);
      assert.deepEqual(JSON.parse(result.body), { method, path: "/normal?x=1", body: "normal-body" });
    }
    const concurrent = await Promise.all(Array.from({ length: 20 }, (_, i) => request(i % 2 ? "POST" : "TRACE", "/", "body")));
    concurrent.forEach((result, i) => assert.equal(result.status, i % 2 ? 200 : 404));
    assert.equal(received.includes("TRACE"), false);
  } finally {
    agent.destroy();
    server.close();
    await once(server, "close");
  }
});

test("HTTPS uses the same guard and unrelated events keep normal dispatch", () => {
  for (const prototype of [http.Server.prototype, https.Server.prototype]) {
    let ended = false;
    let resumed = false;
    prototype.emit.call({}, "request", { method: "TRACE", resume() { resumed = true; } }, {
      writeHead(status) { assert.equal(status, 404); }, end() { ended = true; },
    });
    assert.equal(ended && resumed, true);
  }
  const server = http.createServer();
  let seen;
  server.on("fuzz-event", (value) => { seen = value; });
  assert.equal(server.emit("fuzz-event", 42), true);
  assert.equal(seen, 42);
  assert.equal(server.emit("unused-event"), false);
});

test("the guard is idempotent and Fetch still prohibits TRACE", () => {
  const installedEmit = http.Server.prototype.emit;
  delete require.cache[require.resolve("../../src/app/scanner-404/trace-guard.cjs")];
  require("../../src/app/scanner-404/trace-guard.cjs");
  assert.equal(http.Server.prototype.emit, installedEmit);
  assert.throws(() => new Request("https://techzjc.com/", { method: "TRACE" }), TypeError);
});

test("Vercel's rejection matches only TRACE and preserves the cron", async () => {
  const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
  const route = config.routes[0];
  assert.deepEqual(route.methods, ["TRACE"]);
  assert.equal(route.status, 404);
  assert.equal(route.dest, undefined);
  assert.notEqual(route.continue, true);
  for (const path of ["/", "/api/healthz", "/en-US/blog", "/%FF"]) assert.match(path, new RegExp(`^${route.src}$`));
  assert.deepEqual(config.crons, [{ path: "/api/cron/sentry-monitor", schedule: "0 0 * * *" }]);
});


test("TRACE upgrades and Expect requests are rejected while GET upgrades survive", async () => {
  const seen = [];
  const server = http.createServer((_req, res) => res.end("normal"));
  server.on("upgrade", (req, socket) => {
    seen.push(req.method);
    socket.end("HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n");
  });
  server.on("checkContinue", (_req, res) => { seen.push("checkContinue"); res.end(); });
  server.on("checkExpectation", (_req, res) => { seen.push("checkExpectation"); res.end(); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  async function raw(method, extraHeaders) {
    const socket = net.connect(server.address().port, "127.0.0.1");
    socket.setTimeout(2000, () => socket.destroy(new Error("socket timed out")));
    const chunks = [];
    socket.on("data", chunk => chunks.push(chunk));
    socket.end(`${method} /api/healthz HTTP/1.1\r\nHost: localhost\r\n${extraHeaders}\r\n\r\n`);
    await once(socket, "close");
    return Buffer.concat(chunks).toString();
  }
  try {
    for (const headers of ["Connection: Upgrade\r\nUpgrade: websocket", "Connection: close\r\nExpect: 100-continue", "Connection: close\r\nExpect: fuzz"]) {
      const response = await raw("TRACE", headers);
      assert.match(response, /^HTTP\/1.1 404 /);
      assert.equal(response.split("\r\n\r\n")[1], "");
    }
    assert.deepEqual(seen, []);
    assert.match(await raw("GET", "Connection: Upgrade\r\nUpgrade: websocket"), /^HTTP\/1.1 101 /);
    assert.deepEqual(seen, ["GET"]);
  } finally {
    server.close();
    await once(server, "close");
  }
});
