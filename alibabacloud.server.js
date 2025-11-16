// alibabacloud.server.js

const http = require("http");
const next = require("next");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 9000;

// If this file is in the project root (same folder as package.json, pages/app),
// use __dirname. If it's in a /server subfolder, use path.join(__dirname, "..")
const app = next({
  dev,
  dir: path.join(__dirname, "."), // or ".." if server file is in a subfolder
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Next.js app ready on port ${port}`);
  });
});
