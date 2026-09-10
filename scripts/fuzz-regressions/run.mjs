// Discover test files without relying on shell glob or Node directory expansion.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const directory = new URL("./", import.meta.url);
const files = readdirSync(directory, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith(".test.mjs"))
  .map(entry => fileURLToPath(new URL(entry.name, directory)))
  .sort();
if (files.length === 0) throw new Error("No fuzz regression tests found");

const result = spawnSync(process.execPath, [
  "--loader", fileURLToPath(new URL("typescript-loader.mjs", directory)),
  "--test", ...files,
], { stdio: "inherit" });
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
