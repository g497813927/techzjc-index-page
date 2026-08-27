#!/usr/bin/env node
/**
 * Test suite for scripts/sanitize-next-static-paths.mjs.
 *
 * Covers:
 *   - Pure functions: sanitizeDynamicSegment, encodePathForAssetUrl, sanitizeChunkSubpath
 *   - Integration: main() behaviour via subprocess in a disposable temp directory
 *
 * Recovery boundary under test:
 *   - Dynamic route segments ([param], [...param], [[param]]) are sanitized
 *     to __param_{safe} while static segments pass through unchanged.
 *   - Asset URL encoding preserves path separators.
 *   - main() renames bracketed chunk files, rewrites references in text
 *     files, removes empty source directories, and skips the cache dir.
 *   - main() is a no-op when the app chunks directory is absent.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  encodePathForAssetUrl,
  sanitizeChunkSubpath,
  sanitizeDynamicSegment,
} from "./sanitize-next-static-paths.mjs";

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "sanitize-next-static-paths.mjs",
);

// ---------------------------------------------------------------------------
// Pure function: sanitizeDynamicSegment
// ---------------------------------------------------------------------------
describe("sanitizeDynamicSegment", () => {
  test("passes through static segments unchanged", () => {
    assert.equal(sanitizeDynamicSegment("page"), "page");
    assert.equal(sanitizeDynamicSegment("layout"), "layout");
    assert.equal(sanitizeDynamicSegment("my-folder"), "my-folder");
    assert.equal(sanitizeDynamicSegment(""), "");
  });

  test("sanitizes [param] to __param_param", () => {
    assert.equal(sanitizeDynamicSegment("[slug]"), "__param_slug");
    assert.equal(sanitizeDynamicSegment("[id]"), "__param_id");
  });

  test("sanitizes [...catchAll] to __param_catchAll", () => {
    assert.equal(sanitizeDynamicSegment("[...path]"), "__param_path");
    assert.equal(sanitizeDynamicSegment("[...rest]"), "__param_rest");
  });

  test("sanitizes [[optionalCatchAll]] to __param_name", () => {
    assert.equal(sanitizeDynamicSegment("[[slug]]"), "__param_slug");
    assert.equal(sanitizeDynamicSegment("[[...path]]"), "__param_path");
  });

  test("replaces non-alphanumeric characters (except hyphens) with underscores", () => {
    assert.equal(sanitizeDynamicSegment("[my.param]"), "__param_my_param");
    assert.equal(sanitizeDynamicSegment("[foo bar]"), "__param_foo_bar");
    assert.equal(sanitizeDynamicSegment("[a/b/c]"), "__param_a_b_c");
  });

  test("preserves hyphens in parameter names", () => {
    assert.equal(sanitizeDynamicSegment("[my-param]"), "__param_my-param");
  });

  test("does not match malformed bracket patterns", () => {
    assert.equal(sanitizeDynamicSegment("[unclosed"), "[unclosed");
    assert.equal(sanitizeDynamicSegment("open]"), "open]");
    assert.equal(sanitizeDynamicSegment("[]"), "[]");
    // "[[unclosed]" matches the dynamic regex (starts with [, ends with ])
    // so it IS treated as a dynamic segment — this is expected behavior
    assert.equal(sanitizeDynamicSegment("[[unclosed]"), "__param__unclosed");
  });

  test("prefers optional-catch-all match over dynamic match", () => {
    // [[...x]] should match the optional catch-all regex first
    assert.equal(sanitizeDynamicSegment("[[...x]]"), "__param_x");
  });
});

// ---------------------------------------------------------------------------
// Pure function: encodePathForAssetUrl
// ---------------------------------------------------------------------------
describe("encodePathForAssetUrl", () => {
  test("encodes each path segment individually, preserving slashes", () => {
    // encodePathForAssetUrl only percent-encodes; it does NOT sanitize brackets
    assert.equal(encodePathForAssetUrl("chunks/app/[slug]/page.js"), "chunks/app/%5Bslug%5D/page.js");
    assert.equal(encodePathForAssetUrl("a/b/c"), "a/b/c");
  });

  test("encodes special characters within segments", () => {
    assert.equal(encodePathForAssetUrl("path/with space/file"), "path/with%20space/file");
    assert.equal(encodePathForAssetUrl("a/[b]/c"), "a/%5Bb%5D/c");
  });

  test("handles empty and single-segment paths", () => {
    assert.equal(encodePathForAssetUrl(""), "");
    assert.equal(encodePathForAssetUrl("file.js"), "file.js");
  });
});

// ---------------------------------------------------------------------------
// Pure function: sanitizeChunkSubpath
// ---------------------------------------------------------------------------
describe("sanitizeChunkSubpath", () => {
  test("sanitizes each segment in a multi-segment path", () => {
    assert.equal(
      sanitizeChunkSubpath("[lang]/[slug]/page.js"),
      "__param_lang/__param_slug/page.js",
    );
  });

  test("leaves static paths unchanged", () => {
    assert.equal(sanitizeChunkSubpath("app/layout.js"), "app/layout.js");
  });

  test("handles mixed static and dynamic segments", () => {
    assert.equal(
      sanitizeChunkSubpath("[lang]/blog/[slug]/page.js"),
      "__param_lang/blog/__param_slug/page.js",
    );
  });

  test("handles catch-all and optional catch-all segments", () => {
    assert.equal(
      sanitizeChunkSubpath("[...path]/file.js"),
      "__param_path/file.js",
    );
    assert.equal(
      sanitizeChunkSubpath("[[...slug]]/file.js"),
      "__param_slug/file.js",
    );
  });
});

// ---------------------------------------------------------------------------
// Integration: main() via subprocess
// ---------------------------------------------------------------------------
function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "sanitize-paths-test-"));
}

async function scaffoldProject(tmpDir, { appChunkFiles, textFiles }) {
  // Build .next/static/chunks/app/ with the given relative files
  const appChunksDir = path.join(tmpDir, ".next", "static", "chunks", "app");
  for (const [relPath, content] of Object.entries(appChunkFiles)) {
    const full = path.join(appChunksDir, relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
  }

  // Build additional text files under .next/ (outside app chunks)
  for (const [relPath, content] of Object.entries(textFiles)) {
    const full = path.join(tmpDir, ".next", relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
  }
}

function runScript(cwd) {
  return execFileSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("main() integration", () => {
  test("is a no-op when app chunks directory does not exist", async () => {
    const tmpDir = await makeTempDir();
    try {
      const log = runScript(tmpDir);
      assert.match(log, /No app chunk directory found/);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("is a no-op when no bracketed paths exist", async () => {
    const tmpDir = await makeTempDir();
    try {
      await scaffoldProject(tmpDir, {
        appChunkFiles: { "static-chunk.js": "var x = 1;" },
        textFiles: {},
      });
      const log = runScript(tmpDir);
      assert.match(log, /No bracketed app chunk paths found/);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("renames bracketed chunk files and rewrites references", async () => {
    const tmpDir = await makeTempDir();
    try {
      await scaffoldProject(tmpDir, {
        appChunkFiles: {
          "[lang]/page.js": 'import x from "/_next/static/chunks/app/[lang]/page.js";',
        },
        textFiles: {
          "build-manifest.json": JSON.stringify({
            pages: {
              "/[lang]": [
                "static/chunks/app/[lang]/page.js",
                "/_next/static/chunks/app/[lang]/page.js",
              ],
            },
          }),
        },
      });

      const log = runScript(tmpDir);
      assert.match(log, /Sanitized 1 app chunk asset paths/);

      // Verify the file was moved
      const appChunksDir = path.join(tmpDir, ".next", "static", "chunks", "app");
      const oldPath = path.join(appChunksDir, "[lang]", "page.js");
      const newPath = path.join(appChunksDir, "__param_lang", "page.js");

      await assert.rejects(fs.access(oldPath), /ENOENT/);
      const movedContent = await fs.readFile(newPath, "utf8");
      assert.equal(movedContent, 'import x from "/_next/static/chunks/app/__param_lang/page.js";');

      // Verify manifest values were rewritten (keys like "/[lang]" are route
      // identifiers and are NOT touched by the replacement logic)
      const manifest = await fs.readFile(
        path.join(tmpDir, ".next", "build-manifest.json"),
        "utf8",
      );
      assert.ok(
        !manifest.includes("static/chunks/app/[lang]"),
        "manifest should not contain the old static path",
      );
      assert.ok(
        manifest.includes("static/chunks/app/__param_lang/page.js"),
        "manifest should contain the sanitized static path",
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("removes empty source directories after moving files", async () => {
    const tmpDir = await makeTempDir();
    try {
      await scaffoldProject(tmpDir, {
        appChunkFiles: {
          "[slug]/nested/page.js": "export default 1;",
        },
        textFiles: {},
      });

      runScript(tmpDir);

      const appChunksDir = path.join(tmpDir, ".next", "static", "chunks", "app");
      // The old [slug] directory should have been removed
      await assert.rejects(
        fs.access(path.join(appChunksDir, "[slug]")),
        /ENOENT/,
        "empty [slug] directory should be removed",
      );
      // The new __param_slug directory should exist
      await fs.access(path.join(appChunksDir, "__param_slug", "nested", "page.js"));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("skips the .next/cache directory when rewriting text files", async () => {
    const tmpDir = await makeTempDir();
    try {
      await scaffoldProject(tmpDir, {
        appChunkFiles: {
          "[id]/page.js": "module.exports = 1;",
        },
        textFiles: {},
      });

      // Place a text file inside .next/cache that references the old path
      const cacheDir = path.join(tmpDir, ".next", "cache");
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(
        path.join(cacheDir, "cached.js"),
        'var ref = "static/chunks/app/[id]/page.js";',
      );

      runScript(tmpDir);

      // Cache file should NOT be rewritten
      const cacheContent = await fs.readFile(path.join(cacheDir, "cached.js"), "utf8");
      assert.ok(
        cacheContent.includes("[id]"),
        "cache files must not be modified",
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("throws on destination path collision", async () => {
    const tmpDir = await makeTempDir();
    try {
      // Two different bracket patterns that sanitize to the same name
      await scaffoldProject(tmpDir, {
        appChunkFiles: {
          "[slug]/page.js": "a",
          "[[slug]]/page.js": "b",
        },
        textFiles: {},
      });

      assert.throws(
        () => runScript(tmpDir),
        /collision/i,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("only rewrites text files with known extensions", async () => {
    const tmpDir = await makeTempDir();
    try {
      await scaffoldProject(tmpDir, {
        appChunkFiles: {
          "[x]/page.js": "export default 1;",
        },
        textFiles: {},
      });

      // Place a binary-like file with an unknown extension
      const nextDir = path.join(tmpDir, ".next");
      await fs.writeFile(
        path.join(nextDir, "trace.bin"),
        'ref to static/chunks/app/[x]/page.js here',
      );

      runScript(tmpDir);

      const binContent = await fs.readFile(path.join(nextDir, "trace.bin"), "utf8");
      assert.ok(
        binContent.includes("[x]"),
        "non-text-extension files should not be rewritten",
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
