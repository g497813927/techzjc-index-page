import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

// Helper to serve file
function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not Found");
    }

    const ext = path.extname(filePath);
    const type =
      ext === ".html" ? "text/html" :
      ext === ".js"   ? "application/javascript" :
      ext === ".css"  ? "text/css" :
      ext === ".json" ? "application/json" :
      ext === ".png"  ? "image/png" :
      ext === ".jpg"  ? "image/jpeg" :
      ext === ".svg"  ? "image/svg+xml" :
      "text/plain";

    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];

  // Try to match a static file in /dist
  let filePath = path.join(distDir, reqPath);

  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
    // Serve static asset
    return serveFile(filePath, res);
  }

  // Otherwise, return index.html for SPA routing
  serveFile(path.join(distDir, "index.html"), res);
});

// Local dev: `node server.js`
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});

// Export handler for Alibaba Function Compute
export default server;
