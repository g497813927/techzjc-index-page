import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(scriptPath), "..");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

// Validate every file before changing either module format. A partial previous
// install is safe to retry: known patched files are accepted without rewriting.
export function applyNextPrerenderPatch(nextDirectory, recipe) {
  const installed = JSON.parse(readFileSync(join(nextDirectory, "package.json"), "utf8"));
  if (installed.name !== recipe.package || installed.version !== recipe.version) {
    throw new Error(`Expected ${recipe.package}@${recipe.version}, found ${installed.name}@${installed.version}. Review or remove the prerender patch before upgrading Next.js.`);
  }

  const changes = recipe.files.map((entry) => {
    const path = join(nextDirectory, entry.path);
    const original = readFileSync(path, "utf8");
    const checksum = sha256(original);
    if (checksum === entry.afterSha256) return { path, changed: false };
    if (checksum !== entry.beforeSha256) {
      throw new Error(`Unexpected Next.js source checksum for ${entry.path}. Refusing to apply the prerender patch.`);
    }
    if (!entry.from || original.split(entry.from).length !== 2) {
      throw new Error(`Expected exactly one prerender matcher call in ${entry.path}.`);
    }
    const patched = original.replace(entry.from, entry.to);
    if (sha256(patched) !== entry.afterSha256) {
      throw new Error(`Unexpected patched checksum for ${entry.path}. Refusing to apply the prerender patch.`);
    }
    return { path, changed: true, patched };
  });

  for (const change of changes) {
    if (change.changed) writeFileSync(change.path, change.patched);
  }
  return changes.filter((change) => change.changed).length;
}

if (process.argv[1] && realpathSync(process.argv[1]) === scriptPath) {
  try {
    const recipe = JSON.parse(readFileSync(join(projectRoot, "patches/next-16.3.0-prerender.json"), "utf8"));
    const changed = applyNextPrerenderPatch(join(projectRoot, "node_modules/next"), recipe);
    console.log(`Next.js prerender patch verified (${changed} files updated).`);
  } catch (error) {
    console.error(`Next.js prerender patch failed: ${error.message}`);
    process.exitCode = 1;
  }
}
