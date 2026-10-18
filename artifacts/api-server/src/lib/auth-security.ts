import crypto from "node:crypto";

const LEGACY_PASSWORD_SUFFIX = "fuchsia_salt_2024";
const SCRYPT_KEY_BYTES = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
const SALT_HEX = /^[a-f0-9]{32}$/i;
const KEY_HEX = /^[a-f0-9]{128}$/i;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_BYTES, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;

  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    const saltHex = parts[1];
    const keyHex = parts[2];
    if (parts.length !== 3 || !saltHex || !keyHex || !SALT_HEX.test(saltHex) || !KEY_HEX.test(keyHex)) {
      return false;
    }
    const expectedKey = Buffer.from(keyHex, "hex");
    const actualKey = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), SCRYPT_KEY_BYTES, SCRYPT_OPTIONS);
    return expectedKey.length === actualKey.length && crypto.timingSafeEqual(expectedKey, actualKey);
  }

  // Legacy SHA-256 hashes remain verifiable so existing accounts can be upgraded at login.
  if (!SHA256_HEX.test(storedHash)) return false;
  const expectedHash = Buffer.from(storedHash, "hex");
  const actualHash = crypto.createHash("sha256").update(password + LEGACY_PASSWORD_SUFFIX).digest();
  return expectedHash.length === actualHash.length && crypto.timingSafeEqual(expectedHash, actualHash);
}

export function needsPasswordUpgrade(storedHash: string | null | undefined): boolean {
  return Boolean(storedHash && !storedHash.startsWith("scrypt$"));
}

export function shouldReturnDebugOtp(nodeEnv: string | undefined, debugFlag: string | undefined): boolean {
  return nodeEnv === "development" && debugFlag === "true";
}
