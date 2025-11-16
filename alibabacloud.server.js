// alibabacloud.server.js (CommonJS, works with Node 20 default settings)

const http = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 9000; // or 3000, but 9000 is common in FC

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Next.js app ready on port ${port}`);
  });
});
