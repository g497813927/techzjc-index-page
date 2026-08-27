#!/usr/bin/env node
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const INVOKE_RESULT_MARKER = "Invoke Result:";
const EXPECTED_SERVICE = "techzjc-index";
const ROLLOUT_RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000, 30_000];

class StaleDeploymentRevisionError extends Error {
  constructor(message) {
    super(message);
    this.name = "StaleDeploymentRevisionError";
  }
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function parseJsonObjectAt(value, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        const candidate = value.slice(start, index + 1);
        try {
          return { object: JSON.parse(candidate), end: index + 1 };
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function parseFirstJsonObject(value) {
  const start = value.indexOf("{");
  if (start === -1) {
    throw new Error("Invoke Result did not contain a JSON object");
  }

  const parsed = parseJsonObjectAt(value, start);
  if (!parsed) {
    throw new Error("Invoke Result contained an invalid or incomplete JSON object");
  }

  return parsed.object;
}

export function parseInvokeResult(output) {
  const normalized = stripAnsi(output).replaceAll("\r\n", "\n");
  const markerIndex = normalized.lastIndexOf(INVOKE_RESULT_MARKER);
  if (markerIndex === -1) {
    throw new Error(`Serverless Devs output did not contain ${INVOKE_RESULT_MARKER}`);
  }

  return parseFirstJsonObject(
    normalized.slice(markerIndex + INVOKE_RESULT_MARKER.length),
  );
}

export function parseFunctionInfo(output) {
  const normalized = stripAnsi(output).replaceAll("\r\n", "\n");

  for (
    let index = normalized.indexOf("{");
    index !== -1;
    index = normalized.indexOf("{", index + 1)
  ) {
    const parsed = parseJsonObjectAt(normalized, index);
    if (!parsed) {
      continue;
    }
    const { object } = parsed;
    if (
      object &&
      typeof object === "object" &&
      !Array.isArray(object) &&
      object.customContainerConfig
    ) {
      return object;
    }
  }

  throw new Error(
    "Function metadata did not contain a customContainerConfig JSON object",
  );
}

export function deployedImage(functionInfo) {
  const config = functionInfo?.customContainerConfig;
  if (!config || typeof config !== "object") {
    return null;
  }
  if (typeof config.image === "string" && config.image.length > 0) {
    return config.image;
  }
  if (
    typeof config.resolvedImageUri === "string" &&
    config.resolvedImageUri.length > 0
  ) {
    return config.resolvedImageUri;
  }
  return null;
}

export function assertImageMatches(functionInfo, expectedImage) {
  const actualImage = deployedImage(functionInfo);
  if (!actualImage) {
    throw new Error(
      `FC metadata did not expose a container image (expected image=${expectedImage})`,
    );
  }
  if (actualImage !== expectedImage) {
    throw new Error(
      `expected image=${expectedImage}, received image=${actualImage}`,
    );
  }
  return actualImage;
}

export function functionOwnerId(functionInfo) {
  const arn = functionInfo?.functionArn;
  if (typeof arn !== "string" || arn.length === 0) {
    return { status: "missing" };
  }
  // FC 3.0 ARN: acs:fc:{region}:{accountId}:functions/{functionName}
  // FC 2.0 ARN: acs:fc:{region}:{accountId}:services/{serviceName}/functions/{functionName}
  // Both share the account ID in the 4th colon-delimited segment.
  const match = arn.match(/^acs:fc:[^:]*:([^:]+):/);
  if (!match) {
    return { status: "unparseable", arn };
  }
  return { status: "ok", accountId: match[1] };
}

export function assertAccountMatches(functionInfo, expectedAccountId) {
  const result = functionOwnerId(functionInfo);
  if (result.status === "missing") {
    throw new Error(
      `FC metadata did not expose a functionArn (expected account=${expectedAccountId}); cannot verify the invoke endpoint account`,
    );
  }
  if (result.status === "unparseable") {
    throw new Error(
      `FC metadata functionArn is not a recognized FC ARN (received ${JSON.stringify(result.arn)}, expected account=${expectedAccountId})`,
    );
  }
  if (result.accountId !== expectedAccountId) {
    throw new Error(
      `expected account=${expectedAccountId}, received function owner=${result.accountId}; ` +
        "the credentials AccountID (ALIYUN_ACCOUNT_ID) must match the account owning the FC function, " +
        "otherwise the invoke endpoint targets the wrong account namespace",
    );
  }
  return result.accountId;
}

export function assertHealthyPayload(
  payload,
  expectedCommit,
  expectedRegion,
  expectedBlogRevision,
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invoke Result must be a JSON object");
  }
  if (payload.status !== "ok") {
    throw new Error(`expected status=ok, received ${JSON.stringify(payload.status)}`);
  }
  if (payload.service !== EXPECTED_SERVICE) {
    throw new Error(
      `expected service=${EXPECTED_SERVICE}, received ${JSON.stringify(payload.service)}`,
    );
  }
  if (payload.region !== expectedRegion) {
    throw new Error(
      `expected region=${expectedRegion}, received ${JSON.stringify(payload.region)}`,
    );
  }
  let canonicalTimestamp;
  try {
    canonicalTimestamp = new Date(payload.timestamp).toISOString();
  } catch {
    canonicalTimestamp = null;
  }
  if (canonicalTimestamp !== payload.timestamp) {
    throw new Error(
      `expected an ISO timestamp, received ${JSON.stringify(payload.timestamp)}`,
    );
  }
  if (
    typeof payload.commit !== "string" ||
    !/^[0-9a-f]{7,40}$/.test(payload.commit)
  ) {
    throw new Error(
      `expected commit to be a 7-40 character lowercase Git SHA, received ${JSON.stringify(payload.commit)}`,
    );
  }
  if (
    typeof payload.blogRevision !== "string" ||
    !/^[0-9a-f]{40}$/.test(payload.blogRevision)
  ) {
    throw new Error(
      `expected blogRevision to be a 40-character lowercase Git SHA, received ${JSON.stringify(payload.blogRevision)}`,
    );
  }
  if (
    payload.commit !== expectedCommit ||
    payload.blogRevision !== expectedBlogRevision
  ) {
    throw new StaleDeploymentRevisionError(
      `expected commit=${expectedCommit}, received ${JSON.stringify(payload.commit)}; ` +
        `expected blogRevision=${expectedBlogRevision}, received ${JSON.stringify(payload.blogRevision)}`,
    );
  }

  return payload;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForHealthyPayload({
  invoke,
  expectedCommit,
  expectedRegion,
  expectedBlogRevision,
  retryDelaysMs = ROLLOUT_RETRY_DELAYS_MS,
  sleep = delay,
  onRetry = () => {},
}) {
  if (
    !Array.isArray(retryDelaysMs) ||
    retryDelaysMs.some(
      (milliseconds) => !Number.isFinite(milliseconds) || milliseconds < 0,
    )
  ) {
    throw new Error("retryDelaysMs must contain only non-negative numbers");
  }

  const maxAttempts = retryDelaysMs.length + 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return assertHealthyPayload(
        parseInvokeResult(await invoke()),
        expectedCommit,
        expectedRegion,
        expectedBlogRevision,
      );
    } catch (error) {
      if (!(error instanceof StaleDeploymentRevisionError)) {
        throw error;
      }
      if (attempt === maxAttempts) {
        throw new StaleDeploymentRevisionError(
          `${error.message}; rollout did not converge after ${maxAttempts} attempts`,
        );
      }

      onRetry({
        delayMs: retryDelaysMs[attempt - 1],
        error,
        nextAttempt: attempt + 1,
        maxAttempts,
      });
      await sleep(retryDelaysMs[attempt - 1]);
    }
  }

  throw new Error("FC rollout polling ended without a result");
}

function parseArguments(argv) {
  const options = {};
  const allowed = new Set([
    "--expected-account-id",
    "--expected-blog-revision",
    "--expected-commit",
    "--expected-image",
    "--fixture",
    "--function",
    "--function-info-fixture",
    "--region",
    "--revision",
  ]);

  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(name)) {
      throw new Error(`unknown option ${name ?? "<missing>"}`);
    }
    if (value === undefined || value.length === 0) {
      throw new Error(`${name} requires a non-empty value`);
    }
    if (options[name] !== undefined) {
      throw new Error(`${name} may be provided only once`);
    }
    options[name] = value;
  }

  for (const required of [
    "--expected-account-id",
    "--expected-blog-revision",
    "--expected-commit",
    "--expected-image",
    "--function",
    "--region",
    "--revision",
  ]) {
    if (!options[required]) {
      throw new Error(`${required} is required`);
    }
  }

  return options;
}

