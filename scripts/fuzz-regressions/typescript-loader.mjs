// Test-only transpilation for repository source; production uses the Next compiler.
import { stat, readFile } from "node:fs/promises";
import ts from "typescript";

const sourceRoot = new URL("../../src/", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  // server-only is a build-time Next marker, not runtime behavior under test.
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (["next/server", "next/navigation", "next/og"].includes(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }
  let candidate;
  if (specifier.startsWith("@/")) candidate = new URL(specifier.slice(2), sourceRoot).href;
  else if (specifier.startsWith(".") && context.parentURL?.startsWith(sourceRoot)) {
    candidate = new URL(specifier, context.parentURL).href;
  }
  if (candidate) {
    for (const suffix of ["", ".ts", ".tsx", ".mjs", "/index.ts"]) {
      try {
        if (!(await stat(new URL(candidate + suffix))).isFile()) continue;
        return { url: candidate + suffix, shortCircuit: true };
      } catch { /* Try the next source extension. */ }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith(sourceRoot) && /\.tsx?$/.test(url)) {
    const source = await readFile(new URL(url), "utf8");
    const { outputText } = ts.transpileModule(source, {
      fileName: new URL(url).pathname,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    return { format: "module", shortCircuit: true, source: outputText };
  }
  if (url.startsWith(sourceRoot) && url.endsWith(".json")) {
    return { format: "module", shortCircuit: true, source: `export default ${await readFile(new URL(url), "utf8")};` };
  }
  return nextLoad(url, context);
}
