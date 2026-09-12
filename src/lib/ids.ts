const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeCrockford(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  return out;
}

/** ULID-style 26-char id (time-sortable Crockford base32). */
export function ulid(now = Date.now()): string {
  const time = new Uint8Array(6);
  let t = now;
  for (let i = 5; i >= 0; i -= 1) {
    time[i] = t & 0xff;
    t = Math.floor(t / 256);
  }
  const rand = new Uint8Array(10);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(rand);
  } else {
    for (let i = 0; i < 10; i += 1) rand[i] = Math.floor(Math.random() * 256);
  }
  const bytes = new Uint8Array(16);
  bytes.set(time, 0);
  bytes.set(rand, 6);
  return encodeCrockford(bytes).slice(0, 26);
}

export function newId(prefix: string): string {
  return `${prefix}_${ulid()}`;
}

export function agentId(): string {
  return newId("agent");
}

export function taskId(): string {
  return newId("task");
}

export function isPrefixedId(value: string, prefix: string): boolean {
  return new RegExp(`^${prefix}_[0-9A-HJKMNP-TV-Z]{26}$`).test(value);
}
