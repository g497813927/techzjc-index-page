import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { applyNextPrerenderPatch } from "./patch-next-prerender.mjs";

const checkedInRecipe = JSON.parse(readFileSync(new URL("../patches/next-16.3.0-prerender.json", import.meta.url), "utf8"));
const digest = (content) => createHash("sha256").update(content).digest("hex");

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "next-prerender-patch-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const nextDirectory = join(root, "node_modules/next");
  mkdirSync(nextDirectory, { recursive: true });
  writeFileSync(join(nextDirectory, "package.json"), JSON.stringify({ name: "next", version: checkedInRecipe.version }));
  const originals = checkedInRecipe.files.map((entry, index) => [
    `// ${index === 0 ? "CommonJS" : "ES module"} fixture`,
    `const match = ${entry.from};`,
    "const isPrerendered = !!prerenderManifest.routes[resolvedPathname];",
    "const ssgCacheKey = resolvedPathname;",
    "",
  ].join("\n"));
  const recipe = {
    ...checkedInRecipe,
    files: checkedInRecipe.files.map((entry, index) => ({
      ...entry,
      beforeSha256: digest(originals[index]),
      afterSha256: digest(originals[index].replace(entry.from, entry.to)),
    })),
  };
  const paths = recipe.files.map((entry) => join(nextDirectory, entry.path));
  paths.forEach((path, index) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, originals[index]);
  });
  const snapshot = () => paths.map((path) => readFileSync(path, "utf8"));
  return { root, nextDirectory, originals, paths, recipe, snapshot };
}

test("patches both module formats and retains decoded cache keys", (t) => {
  const f = fixture(t);
  assert.equal(applyNextPrerenderPatch(f.nextDirectory, f.recipe), 2);
  f.snapshot().forEach((source, index) => {
    assert.equal(source, f.originals[index].replace(f.recipe.files[index].from, f.recipe.files[index].to));
    assert.match(source, /prerenderManifest\.routes\[resolvedPathname\]/);
    assert.match(source, /ssgCacheKey = resolvedPathname/);
  });
  const patched = f.snapshot();
  assert.equal(applyNextPrerenderPatch(f.nextDirectory, f.recipe), 0);
  assert.deepEqual(f.snapshot(), patched);
});

test("completes a partially applied installation without changing the known patched file", (t) => {
  const f = fixture(t);
  writeFileSync(f.paths[0], f.originals[0].replace(f.recipe.files[0].from, f.recipe.files[0].to));
  assert.equal(applyNextPrerenderPatch(f.nextDirectory, f.recipe), 1);
  f.snapshot().forEach((source, index) => assert.equal(digest(source), f.recipe.files[index].afterSha256));
});

test("rejects an unsupported Next.js version before changing either file", (t) => {
  const f = fixture(t);
  writeFileSync(join(f.nextDirectory, "package.json"), JSON.stringify({ name: "next", version: "16.3.1" }));
  assert.throws(() => applyNextPrerenderPatch(f.nextDirectory, f.recipe), /Expected next@16\.3\.4, found next@16\.3\.1/);
  assert.deepEqual(f.snapshot(), f.originals);
});

test("source drift in either format leaves both files unchanged", async (t) => {
  for (const index of [0, 1]) {
    await t.test(checkedInRecipe.files[index].path, (t) => {
      const f = fixture(t);
      writeFileSync(f.paths[index], `${f.originals[index]}// unrelated upstream change\n`);
      const before = f.snapshot();
      assert.throws(() => applyNextPrerenderPatch(f.nextDirectory, f.recipe), /Unexpected Next.js source checksum/);
      assert.deepEqual(f.snapshot(), before);
    });
  }
});

test("a missing second format does not partially patch the first", (t) => {
  const f = fixture(t);
  rmSync(f.paths[1]);
  assert.throws(() => applyNextPrerenderPatch(f.nextDirectory, f.recipe), { code: "ENOENT" });
  assert.equal(readFileSync(f.paths[0], "utf8"), f.originals[0]);
});

test("rejects a modified already-patched file", (t) => {
  const f = fixture(t);
  applyNextPrerenderPatch(f.nextDirectory, f.recipe);
  writeFileSync(f.paths[1], `${f.snapshot()[1]}// drift\n`);
  const before = f.snapshot();
  assert.throws(() => applyNextPrerenderPatch(f.nextDirectory, f.recipe), /Unexpected Next.js source checksum/);
  assert.deepEqual(f.snapshot(), before);
});

test("rejects an ambiguous recipe or incorrect output hash before writing", async (t) => {
  for (const kind of ["ambiguous", "output hash"]) {
    await t.test(kind, (t) => {
      const f = fixture(t);
      if (kind === "ambiguous") {
        writeFileSync(f.paths[1], f.originals[1] + f.originals[1]);
        f.recipe.files[1].beforeSha256 = digest(f.snapshot()[1]);
      } else {
        f.recipe.files[1].afterSha256 = "0".repeat(64);
      }
      const before = f.snapshot();
      assert.throws(() => applyNextPrerenderPatch(f.nextDirectory, f.recipe), /Expected exactly one|Unexpected patched checksum/);
      assert.deepEqual(f.snapshot(), before);
    });
  }
});

test("postinstall CLI resolves paths relative to itself and fails the install on drift", (t) => {
  const f = fixture(t);
  mkdirSync(join(f.root, "scripts"));
  mkdirSync(join(f.root, "patches"));
  const script = join(f.root, "scripts/patch-next-prerender.mjs");
  copyFileSync(new URL("./patch-next-prerender.mjs", import.meta.url), script);
  writeFileSync(join(f.root, "patches/next-16.3.0-prerender.json"), JSON.stringify(f.recipe));
  const run = () => spawnSync(process.execPath, [script], { cwd: tmpdir(), encoding: "utf8" });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /2 files updated/);
  const repeat = run();
  assert.equal(repeat.status, 0, repeat.stderr);
  assert.match(repeat.stdout, /0 files updated/);
  writeFileSync(f.paths[1], `${f.snapshot()[1]}// drift\n`);
  const failed = run();
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /Next.js prerender patch failed: Unexpected Next.js source checksum/);
});
