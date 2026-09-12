const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "host.docker.internal",
]);

function isPrivateIPv4(host: string): boolean {
  if (/^(10|127)\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/.test(host)) return true;
  return false;
}

function isPrivateHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTS.has(h) || BLOCKED_HOSTS.has(host.toLowerCase())) return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return true;
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  if (h.includes(":")) {
    if (h === "::1") return true;
    if (h.startsWith("fe80:")) return true;
    if (h.startsWith("fc") || h.startsWith("fd")) return true;
  }
  return isPrivateIPv4(h);
}

export function assertSafeEndpoint(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "Endpoint is not a valid URL." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Endpoint must be http or https." };
  }
  if (isPrivateHost(url.hostname)) {
    return { ok: false, error: "Private network endpoints are not allowed." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Endpoints must not include credentials." };
  }
  return { ok: true, url: url.toString() };
}

export function sanitizeText(value: string, max = 4000): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export function looksLikePromptInjection(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes("ignore previous") ||
    v.includes("ignore all instructions") ||
    v.includes("system prompt") ||
    v.includes("you are now")
  );
}