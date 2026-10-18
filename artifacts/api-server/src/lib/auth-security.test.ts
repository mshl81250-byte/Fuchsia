import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { hashPassword, needsPasswordUpgrade, shouldReturnDebugOtp, verifyPassword } from "./auth-security.js";

test("scrypt password hashes are salted and verify only the matching password", () => {
  const firstHash = hashPassword("correct horse battery staple");
  const secondHash = hashPassword("correct horse battery staple");

  assert.match(firstHash, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.notEqual(firstHash, secondHash);
  assert.equal(verifyPassword("correct horse battery staple", firstHash), true);
  assert.equal(verifyPassword("incorrect password", firstHash), false);
  assert.equal(needsPasswordUpgrade(firstHash), false);
});

test("legacy SHA-256 password hashes remain valid and are marked for gradual upgrade", () => {
  const legacyHash = crypto.createHash("sha256")
    .update("existing passwordfuchsia_salt_2024")
    .digest("hex");

  assert.equal(verifyPassword("existing password", legacyHash), true);
  assert.equal(verifyPassword("wrong password", legacyHash), false);
  assert.equal(needsPasswordUpgrade(legacyHash), true);
  assert.equal(verifyPassword("existing password", null), false);
});

test("debug OTP is returned only when explicitly enabled in development", () => {
  assert.equal(shouldReturnDebugOtp("development", "true"), true);
  assert.equal(shouldReturnDebugOtp("production", "true"), false);
  assert.equal(shouldReturnDebugOtp("test", "true"), false);
  assert.equal(shouldReturnDebugOtp("development", "false"), false);
  assert.equal(shouldReturnDebugOtp(undefined, "true"), false);
});
