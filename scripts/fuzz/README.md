# Reusable local fuzz tests

From the repository root, install dependencies with `npm ci`, then run:

```sh
npm run fuzz -- --duration 15m
npm run fuzz -- --forever
```

The default is a 60-second campaign. Duration accepts seconds (`30` or `30s`),
minutes (`15m`), or hours (`2h`). `--duration` and `--forever` cannot be combined.
The timer starts after the production build and server readiness checks. The
current batch completes when the duration expires, so the elapsed time can exceed
that duration by up to the 120-second batch deadline. At least one batch runs.

`--forever` continues until Ctrl+C, a failed assertion, or an infrastructure error.
Ctrl+C and SIGTERM stop child processes and save a partial report; an interrupted
batch is identified by its suite, seed, and case budget, but is excluded from
completed totals. Exit codes are 0 for a completed passing campaign, 1 for a
finding/infrastructure error, 130 for SIGINT, and 143 for SIGTERM.

## Select and reproduce tests

```sh
# Both HTTP corpora, with a repeatable initial seed
npm run fuzz:http -- --duration 15m --seed 20260911

# Offline helper properties; no production build or HTTP server needed
npm run fuzz:helpers -- --duration 30s --cases 2500

# Choose a new report directory
npm run fuzz -- --duration 15m --output /tmp/my-site-fuzz-run

npm run fuzz -- --help
```

`--suite all` (default) rotates through standard HTTP, extended HTTP, and offline
helper batches. `--suite http` runs both HTTP corpora; `--suite helpers` runs only
helper properties. Each batch gets a deterministic nonzero 32-bit seed, derived
from the initial `--seed` (random when omitted). The case count defaults to 600
and accepts 1–3000. For HTTP it controls generated inputs in addition to fixed
regressions; for helpers it controls cases per property family.

Repeat the same campaign with its recorded initial seed, case count, and suite.
The batch order and inputs repeat; the number of batches reached in a duration
can vary with machine speed. For a single HTTP batch against an already-running
isolated local test server, use the exact suite/seed/cases from its report:

```sh
node scripts/fuzz/http.mjs --base-url http://127.0.0.1:3219 --seed 20260911 --cases 600 --summary-only
node scripts/fuzz/extended-http.mjs --base-url http://127.0.0.1:3219 --seed 20260911 --cases 600 --summary-only
node scripts/fuzz/helpers.mjs --seed 20260911 --cases 600
```

These workers print JSON, optionally write `--output FILE`, and exit nonzero on
failure. HTTP workers accept only literal loopback HTTP origins and never follow
redirects. A failed baseline is reported as a failure, even if fuzz cases have
not started.

## Reports and resource use

The runner prints its output directory. By default it uses
`reports/fuzz/runs/<timestamp>-<pid>/`, which is ignored by Git. An explicit output
directory must be new so previous results cannot be overwritten.

- `summary.json` is atomically updated after each batch: source commit, settings,
  elapsed time, completed counts, coverage, next seed, and stop reason.
- `last-http.json`, `last-extended-http.json`, and `last-helpers.json` retain the
  latest completed report per suite, atomically replaced only after a batch
  finishes and its report validates. A finding stops the run, preserving the
  failing inputs. `active-batch.json` may retain partial output after interruption
  or a worker error; previous completed reports remain available.
- `build.log`, `server.log`, and `worker.log` retain at most the last 2 MiB each.

The runner retains aggregate totals and only the latest batch per suite, so
report storage does not grow with the number of batches. To bound Next's generated
route cache too, it stops the local server after every 100 HTTP batches, restores
a pristine copy of the build, and starts it again. Restarts are counted in the
summary. The temporary build is removed after all child processes stop. A failed
cleanup is reported as an error. POSIX process groups include build descendants;
on Windows the runner can terminate direct children only.

## Scope

The runner builds the checked-out site in a disposable directory with synthetic
credentials, telemetry disabled, and a global-fetch guard allowing only that
local server and inline data URLs. It does not load workspace `.env` files or
change the workspace `.next` directory. Available local blog content is copied;
when it is absent, small local fixtures are created only in the disposable copy.
The report records which content source was used. No synchronized blog files are
edited. The temporary config uses `next start` with the site's TRACE preload;
this campaign does not validate a Docker image, hosted CDN, or FC deployment.

Coverage includes locale negotiation, malformed/encoded paths, percent-path
regressions, methods/TRACE/Expect behavior, body byte limits and JSON boundaries,
image inputs and dimensions, QR limits, host/origin checks, and helper properties
for navigation, redaction, manifests, IP handling, and streamed request bodies.
Fuzzing checks selected assertions and is not an exhaustive correctness proof.
The helper report separately counts the existing scanner behavior that accepts
zero-width IPv6 `::` compression; its accommodation is narrowly checked in the
worker and does not suppress other properties.

Run `npm run test:fuzz-runner` for CLI, lifecycle, report, and interruption checks.
`npm run test:fuzz-production` builds the real isolated site, runs an HTTP batch,
and verifies reports, final health, and cleanup. Both are included in `npm test`,
alongside the existing production regressions.
