#!/usr/bin/env node
/**
 * Full-runtime release acceptance, not a static renderer-preview check.
 * Example: QA_BASE=http://127.0.0.1:4175 node scripts/check-production-api-contract.mjs
 * Start the built API-serving app with PORT=4175 pnpm start first.
 * Reports no response body, credentials or query tokens.
 */
import assert from "node:assert/strict";

assert(process.env.QA_BASE, "Set QA_BASE to the full API-serving release URL, not standalone vite preview");
const base = new URL(process.env.QA_BASE);
assert(["http:", "https:"].includes(base.protocol), "QA_BASE must use HTTP(S)");
assert(!base.username && !base.password && !base.search && !base.hash, "QA_BASE must not contain credentials, query parameters or fragments");
const endpoint = new URL("/api/trpc/auth.me", base);
endpoint.searchParams.set("batch", "1");
endpoint.searchParams.set("input", JSON.stringify({ "0": {} }));
const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
const contentType = response.headers.get("content-type") || "";
assert.equal(response.status, 200, `auth.me returned HTTP ${response.status}`);
assert.match(contentType, /^application\/json(?:;|$)/i, `auth.me returned ${contentType || "no content-type"}; expected API JSON, not SPA HTML`);
const parsed = await response.json();
assert(Array.isArray(parsed) && parsed.length === 1, "Expected one tRPC batch result");
assert(parsed[0]?.result?.data, "Expected a successful tRPC auth.me data response");
console.log(JSON.stringify({ status: "PASS", endpoint: endpoint.pathname, contentType }, null, 2));
