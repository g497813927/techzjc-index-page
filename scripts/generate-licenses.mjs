#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import licenseChecker from "license-checker";

licenseChecker.init(
  {
    start: process.cwd(),
    production: true,
  },
  (err, packages) => {
    if (err) {
      console.error("Error running license-checker", err);
      process.exit(1);
    }

    const result = Object.entries(packages).map(([id, info]) => {
      let licenseText = "";
      if (info.licenseFile && fs.existsSync(info.licenseFile)) {
        licenseText = fs.readFileSync(info.licenseFile, "utf8");
      }

      return {
        id,
        name: info.name || id.startsWith("@")
          ? "@" + id.split("@")[1]
          : id.split("@")[0],
        version: info.version,
        licenses: info.licenses,
        licenseFile: info.licenseFile,
        repository: info.repository,
        licenseText,
      };
    });

    const outDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    const outFile = path.join(outDir, "LICENSES.json");
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));

    console.log(`Wrote ${result.length} license entries to ${outFile}`);
  }
);
