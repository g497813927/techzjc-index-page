# Repository Guide

## Commands

- `npm run dev`: run `prepare-env`, then start the Next.js development server.
- `npm run build`: run `prepare-env`, then create the webpack production build.
- `npm run lint`: run ESLint across the repository.
- `npm run test:prepare-env`: run the `prepare-env` regression check in disposable temporary repositories; it does not read or modify this workspace's environment files.
- `npm run prepare-env`: refresh only `NEXT_PUBLIC_COMMIT_SHA` and `NEXT_PUBLIC_BUILD_TIME` in `.env.local` while preserving unrelated local entries, then regenerate license data. `dev` and `build` invoke this automatically.

## Core boundaries

- `src/app/scanner-404/` owns the scanner-404 route and its request/IP handling logic.
- `src/app/[lang]/markdown/` and its descendants are the localized Markdown route family.
- `src/instrumentation.ts` and `src/instrumentation-client.ts` are the server/edge and browser instrumentation entry points; keep runtime-specific setup in the matching file.

## Companion rules

- When changing user-visible copy, update both `src/app/[lang]/dictionaries/en-US.json` and `src/app/[lang]/dictionaries/zh-CN.json`.
- `content/blog/` is synchronized from an external repository during the build; do not edit it directly in this repository.
