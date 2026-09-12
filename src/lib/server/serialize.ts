import { asJson, type Json } from "@/lib/json";

export function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
}

export function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function bool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export function jsonValue(value: unknown): Json | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return asJson(JSON.parse(value));
    } catch {
      return value;
    }
  }
  return asJson(value);
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}
