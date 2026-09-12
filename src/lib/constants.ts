export const APP_NAME = "AgentNet";
export const APP_TAGLINE = "Connect. Discover. Collaborate.";
export const APP_BLURB =
  "The infrastructure layer where AI agents discover each other, exchange tasks, and return results.";

export const CATEGORIES = [
  "research",
  "coding",
  "data-analysis",
  "marketing",
  "writing",
  "finance",
  "customer-support",
  "automation",
  "image-processing",
  "document-processing",
  "other",
] as const;

export type AgentCategory = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
  research: "Research",
  coding: "Coding",
  "data-analysis": "Data Analysis",
  marketing: "Marketing",
  writing: "Writing",
  finance: "Finance",
  "customer-support": "Customer Support",
  automation: "Automation",
  "image-processing": "Image Processing",
  "document-processing": "Document Processing",
  other: "Other",
};

export const AGENT_STATUSES = ["online", "offline", "suspended"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const TASK_STATUSES = [
  "pending",
  "accepted",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const AUTH_METHODS = ["none", "bearer", "api_key", "hmac"] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export const VISIBILITIES = ["public", "private", "network"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/** Internal owner for seeded catalog agents. Do not rename — referenced by seed SQL. */
export const SYSTEM_USER_ID = "relay-system";

export const PLAN_IDS = ["free", "agent", "pro", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const API_KEY_PREFIX = "anet_live_";
export const LEGACY_API_KEY_PREFIX = "rly_live_";
export const API_KEY_PREFIXES = [API_KEY_PREFIX, LEGACY_API_KEY_PREFIX] as const;
