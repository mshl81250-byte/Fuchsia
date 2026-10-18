import test from "node:test";
import assert from "node:assert/strict";
import { activationUrl, hashActivationToken } from "./partner-activation-crypto.js";

test("activation tokens are hashed deterministically and never exposed in the digest", () => {
  const token = "a".repeat(64);
  const digest = hashActivationToken(token);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(digest, token);
  assert.equal(hashActivationToken(token), digest);
});

test("activation URL uses the configured public base and embeds the raw token only in the link", () => {
  const previous = process.env.PARTNER_ACTIVATION_BASE_URL;
  process.env.PARTNER_ACTIVATION_BASE_URL = "https://example.test/";
  try {
    assert.equal(activationUrl("abc123"), "https://example.test/api/auth/partner-activation/abc123");
  } finally {
    if (previous === undefined) delete process.env.PARTNER_ACTIVATION_BASE_URL;
    else process.env.PARTNER_ACTIVATION_BASE_URL = previous;
  }
});