async function invokeFunction(options) {
  if (options["--fixture"]) {
    return fs.readFile(options["--fixture"], "utf8");
  }

  return runServerlessDevs(
    [
      "cli",
      "fc3",
      "invoke",
      "--region",
      options["--region"],
      "--function-name",
      options["--function"],
      "--qualifier",
      "LATEST",
      "--invocation-type",
      "Sync",
      "--timeout",
      "30",
      "--event",
      JSON.stringify({ kind: "site-index-readiness" }),
      "--access",
      "default_serverless_devs_key",
    ],
    "Serverless Devs invocation failed",
  );
}

export function functionInfoCommandArgs(region, functionName, outputFile) {
  return [
    "cli",
    "fc3",
    "info",
    "--region",
    region,
    "--function-name",
    functionName,
    "--access",
    "default_serverless_devs_key",
    "--silent",
    "--output-format",
    "json",
    "--output-file",
    outputFile,
  ];
}

async function fetchFunctionInfo(options) {
  if (options["--function-info-fixture"]) {
    return fs.readFile(options["--function-info-fixture"], "utf8");
  }

  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "fc-smoke-metadata-"),
  );
  const outputFile = path.join(temporaryDirectory, "function-info.json");

  try {
    await runServerlessDevs(
      functionInfoCommandArgs(
        options["--region"],
        options["--function"],
        outputFile,
      ),
      "Serverless Devs metadata lookup failed",
    );
    return await fs.readFile(outputFile, "utf8");
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function runServerlessDevs(args, failureTitle) {
  try {
    const { stdout, stderr } = await execFileAsync("s", args, {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 60_000,
    });
    return `${stdout}\n${stderr}`;
  } catch (error) {
    const diagnostic = [error.stderr, error.stdout, error.message]
      .filter((value) => typeof value === "string" && value.trim())
      .join("\n")
      .trim()
      .slice(-2000);
    throw new Error(`${failureTitle}: ${diagnostic}`);
  }
}

function annotationEscape(value) {
  return value
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

export async function run(argv) {
  let options;
  try {
    options = parseArguments(argv);
    const functionInfo = parseFunctionInfo(await fetchFunctionInfo(options));
    const actualAccount = assertAccountMatches(
      functionInfo,
      options["--expected-account-id"],
    );
    const actualImage = assertImageMatches(
      functionInfo,
      options["--expected-image"],
    );
    const payload = await waitForHealthyPayload({
      invoke: () => invokeFunction(options),
      expectedCommit: options["--expected-commit"],
      expectedRegion: options["--region"],
      expectedBlogRevision: options["--expected-blog-revision"],
      retryDelaysMs: options["--fixture"] ? [] : ROLLOUT_RETRY_DELAYS_MS,
      onRetry: ({ delayMs, error, nextAttempt, maxAttempts }) => {
        console.warn(
          `FC smoke waiting for rollout attempt=${nextAttempt}/${maxAttempts} delay=${delayMs}ms reason=${error.message}`,
        );
      },
    });
    console.log(
      [
        "FC smoke accepted",
        `region=${options["--region"]}`,
        `function=${options["--function"]}`,
        `revision=${options["--revision"]}`,
        `commit=${payload.commit}`,
        `blogRevision=${payload.blogRevision}`,
        `account=${actualAccount}`,
        `image=${actualImage}`,
      ].join(" "),
    );
    return 0;
  } catch (error) {
    const region = options?.["--region"] ?? "<missing>";
    const functionName = options?.["--function"] ?? "<missing>";
    const revision = options?.["--revision"] ?? "<missing>";
    const message = [
      "FC smoke rejected",
      `region=${region}`,
      `function=${functionName}`,
      `revision=${revision}`,
      `reason=${error.message}`,
    ].join(" ");

    if (process.env.GITHUB_ACTIONS === "true") {
      console.error(
        `::error title=FC post-deploy smoke rejected::${annotationEscape(message)}`,
      );
    } else {
      console.error(message);
    }
    return 1;
  }
}

const isMain =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  process.exitCode = await run(process.argv.slice(2));
}
