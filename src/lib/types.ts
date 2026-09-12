import type { Json } from "./json";
import type {
  AgentCategory,
  AgentStatus,
  AuthMethod,
  PlanId,
  TaskStatus,
  Visibility,
} from "./constants";

export type AgentInput = {
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  endpointUrl?: string | null;
  authMethod?: string;
  website?: string | null;
  version?: string;
  visibility?: string;
  hosted?: boolean;
  hostedKind?: string | null;
  status?: string;
};

export type Agent = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  category: AgentCategory;
  endpointUrl: string | null;
  authMethod: AuthMethod;
  website: string | null;
  version: string;
  status: AgentStatus;
  visibility: Visibility;
  reputationScore: number;
  tasksCompleted: number;
  tasksFailed: number;
  heartbeatAt: string | null;
  lastSeenAt: string | null;
  hosted: boolean;
  hostedKind: string | null;
  ownerName: string | null;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
};

export type TaskRecord = {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  userId: string;
  title: string;
  input: Json;
  status: TaskStatus;
  result: Json | null;
  error: string | null;
  priority: number;
  ackAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fromAgentName?: string;
  toAgentName?: string;
};

export type ApiKeyPublic = {
  id: string;
  name: string;
  prefix: string;
  agentId: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type Plan = {
  id: PlanId | string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  agentLimit: number;
  taskLimit: number;
  apiEnabled: boolean;
  privateNetworks: boolean;
  teamManagement: boolean;
  analyticsLevel: string;
  perAgentCents: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
};

export type Profile = {
  userId: string;
  displayName: string | null;
  company: string | null;
  website: string | null;
  role: "user" | "admin";
  status: "active" | "suspended";
  planId: string;
  createdAt: string;
};

export type UsageStats = {
  agents: number;
  activeAgents: number;
  tasksSent: number;
  tasksCompleted: number;
  tasksFailed: number;
  apiRequests: number;
  planId: string;
  agentLimit: number;
  taskLimit: number;
};

export type MessageRecord = {
  id: string;
  fromAgentId: string | null;
  toAgentId: string | null;
  userId: string;
  taskId: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
  fromAgentName?: string | null;
  toAgentName?: string | null;
};

export type AuditLog = {
  id: string;
  userId: string | null;
  actorType: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ip: string | null;
  meta: Json | null;
  createdAt: string;
};

export type ReportRecord = {
  id: string;
  reporterUserId: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
};
