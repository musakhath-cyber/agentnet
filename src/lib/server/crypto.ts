import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { API_KEY_PREFIX, API_KEY_PREFIXES } from "@/lib/constants";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function looksLikeApiKey(raw: string): boolean {
  return API_KEY_PREFIXES.some((prefix) => raw.startsWith(prefix));
}

export function newApiKeySecret(): { plaintext: string; prefix: string; hash: string } {
  const secret = randomToken(24);
  const plaintext = `${API_KEY_PREFIX}${secret}`;
  const prefix = plaintext.slice(0, 16);
  return { plaintext, prefix, hash: sha256(plaintext) };
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
