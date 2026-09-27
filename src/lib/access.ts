import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const newAccessToken = () => randomBytes(24).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function tokenMatches(request: Request, storedHash: string | null): boolean {
  const token = request.headers.get("x-access-token");
  if (!token || !storedHash) return false;
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unauthorized = () => Response.json({ error: "Not authorized" }, { status: 401 });
