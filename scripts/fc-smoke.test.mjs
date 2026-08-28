#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertAccountMatches,
  assertHealthyPayload,
  assertImageMatches,
  functionOwnerId,
  functionInfoCommandArgs,
  parseFunctionInfo,
  parseInvokeResult,
  waitForHealthyPayload,
} from "./fc-smoke.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(scriptDirectory, "fc-smoke.mjs");
const fixturePath = path.join(
  scriptDirectory,
  "fixtures",
  "fc-smoke-success.txt",
);
const functionInfoFixturePath = path.join(
  scriptDirectory,
  "fixtures",
  "fc-smoke-function-info.txt",
);
const fixtureOutput = fs.readFileSync(fixturePath, "utf8");
const fixtureAccountId = "1234567890123456";
const fixtureBlogRevision = "beadfeedbeadfeedbeadfeedbeadfeedbeadfeed";
const fixtureImage = "ghcr.io/techzjc/site-index@sha256:fixture-digest";
const baseArguments = [
  scriptPath,
  "--fixture",
  fixturePath,
  "--function-info-fixture",
  functionInfoFixturePath,
  "--function",
  "fixture-function",
  "--region",
  "fixture-region",
  "--revision",
  "fixture-revision@sha256:fixture-digest",
  "--expected-account-id",
  fixtureAccountId,
  "--expected-blog-revision",
  fixtureBlogRevision,
  "--expected-image",
  fixtureImage,
];

function argumentsWith(overrides) {
  const args = [...baseArguments];
  for (const [name, value] of Object.entries(overrides)) {
    const index = args.indexOf(name);
    if (index === -1) {
      args.push(name, value);
    } else {
      args[index + 1] = value;
    }
  }
  return args;
}

