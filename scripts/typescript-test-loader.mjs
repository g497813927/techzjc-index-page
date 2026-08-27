import { readFile } from "node:fs/promises";

import ts from "typescript";

const ALLOWED_TYPESCRIPT_MODULES = new Set([
  new URL("../src/lib/browserSecurity.ts", import.meta.url).href,
  new URL("../src/lib/readLimitedRequestBody.ts", import.meta.url).href,
]);

export async function load(url, context, nextLoad) {
  if (!ALLOWED_TYPESCRIPT_MODULES.has(url)) {
    return nextLoad(url, context);
  }

  const source = await readFile(new URL(url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: new URL(url).pathname,
  });

  return {
    format: "module",
    shortCircuit: true,
    source: outputText,
  };
}
