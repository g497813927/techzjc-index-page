#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Refreshes only the package-owned generated keys in `.env.local`:
 *   - NEXT_PUBLIC_COMMIT_SHA
 *   - NEXT_PUBLIC_BUILD_TIME
 *
 * Recovery boundary:
 *   - Every line that is not an assignment of a managed key is preserved
 *     verbatim, along with the file's detected LF or CRLF line-ending style.
 *   - Managed keys are replaced at their first occurrence; duplicate
 *     assignments of a managed key are removed. Missing managed keys are
 *     appended at the end. A missing file is created with managed keys only.
 *   - If `git` is unavailable or the folder is not a repo, the existing
 *     NEXT_PUBLIC_COMMIT_SHA value is kept; "unknown" is used when there is
 *     none. NEXT_PUBLIC_BUILD_TIME is always refreshed.
 *
 * Security: existing values are never printed; only key names and whether the
 * file was created or updated are logged.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ENV_FILE = path.join(process.cwd(), ".env.local");
const MANAGED_KEYS = ["NEXT_PUBLIC_COMMIT_SHA", "NEXT_PUBLIC_BUILD_TIME"];

function readExistingFile() {
  try {
    const content = fs.readFileSync(ENV_FILE, "utf8");
    return {
      eol: content.match(/\r\n|\n/)?.[0] ?? "\n",
      lines: content.split(/\r\n|\n/),
    };
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

function findManagedValue(lines, key) {
  if (!lines) {
    return undefined;
  }
  const match = lines.find((line) => line.startsWith(`${key}=`));
  return match === undefined ? undefined : match.slice(key.length + 1);
}

function resolveCommitSha(existingLines) {
  try {
    const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
    if (sha) {
      return sha;
    }
  } catch {
    // Fall through to the recovery boundary behavior.
  }
  return findManagedValue(existingLines, "NEXT_PUBLIC_COMMIT_SHA") ?? "unknown";
}

function mergeLines(existingLines, managedValues) {
  const result = [];
  const written = new Set();
  for (const line of existingLines ?? []) {
    const managedKey = MANAGED_KEYS.find((key) => line.startsWith(`${key}=`));
    if (managedKey) {
      if (!written.has(managedKey)) {
        result.push(`${managedKey}=${managedValues[managedKey]}`);
        written.add(managedKey);
      }
      continue;
    }
    result.push(line);
  }
  for (const key of MANAGED_KEYS) {
    if (!written.has(key)) {
      result.push(`${key}=${managedValues[key]}`);
    }
  }
  return result;
}

function writeFileAtomically(content) {
  const tmpFile = path.join(
    path.dirname(ENV_FILE),
    `.env.local.tmp-${process.pid}-${Date.now()}`,
  );
  let published = false;
  try {
    fs.writeFileSync(tmpFile, content, { mode: 0o600 });
    // Node replaces an existing file here; deleting it first would create a
    // window where a failed publish could lose the local configuration.
    fs.renameSync(tmpFile, ENV_FILE);
    published = true;
  } finally {
    if (!published) {
      fs.rmSync(tmpFile, { force: true });
    }
  }
}

const existingFile = readExistingFile();
const existingLines = existingFile?.lines ?? null;
const managedValues = {
  NEXT_PUBLIC_COMMIT_SHA: resolveCommitSha(existingLines),
  NEXT_PUBLIC_BUILD_TIME: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
};

const merged = mergeLines(existingLines, managedValues);
const eol = existingFile?.eol ?? "\n";
let content = merged.join(eol);
if (!content.endsWith(eol)) {
  content += eol;
}

writeFileAtomically(content);

const action = existingLines === null ? "created" : "updated";
console.log(
  `prepare-env: ${action} .env.local (managed keys: ${MANAGED_KEYS.join(", ")})`,
);
