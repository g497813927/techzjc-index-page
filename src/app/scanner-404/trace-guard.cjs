// Preload before Next starts: Fetch Request rejects TRACE before proxy can run.
// Keep the rejection at the raw HTTP boundary without relaxing Fetch's rules.
/* eslint-disable @typescript-eslint/no-require-imports -- Node --require preloads must be CommonJS. */
const http = require("node:http");
const https = require("node:https");
const installed = Symbol.for("techzjc.trace-request-guard");

for (const prototype of [http.Server.prototype, https.Server.prototype]) {
  if (Object.hasOwn(prototype, installed)) continue;
  const emit = prototype.emit;
  Object.defineProperty(prototype, installed, { value: true });
  prototype.emit = function (event, ...args) {
    if (event === "upgrade" && args[0]?.method === "TRACE") {
      // Upgrade requests receive a socket rather than a ServerResponse.
      args[1].end("HTTP/1.1 404 Not Found\r\nConnection: close\r\nCache-Control: no-store, max-age=0\r\nContent-Length: 0\r\nX-Content-Type-Options: nosniff\r\n\r\n");
      return true;
    }
    if (["request", "checkContinue", "checkExpectation"].includes(event) && args[0]?.method === "TRACE") {
      const [request, response] = args;
      // Do not echo the request, headers, credentials, or body.
      response.writeHead(404, {
        "Cache-Control": "no-store, max-age=0",
        "Content-Length": "0",
        "X-Content-Type-Options": "nosniff",
      });
      response.end();
      request.resume();
      return true;
    }
    return emit.call(this, event, ...args);
  };
}
