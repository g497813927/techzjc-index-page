// alibabacloud.server.js (CommonJS)

const http = require("http");
const fs = require("fs");
const path = require("path");

// In Alibaba Cloud FC, you'll usually get the port from env
const PORT = process.env.PORT || process.env.FC_SERVER_PORT || 3000;
const DIST_DIR = path.join(__dirname, "dist");

const server = http.createServer((req, res) => {
  // Normalize URL, default to /
  let urlPath = req.url.split("?")[0];

  if (urlPath === "/") {
    urlPath = "/index.html";
  }

  const filePath = path.join(DIST_DIR, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Simple 404 fallback to index.html for SPA routes
      if (urlPath !== "/index.html") {
        const indexPath = path.join(DIST_DIR, "index.html");
        fs.readFile(indexPath, (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not found");
          } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(indexData);
          }
        });
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
      }
      return;
    }

    // Very minimal content-type handling
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
