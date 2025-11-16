// alibabacloud.server.js

const http = require("http");
const next = require("next");

// In FC this should usually be "production"
const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 9000;

const app = next({
  dev,
  dir: __dirname,
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
