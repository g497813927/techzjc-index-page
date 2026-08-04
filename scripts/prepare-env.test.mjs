#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Minimal regression check for scripts/prepare-env.mjs.
 *
 * Runs entirely in a disposable temp directory with its own throwaway git
 * repo, so the real workspace environment files are never read or modified.
 *
 * Recovery boundary under test:
 *   - Unrelated keys, comments, and quoted values survive a refresh.
 *   - Managed keys (NEXT_PUBLIC_COMMIT_SHA, NEXT_PUBLIC_BUILD_TIME) are
 *     refreshed and de-duplicated.
 *   - A missing .env.local is created with managed keys only.
 *   - Without git history, an existing NEXT_PUBLIC_COMMIT_SHA is kept and
 *     "unknown" is used when there is none.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "prepare-env.mjs",
);

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "prepare-env-test",
  GIT_AUTHOR_EMAIL: "prepare-env-test@example.com",
  GIT_COMMITTER_NAME: "prepare-env-test",
  GIT_COMMITTER_EMAIL: "prepare-env-test@example.com",
};

function makeTempRepo(withCommit) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prepare-env-test-"));
  execFileSync("git", ["init", "--quiet"], { cwd: dir, env: GIT_ENV });
  if (withCommit) {
    fs.writeFileSync(path.join(dir, "seed.txt"), "seed\n");
    execFileSync("git", ["add", "seed.txt"], { cwd: dir, env: GIT_ENV });
    execFileSync(
      "git",
      ["-c", "commit.gpgSign=false", "commit", "--quiet", "-m", "seed"],
      {
        cwd: dir,
        env: GIT_ENV,
      },
    );
  }
  return dir;
}

function runPrepareEnv(cwd) {
  return execFileSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: "utf8",
    env: GIT_ENV,
  });
}

function readEnv(dir) {
  return fs.readFileSync(path.join(dir, ".env.local"), "utf8");
}

function toMap(content) {
  const map = new Map();
  for (const line of content.split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq > 0) {
      map.set(line.slice(0, eq), line.slice(eq + 1));
    }
  }
  return map;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

// Case 1: unrelated entries survive a refresh; managed keys are updated.
{
  const dir = makeTempRepo(true);
  const eol = "\r\n";
  const expectedSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: dir,
    encoding: "utf8",
    env: GIT_ENV,
  }).trim();
  fs.writeFileSync(
    path.join(dir, ".env.local"),
    [
      "# unrelated comment",
      "SENTINEL_KEY=sentinel-value",
      'QUOTED_KEY="keep me"',
      "NEXT_PUBLIC_COMMIT_SHA=stale-sha",
      "NEXT_PUBLIC_BUILD_TIME=stale-time",
      "",
    ].join(eol),
  );

  const log = runPrepareEnv(dir);
  const content = readEnv(dir);
  const map = toMap(content);

  assert.equal(map.get("SENTINEL_KEY"), "sentinel-value");
  assert.equal(map.get("QUOTED_KEY"), '"keep me"');
  assert.equal(map.get("NEXT_PUBLIC_COMMIT_SHA"), expectedSha);
  assert.match(map.get("NEXT_PUBLIC_BUILD_TIME"), ISO_RE);
  assert.ok(content.includes("# unrelated comment"));
  assert.ok(content.includes(eol), "CRLF line endings must be preserved");
  assert.doesNotMatch(
    content.replaceAll(eol, ""),
    /[\r\n]/,
    "rewritten content must not contain mixed line endings",
  );
  assert.equal(
    content.split("NEXT_PUBLIC_COMMIT_SHA=").length - 1,
    1,
    "managed key must not be duplicated",
  );
  assert.ok(!log.includes("sentinel-value"), "values must not be printed");

  // Re-run must keep being non-destructive.
  runPrepareEnv(dir);
  const second = toMap(readEnv(dir));
  assert.equal(second.get("SENTINEL_KEY"), "sentinel-value");
  assert.equal(second.get("NEXT_PUBLIC_COMMIT_SHA"), expectedSha);
  fs.rmSync(dir, { recursive: true, force: true });
}

// Case 2: missing file is created with managed keys only.
{
  const dir = makeTempRepo(true);
  runPrepareEnv(dir);
  const map = toMap(readEnv(dir));
  assert.ok(map.has("NEXT_PUBLIC_COMMIT_SHA"));
  assert.match(map.get("NEXT_PUBLIC_BUILD_TIME"), ISO_RE);
  fs.rmSync(dir, { recursive: true, force: true });
}

// Case 3: without git history, existing commit sha is kept, else "unknown".
{
  const dir = makeTempRepo(false);
  fs.writeFileSync(
    path.join(dir, ".env.local"),
    "NEXT_PUBLIC_COMMIT_SHA=kept-sha\n",
  );
  runPrepareEnv(dir);
  assert.equal(toMap(readEnv(dir)).get("NEXT_PUBLIC_COMMIT_SHA"), "kept-sha");
  fs.rmSync(dir, { recursive: true, force: true });

  const emptyDir = makeTempRepo(false);
  runPrepareEnv(emptyDir);
  assert.equal(
    toMap(readEnv(emptyDir)).get("NEXT_PUBLIC_COMMIT_SHA"),
    "unknown",
  );
  fs.rmSync(emptyDir, { recursive: true, force: true });
}

console.log("prepare-env regression check passed");
