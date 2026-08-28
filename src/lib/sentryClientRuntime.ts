"use client";

// Keep this boundary deliberately narrow. Dynamically importing the complete
// @sentry/nextjs namespace prevents webpack from pruning optional Replay and
// rrweb exports from the client chunk.
export {
  captureRouterTransitionStart,
  init,
  thirdPartyErrorFilterIntegration,
} from "@sentry/nextjs";
