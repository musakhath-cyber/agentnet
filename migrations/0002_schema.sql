-- Relay core schema. Idempotent. user_id is TEXT (Better Auth ids / 'relay-system').

create table if not exists plans (
  id text primary key,
  name text not null,
  description text not null default '',
  price_cents integer not null default 0,
  currency text not null default 'ZAR',
  agent_limit integer not null default 2,
  task_limit integer not null default 50,
  api_enabled boolean not null default false,
  private_networks boolean not null default false,
  team_management boolean not null default false,
  analytics_level text not null default 'basic',
  per_agent_cents integer not null default 0,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  company text,
  website text,
  role text not null default 'user',
  status text not null default 'active',
  plan_id text not null default 'free' references plans(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_plan_idx on profiles (plan_id);
create index if not exists profiles_role_idx on profiles (role);

create table if not exists agents (
  id text primary key,
  user_id text not null,
  name text not null,
  slug text not null,
  description text not null default '',
  category text not null default 'other',
  endpoint_url text,
  auth_method text not null default 'none',
  website text,
  version text not null default '1.0.0',
  status text not null default 'offline',
  visibility text not null default 'public',
  reputation_score numeric not null default 50,
  tasks_completed integer not null default 0,
  tasks_failed integer not null default 0,
  heartbeat_at timestamptz,
  last_seen_at timestamptz,
  hosted boolean not null default false,
  hosted_kind text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists agents_user_slug_idx on agents (user_id, slug);
create index if not exists agents_category_idx on agents (category);
create index if not exists agents_status_idx on agents (status);
create index if not exists agents_visibility_idx on agents (visibility);
create index if not exists agents_reputation_idx on agents (reputation_score desc);
create index if not exists agents_user_id_idx on agents (user_id);
create index if not exists agents_name_idx on agents (lower(name));

create table if not exists agent_capabilities (
  id text primary key,
  agent_id text not null references agents(id) on delete cascade,
  capability text not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_capabilities_cap_idx on agent_capabilities (lower(capability));
create index if not exists agent_capabilities_agent_idx on agent_capabilities (agent_id);

create table if not exists agent_endpoints (
  id text primary key,
  agent_id text not null references agents(id) on delete cascade,
  url text not null,
  method text not null default 'POST',
  auth_method text not null default 'none',
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists agent_endpoints_agent_idx on agent_endpoints (agent_id);

create table if not exists api_keys (
  id text primary key,
  user_id text not null,
  agent_id text references agents(id) on delete set null,
  name text not null,
  prefix text not null,
  key_hash text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists api_keys_prefix_idx on api_keys (prefix);
create index if not exists api_keys_user_id_idx on api_keys (user_id);
create index if not exists api_keys_hash_idx on api_keys (key_hash);

create table if not exists tasks (
  id text primary key,
  from_agent_id text not null references agents(id),
  to_agent_id text not null references agents(id),
  user_id text not null,
  title text not null,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  result jsonb,
  error text,
  priority integer not null default 0,
  ack_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_from_idx on tasks (from_agent_id);
create index if not exists tasks_to_idx on tasks (to_agent_id);
create index if not exists tasks_status_idx on tasks (status);
create index if not exists tasks_user_id_idx on tasks (user_id);
create index if not exists tasks_created_idx on tasks (created_at desc);
create index if not exists tasks_to_status_idx on tasks (to_agent_id, status);

create table if not exists task_results (
  id text primary key,
  task_id text not null references tasks(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists task_results_task_idx on task_results (task_id);

create table if not exists messages (
  id text primary key,
  from_agent_id text references agents(id) on delete set null,
  to_agent_id text references agents(id) on delete set null,
  user_id text not null,
  task_id text references tasks(id) on delete set null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_user_idx on messages (user_id, created_at desc);
create index if not exists messages_task_idx on messages (task_id);

create table if not exists usage_events (
  id text primary key,
  user_id text not null,
  agent_id text,
  kind text not null,
  units integer not null default 1,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists usage_user_created_idx on usage_events (user_id, created_at desc);
create index if not exists usage_kind_idx on usage_events (kind, created_at desc);

create table if not exists subscriptions (
  id text primary key,
  user_id text not null,
  plan_id text not null references plans(id),
  status text not null default 'active',
  provider text,
  provider_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on subscriptions (user_id);

create table if not exists payments (
  id text primary key,
  user_id text not null,
  subscription_id text,
  amount_cents integer not null,
  currency text not null default 'ZAR',
  status text not null,
  provider text,
  provider_ref text,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on payments (user_id, created_at desc);

create table if not exists audit_logs (
  id text primary key,
  user_id text,
  actor_type text not null default 'user',
  action text not null,
  resource_type text,
  resource_id text,
  ip text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_user_idx on audit_logs (user_id);
create index if not exists audit_logs_action_idx on audit_logs (action);

create table if not exists reports (
  id text primary key,
  reporter_user_id text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on reports (status, created_at desc);

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

create table if not exists networks (
  id text primary key,
  owner_user_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists networks_owner_idx on networks (owner_user_id);

create table if not exists network_members (
  network_id text not null references networks(id) on delete cascade,
  agent_id text not null references agents(id) on delete cascade,
  primary key (network_id, agent_id)
);
