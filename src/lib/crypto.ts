import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// AES-256-GCM for data we must be able to read back (phone numbers, status links). Format: iv.tag.ciphertext (base64url).
function key() {
  const k = Buffer.from(process.env.BARS_ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("BARS_ENCRYPTION_KEY must be 32 bytes (openssl rand -base64 32)");
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(sealed: string): string {
  const [iv, tag, data] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// Keyed hash for lookups (a plain hash of a 10-digit phone number is easy to reverse).
export const keyedHash = (value: string) => createHmac("sha256", key()).update(value).digest("base64url");
