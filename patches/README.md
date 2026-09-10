# Next.js prerender pathname patch

Next.js 16.3.0 passes an already decoded `resolvedPathname` to the App Router's
prerender matcher. That matcher decodes dynamic parameters again. A valid request
such as `/en-US/blog/2026/01/01/%25` consequently throws a decode error before the
missing-post handler can return 404.

`next-16.3.0-prerender.json` changes the matcher argument to
`prepareResult.encodedResolvedPathname` in both CommonJS and ES module build
templates. The decoded pathname remains in use for manifest lookups and cache
keys. The patch does not change static-generation/ISR configuration or the blog
route's rendering configuration.

`npm install` and `npm ci` run `scripts/patch-next-prerender.mjs` through
`postinstall`. The Docker dependency stage copies the script and recipe before
installing dependencies. The installer has no package dependencies. It checks the
exact Next.js version and both complete source-file SHA-256 hashes before writing
either file, and also checks the resulting hashes. Running it again accepts the
exact patched files without rewriting them. Unknown source content or versions
fail the install with an explanatory error.

If dependencies were installed with `--ignore-scripts`, explicitly run
`npm run postinstall` before building. Never deploy a build that bypasses this
step. `npm run test:next-prerender-patch` checks the installer against disposable
fixtures, including idempotence and refusal to mutate files when either format
has drifted.

Next.js is pinned to `16.3.0` while this patch is needed. When upgrading:

1. Check whether the upstream matcher now receives the encoded pathname.
2. Run the production pathname regressions with the unpatched candidate version,
   including percent escapes, Unicode, existing static posts, and cache behavior.
3. If the upstream release fixes the issue, remove the recipe, installer,
   installer tests, `postinstall`/test entries, and Docker copy instructions in the
   same upgrade. Otherwise review the source change and regenerate both exact
   source and output hashes deliberately; do not weaken the checksum checks.

The recipe's `from` and `to` values show the full code change. Its hashes refer to
the published `next@16.3.0` package files.
