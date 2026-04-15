/* eslint-disable no-console */
import { promises as fs } from "node:fs";
import path from "node:path";

const NEXT_DIR = path.join(process.cwd(), ".next");
const STATIC_DIR = path.join(NEXT_DIR, "static");
const APP_CHUNKS_DIR = path.join(STATIC_DIR, "chunks", "app");
const TEXT_FILE_EXTENSIONS = new Set([".js", ".json", ".html", ".map", ".txt"]);

function encodePathForAssetUrl(relativePath) {
  return relativePath.split("/").map(encodeURIComponent).join("/");
}

function sanitizeDynamicSegment(segment) {
  const optionalCatchAllMatch = segment.match(/^\[\[(?:\.\.\.)?(.+)\]\]$/);
  const dynamicMatch = segment.match(/^\[(?:\.\.\.)?(.+)\]$/);
  const paramName = optionalCatchAllMatch?.[1] ?? dynamicMatch?.[1];

  if (!paramName) {
    return segment;
  }

  const safeName = paramName.replace(/[^A-Za-z0-9-]/g, "_");
  return `__param_${safeName}`;
}

function sanitizeChunkSubpath(relativeSubpath) {
  return relativeSubpath
    .split("/")
    .map(sanitizeDynamicSegment)
    .join("/");
}

async function collectFiles(dir, skipDirs = new Set()) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (skipDirs.has(fullPath)) {
        continue;
      }
      files.push(...await collectFiles(fullPath, skipDirs));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function removeEmptyDirectories(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    await removeEmptyDirectories(path.join(dir, entry.name));
  }

  const remainingEntries = await fs.readdir(dir);
  if (remainingEntries.length === 0) {
    await fs.rm(dir, { recursive: false });
  }
}

async function main() {
  try {
    await fs.access(APP_CHUNKS_DIR);
  } catch {
    console.log("No app chunk directory found, skipping static path sanitization.");
    return;
  }

  const appChunkFiles = await collectFiles(APP_CHUNKS_DIR);
  const fileMoves = [];
  const replacements = [];

  for (const filePath of appChunkFiles) {
    const relativeSubpath = path.relative(APP_CHUNKS_DIR, filePath).split(path.sep).join("/");

    if (!relativeSubpath.includes("[")) {
      continue;
    }

    const sanitizedSubpath = sanitizeChunkSubpath(relativeSubpath);
    if (sanitizedSubpath === relativeSubpath) {
      continue;
    }

    const relativeFromStatic = `chunks/app/${relativeSubpath}`;
    const sanitizedFromStatic = `chunks/app/${sanitizedSubpath}`;
    const destinationPath = path.join(APP_CHUNKS_DIR, ...sanitizedSubpath.split("/"));

    fileMoves.push({ from: filePath, to: destinationPath });

    const encodedOriginal = encodePathForAssetUrl(relativeFromStatic);
    const replacementPairs = [
      [`/_next/static/${encodedOriginal}`, `/_next/static/${sanitizedFromStatic}`],
      [`static/${encodedOriginal}`, `static/${sanitizedFromStatic}`],
      [`/_next/static/${relativeFromStatic}`, `/_next/static/${sanitizedFromStatic}`],
      [`static/${relativeFromStatic}`, `static/${sanitizedFromStatic}`],
    ];

    for (const [from, to] of replacementPairs) {
      replacements.push([from, to]);
    }
  }

  if (fileMoves.length === 0) {
    console.log("No bracketed app chunk paths found, skipping static path sanitization.");
    return;
  }

  const seenDestinations = new Set();
  for (const { to } of fileMoves) {
    if (seenDestinations.has(to)) {
      throw new Error(`Sanitized chunk path collision detected for ${to}`);
    }
    seenDestinations.add(to);
  }

  for (const { from, to } of fileMoves) {
    await fs.mkdir(path.dirname(to), { recursive: true });
    try {
      await fs.access(to);
      throw new Error(`Sanitized chunk destination already exists on disk: ${to}`);
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
    await fs.rename(from, to);
  }

  await removeEmptyDirectories(APP_CHUNKS_DIR);

  const nextFiles = await collectFiles(NEXT_DIR, new Set([path.join(NEXT_DIR, "cache")]));
  const uniqueReplacements = Array.from(
    new Map(replacements.map(([from, to]) => [from, to])).entries(),
  ).sort((a, b) => b[0].length - a[0].length);

  let updatedFileCount = 0;

  for (const filePath of nextFiles) {
    if (!TEXT_FILE_EXTENSIONS.has(path.extname(filePath))) {
      continue;
    }

    let content = await fs.readFile(filePath, "utf8");
    const originalContent = content;

    for (const [from, to] of uniqueReplacements) {
      if (!content.includes(from)) {
        continue;
      }

      content = content.split(from).join(to);
    }

    if (content !== originalContent) {
      await fs.writeFile(filePath, content);
      updatedFileCount += 1;
    }
  }

  console.log(
    `Sanitized ${fileMoves.length} app chunk asset paths and updated ${updatedFileCount} manifest files.`,
  );
}

await main();
