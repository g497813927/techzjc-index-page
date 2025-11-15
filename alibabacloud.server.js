// alibabacloud.server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 9000;
const nextDir = path.join(__dirname, ".next");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];

  // Default to index.html for root
  if (urlPath === "/" || urlPath === "") {
    urlPath = "/index.html";
  }

  const filePath = path.join(nextDir, urlPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback: always serve index.html for unknown routes
      const indexPath = path.join(nextDir, "index.html");
      fs.readFile(indexPath, (err2, content) => {
        if (err2) {
          res.writeHead(500);
          res.end("Internal Server Error");
          return;
        }
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
        });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    fs.readFile(filePath, (err2, content) => {
      if (err2) {
        res.writeHead(500);
        res.end("Internal Server Error");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
