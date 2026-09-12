type LogFields = Record<string, unknown>;

const SECRET_KEY = /authorization|secret|password|passwd|api[_-]?key|cookie|set-cookie|token|bearer/i;

function redact(fields?: LogFields): LogFields | undefined {
  if (!fields) return fields;
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEY.test(key)) continue;
    if (typeof value === "string" && /bearer\s+[a-z0-9_-]+/i.test(value)) {
      out[key] = value.replace(/bearer\s+[a-z0-9_-]+/gi, "Bearer [redacted]");
      continue;
    }
    out[key] = value;
  }
  return out;
}

function emit(level: "info" | "warn" | "error", msg: string, fields?: LogFields) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...redact(fields),
  };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const log = {
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
  api: (fields: LogFields) => emit("info", "api.request", fields),
  task: (fields: LogFields) => emit("info", "task.event", fields),
};
