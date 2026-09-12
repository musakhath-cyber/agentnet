import type { Agent, MessageRecord, Plan, Profile, TaskRecord } from "@/lib/types";
import type { AgentCategory, AuthMethod, AgentStatus, Visibility, TaskStatus } from "@/lib/constants";
import { bool, iso, jsonValue, num } from "./serialize";

export type AgentRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  endpoint_url: string | null;
  auth_method: string;
  website: string | null;
  version: string;
  status: string;
  visibility: string;
  reputation_score: unknown;
  tasks_completed: unknown;
  tasks_failed: unknown;
  heartbeat_at: unknown;
  last_seen_at: unknown;
  hosted: unknown;
  hosted_kind: string | null;
  created_at: unknown;
  updated_at: unknown;
  owner_name?: string | null;
  capabilities?: unknown;
};

function capsOf(value: unknown, fallback: string[]): string[] {
  const parsed = Array.isArray(value) ? value : jsonValue(value);
  if (Array.isArray(parsed)) return parsed.filter((c): c is string => typeof c === "string");
  return fallback;
}

export function mapAgent(row: AgentRow, capabilities: string[] = []): Agent {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category as AgentCategory,
    endpointUrl: row.endpoint_url,
    authMethod: row.auth_method as AuthMethod,
    website: row.website,
    version: row.version,
    status: row.status as AgentStatus,
    visibility: row.visibility as Visibility,
    reputationScore: num(row.reputation_score, 50),
    tasksCompleted: num(row.tasks_completed),
    tasksFailed: num(row.tasks_failed),
    heartbeatAt: iso(row.heartbeat_at),
    lastSeenAt: iso(row.last_seen_at),
    hosted: bool(row.hosted),
    hostedKind: row.hosted_kind,
    ownerName: row.owner_name ?? null,
    capabilities: capsOf(row.capabilities, capabilities),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

export type TaskRow = {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  user_id: string;
  title: string;
  input: unknown;
  status: string;
  result: unknown;
  error: string | null;
  priority: unknown;
  ack_at: unknown;
  started_at: unknown;
  completed_at: unknown;
  created_at: unknown;
  updated_at: unknown;
  from_agent_name?: string;
  to_agent_name?: string;
};

export function mapTask(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    fromAgentId: row.from_agent_id,
    toAgentId: row.to_agent_id,
    userId: row.user_id,
    title: row.title,
    input: jsonValue(row.input) ?? {},
    status: row.status as TaskStatus,
    result: jsonValue(row.result),
    error: row.error,
    priority: num(row.priority),
    ackAt: iso(row.ack_at),
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
    fromAgentName: row.from_agent_name,
    toAgentName: row.to_agent_name,
  };
}

export function mapPlan(row: {
  id: string;
  name: string;
  description: string;
  price_cents: unknown;
  currency: string;
  agent_limit: unknown;
  task_limit: unknown;
  api_enabled: unknown;
  private_networks: unknown;
  team_management: unknown;
  analytics_level: string;
  per_agent_cents: unknown;
  features: unknown;
  is_active: unknown;
  sort_order: unknown;
}): Plan {
  const features = jsonValue(row.features);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: num(row.price_cents),
    currency: row.currency,
    agentLimit: num(row.agent_limit),
    taskLimit: num(row.task_limit),
    apiEnabled: bool(row.api_enabled),
    privateNetworks: bool(row.private_networks),
    teamManagement: bool(row.team_management),
    analyticsLevel: row.analytics_level,
    perAgentCents: num(row.per_agent_cents),
    features: Array.isArray(features) ? features.map(String) : [],
    isActive: bool(row.is_active),
    sortOrder: num(row.sort_order),
  };
}

export function mapProfile(row: {
  user_id: string;
  display_name: string | null;
  company: string | null;
  website: string | null;
  role: string;
  status: string;
  plan_id: string;
  created_at: unknown;
}): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    company: row.company,
    website: row.website,
    role: row.role === "admin" ? "admin" : "user",
    status: row.status === "suspended" ? "suspended" : "active",
    planId: row.plan_id,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
  };
}

export function mapMessage(row: {
  id: string;
  from_agent_id: string | null;
  to_agent_id: string | null;
  user_id: string;
  task_id: string | null;
  body: string;
  read_at: unknown;
  created_at: unknown;
  from_agent_name?: string | null;
  to_agent_name?: string | null;
}): MessageRecord {
  return {
    id: row.id,
    fromAgentId: row.from_agent_id,
    toAgentId: row.to_agent_id,
    userId: row.user_id,
    taskId: row.task_id,
    body: row.body,
    readAt: iso(row.read_at),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    fromAgentName: row.from_agent_name,
    toAgentName: row.to_agent_name,
  };
}