describe("FC post-deploy smoke fixture", () => {
  test("accepts the representative health payload for the deployed commit", () => {
    const payload = parseInvokeResult(fixtureOutput);

    assert.deepEqual(
      assertHealthyPayload(
        payload,
        "0123456",
        "fixture-region",
        fixtureBlogRevision,
      ),
      payload,
    );
  });

  test("waits for an otherwise healthy stale FC instance to roll forward", async () => {
    const stalePayload = parseInvokeResult(fixtureOutput);
    stalePayload.commit = "7654321";
    const outputs = [
      `${fixtureOutput.slice(0, fixtureOutput.lastIndexOf("{"))}${JSON.stringify(stalePayload)}`,
      fixtureOutput,
    ];
    const delays = [];
    const retries = [];

    const payload = await waitForHealthyPayload({
      invoke: async () => outputs.shift(),
      expectedCommit: "0123456",
      expectedRegion: "fixture-region",
      expectedBlogRevision: fixtureBlogRevision,
      retryDelaysMs: [25, 50],
      sleep: async (milliseconds) => delays.push(milliseconds),
      onRetry: (retry) => retries.push(retry),
    });

    assert.equal(payload.commit, "0123456");
    assert.deepEqual(delays, [25]);
    assert.equal(retries.length, 1);
    assert.equal(retries[0].delayMs, 25);
    assert.equal(retries[0].nextAttempt, 2);
    assert.equal(retries[0].maxAttempts, 3);
    assert.match(retries[0].error.message, /expected commit=0123456/);
  });

  test("fails closed when stale FC instances exhaust the rollout attempts", async () => {
    const stalePayload = parseInvokeResult(fixtureOutput);
    stalePayload.blogRevision = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    const staleOutput =
      `${fixtureOutput.slice(0, fixtureOutput.lastIndexOf("{"))}${JSON.stringify(stalePayload)}`;
    let invocations = 0;

    await assert.rejects(
      waitForHealthyPayload({
        invoke: async () => {
          invocations += 1;
          return staleOutput;
        },
        expectedCommit: "0123456",
        expectedRegion: "fixture-region",
        expectedBlogRevision: fixtureBlogRevision,
        retryDelaysMs: [0],
        sleep: async () => {},
      }),
      new RegExp(
        `expected blogRevision=${fixtureBlogRevision}.*did not converge after 2 attempts`,
      ),
    );
    assert.equal(invocations, 2);
  });

  test("does not retry a response with the wrong region", async () => {
    const wrongRegionPayload = parseInvokeResult(fixtureOutput);
    wrongRegionPayload.region = "other-region";
    const wrongRegionOutput =
      `${fixtureOutput.slice(0, fixtureOutput.lastIndexOf("{"))}${JSON.stringify(wrongRegionPayload)}`;
    let invocations = 0;
    let delays = 0;

    await assert.rejects(
      waitForHealthyPayload({
        invoke: async () => {
          invocations += 1;
          return wrongRegionOutput;
        },
        expectedCommit: "0123456",
        expectedRegion: "fixture-region",
        expectedBlogRevision: fixtureBlogRevision,
        retryDelaysMs: [0, 0],
        sleep: async () => {
          delays += 1;
        },
      }),
      /expected region=fixture-region/,
    );
    assert.equal(invocations, 1);
    assert.equal(delays, 0);
  });

  test("does not retry a response with an invalid revision contract", async () => {
    const invalidPayload = parseInvokeResult(fixtureOutput);
    delete invalidPayload.commit;
    const invalidOutput =
      `${fixtureOutput.slice(0, fixtureOutput.lastIndexOf("{"))}${JSON.stringify(invalidPayload)}`;
    let invocations = 0;
    let delays = 0;

    await assert.rejects(
      waitForHealthyPayload({
        invoke: async () => {
          invocations += 1;
          return invalidOutput;
        },
        expectedCommit: "0123456",
        expectedRegion: "fixture-region",
        expectedBlogRevision: fixtureBlogRevision,
        retryDelaysMs: [0, 0],
        sleep: async () => {
          delays += 1;
        },
      }),
      /expected commit to be a 7-40 character lowercase Git SHA/,
    );
    assert.equal(invocations, 1);
    assert.equal(delays, 0);
  });

  test("extracts the deployed image from FC function metadata", () => {
    const functionInfo = parseFunctionInfo(
      fs.readFileSync(functionInfoFixturePath, "utf8"),
    );

    assert.equal(
      assertImageMatches(functionInfo, fixtureImage),
      fixtureImage,
    );
    assert.deepEqual(functionOwnerId(functionInfo), {
      status: "ok",
      accountId: fixtureAccountId,
    });
    assert.equal(
      assertAccountMatches(functionInfo, fixtureAccountId),
      fixtureAccountId,
    );
  });

  test("requests machine-readable function metadata from Serverless Devs", () => {
    assert.deepEqual(
      functionInfoCommandArgs(
        "fixture-region",
        "fixture-function",
        "/tmp/function-info.json",
      ),
      [
        "cli",
        "fc3",
        "info",
        "--region",
        "fixture-region",
        "--function-name",
        "fixture-function",
        "--access",
        "default_serverless_devs_key",
        "--silent",
        "--output-format",
        "json",
        "--output-file",
        "/tmp/function-info.json",
      ],
    );
  });

  test("runs the same CLI path without cloud access", () => {
    const result = spawnSync(
      process.execPath,
      [...baseArguments, "--expected-commit", "0123456"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /FC smoke accepted/);
    assert.match(result.stdout, /function=fixture-function/);
    assert.match(result.stdout, /revision=fixture-revision@sha256:fixture-digest/);
    assert.match(result.stdout, /blogRevision=beadfeedbeadfeedbeadfeedbeadfeedbeadfeed/);
    assert.match(result.stdout, new RegExp(`account=${fixtureAccountId}`));
    assert.match(result.stdout, new RegExp(`image=${fixtureImage.replace(/[\\/.:]/g, "\\$&")}`));
  });

  test("rejects a response from a different region", () => {
    const payload = parseInvokeResult(fixtureOutput);

    assert.throws(
      () =>
        assertHealthyPayload(
          payload,
          "0123456",
          "other-region",
          fixtureBlogRevision,
        ),
      /expected region=other-region/,
    );
  });

  test("rejects a payload missing the baked-in blog revision", () => {
    const payload = parseInvokeResult(fixtureOutput);
    delete payload.blogRevision;

    assert.throws(
      () =>
        assertHealthyPayload(
          payload,
          "0123456",
          "fixture-region",
          fixtureBlogRevision,
        ),
      /expected blogRevision to be a 40-character lowercase Git SHA/,
    );
  });

  test("rejects a stale revision with function and revision diagnostics", () => {
    const result = spawnSync(
      process.execPath,
      [...baseArguments, "--expected-commit", "7654321"],
      {
        encoding: "utf8",
        env: { ...process.env, GITHUB_ACTIONS: "true" },
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /::error title=FC post-deploy smoke rejected::/);
    assert.match(result.stderr, /function=fixture-function/);
    assert.match(result.stderr, /revision=fixture-revision@sha256:fixture-digest/);
    assert.match(result.stderr, /expected commit=7654321/);
    assert.match(result.stderr, /rollout did not converge after 1 attempt$/m);
  });

  test("rejects the same site commit paired with a different blog revision", () => {
    const staleBlogRevision = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    const result = spawnSync(
      process.execPath,
      argumentsWith({
        "--expected-commit": "0123456",
        "--expected-blog-revision": staleBlogRevision,
      }),
      {
        encoding: "utf8",
        env: { ...process.env, GITHUB_ACTIONS: "true" },
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /::error title=FC post-deploy smoke rejected::/);
    assert.match(
      result.stderr,
      new RegExp(`expected blogRevision=${staleBlogRevision}`),
    );
    assert.match(result.stderr, new RegExp(`received "${fixtureBlogRevision}"`));
  });

  test("rejects the same site commit paired with a different image digest", () => {
    const staleImage = "ghcr.io/techzjc/site-index@sha256:stale-digest";
    const result = spawnSync(
      process.execPath,
      argumentsWith({
        "--expected-commit": "0123456",
        "--expected-image": staleImage,
      }),
      {
        encoding: "utf8",
        env: { ...process.env, GITHUB_ACTIONS: "true" },
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /::error title=FC post-deploy smoke rejected::/);
    assert.match(result.stderr, new RegExp(`expected image=${staleImage}`));
    assert.match(result.stderr, new RegExp(`received image=${fixtureImage}`));
  });

  test("rejects FC metadata that does not expose a container image", () => {
    const result = spawnSync(
      process.execPath,
      argumentsWith({
        "--expected-commit": "0123456",
        "--function-info-fixture": path.join(
          scriptDirectory,
          "fixtures",
          "fc-smoke-function-info-no-image.txt",
        ),
      }),
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /did not expose a container image/);
  });

  test("rejects a function owned by a different account before invoking", () => {
    const result = spawnSync(
      process.execPath,
      argumentsWith({
        "--expected-commit": "0123456",
        "--function-info-fixture": path.join(
          scriptDirectory,
          "fixtures",
          "fc-smoke-function-info-wrong-account.txt",
        ),
      }),
      {
        encoding: "utf8",
        env: { ...process.env, GITHUB_ACTIONS: "true" },
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /::error title=FC post-deploy smoke rejected::/);
    assert.match(result.stderr, new RegExp(`expected account=${fixtureAccountId}`));
    assert.match(result.stderr, /received function owner=9999999999999999/);
    assert.match(result.stderr, /ALIYUN_ACCOUNT_ID/);
  });

  test("rejects FC metadata that does not expose a functionArn", () => {
    const functionInfo = parseFunctionInfo(
      fs.readFileSync(functionInfoFixturePath, "utf8"),
    );
    delete functionInfo.functionArn;

    assert.throws(
      () => assertAccountMatches(functionInfo, fixtureAccountId),
      /did not expose a functionArn/,
    );
  });

  test("rejects FC metadata with an unparseable functionArn", () => {
    const functionInfo = parseFunctionInfo(
      fs.readFileSync(functionInfoFixturePath, "utf8"),
    );
    functionInfo.functionArn = "not-a-valid-arn";

    assert.throws(
      () => assertAccountMatches(functionInfo, fixtureAccountId),
      /not a recognized FC ARN/,
    );
  });

  test("does not accept JSON printed outside the Invoke Result boundary", () => {
    assert.throws(
      () => parseInvokeResult('{"status":"ok"}'),
      /did not contain Invoke Result:/,
    );
  });

  test("does not accept function metadata without customContainerConfig", () => {
    assert.throws(
      () => parseFunctionInfo('{"functionName":"fixture-function"}'),
      /did not contain a customContainerConfig JSON object/,
    );
  });
});
