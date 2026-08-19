#!/usr/bin/env node
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const INVOKE_RESULT_MARKER = "Invoke Result:";
const EXPECTED_SERVICE = "techzjc-index";

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
  if (typeof arn !== "string") {
    return null;
  }
  const match = arn.match(/^acs:fc:[^:]*:([^:]+):functions\//);
  return match ? match[1] : null;
}

export function assertAccountMatches(functionInfo, expectedAccountId) {
  const ownerId = functionOwnerId(functionInfo);
  if (!ownerId) {
    throw new Error(
      `FC metadata did not expose a functionArn (expected account=${expectedAccountId}); cannot verify the invoke endpoint account`,
    );
  }
  if (ownerId !== expectedAccountId) {
    throw new Error(
      `expected account=${expectedAccountId}, received function owner=${ownerId}; ` +
        "the credentials AccountID (ALIYUN_ACCOUNT_ID) must match the account owning the FC function, " +
        "otherwise the invoke endpoint targets the wrong account namespace",
    );
  }
  return ownerId;
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
  if (payload.commit !== expectedCommit) {
    throw new Error(
      `expected commit=${expectedCommit}, received ${JSON.stringify(payload.commit)}`,
    );
  }
  if (payload.blogRevision !== expectedBlogRevision) {
    throw new Error(
      `expected blogRevision=${expectedBlogRevision}, received ${JSON.stringify(payload.blogRevision)}`,
    );
  }

  return payload;
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

async function fetchFunctionInfo(options) {
  if (options["--function-info-fixture"]) {
    return fs.readFile(options["--function-info-fixture"], "utf8");
  }

  return runServerlessDevs(
    [
      "cli",
      "fc3",
      "info",
      "--region",
      options["--region"],
      "--function-name",
      options["--function"],
      "--access",
      "default_serverless_devs_key",
    ],
    "Serverless Devs metadata lookup failed",
  );
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
    const output = await invokeFunction(options);
    const payload = assertHealthyPayload(
      parseInvokeResult(output),
      options["--expected-commit"],
      options["--region"],
      options["--expected-blog-revision"],
    );
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
