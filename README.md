# Techzjc Index Page

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/g497813927/techzjc-index-page/build-container.yml?branch=main)](https://github.com/g497813927/techzjc-index-page/actions/workflows/build-container.yml) [![GitHub license](https://img.shields.io/github/license/g497813927/techzjc-index-page)](https://github.com/g497813927/techzjc-index-page/blob/main/LICENSE) [![GitHub issues](https://img.shields.io/github/issues/g497813927/techzjc-index-page)](https://github.com/g497813927/techzjc-index-page/issues) [![GitHub pull requests](https://img.shields.io/github/issues-pr/g497813927/techzjc-index-page)](https://github.com/g497813927/techzjc-index-page/pulls) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/g497813927/techzjc-index-page) 

This is the index page for Techzjc's personal site using React + TypeScript + Next.js framework.

## Node.js runtime

Use Node.js 24.22.1 or a newer 24.x release. This is the minimum patched 24.x version for the [October 2026 security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).

```sh
nvm install
nvm use
npm ci
```

CI reads `.nvmrc`, and every Docker stage uses `node:24.22.1-alpine`. Keep these versions aligned when updating Node.js. The package engine range also selects Node 24 on Vercel, where minor and patch versions are managed by the platform. Rebuild and redeploy existing containers to apply runtime fixes; changing npm packages alone does not update Node.js.

## TypeScript compilers

`npm run typecheck` uses the TypeScript 7 native compiler. Both production build commands run this check after Next.js generates its route types. The `typescript` dependency aliases Microsoft's TypeScript 6 compatibility package because ESLint, the Next.js editor plugin, and the test loaders still use its JavaScript compiler API. The native compiler is installed separately as `@typescript/native`, following [Microsoft's side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0). Keep both dependencies until those API consumers support TypeScript 7.

## Any suggestions or issues?

Feel free to open an issue or a pull request!

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
