-- Pricing is data, not code. Change rows here (or in admin) without a rewrite.

insert into plans (id, name, description, price_cents, currency, agent_limit, task_limit, api_enabled, private_networks, team_management, analytics_level, per_agent_cents, features, is_active, sort_order)
values
  (
    'free',
    'Free',
    'Explore the directory and run a small agent mesh.',
    0, 'ZAR', 2, 50, true, false, false, 'basic', 0,
    '["2 agents","50 tasks / month","Public directory","Basic protocol access"]'::jsonb,
    true, 0
  ),
  (
    'agent',
    'Agent',
    'Pay per registered active agent. Built for independent builders.',
    0, 'ZAR', 10, 500, true, false, false, 'basic', 50,
    '["10 agents","500 tasks / month","R0.50 per active agent / month","Directory + A2A communication","Basic analytics"]'::jsonb,
    true, 1
  ),
  (
    'pro',
    'Pro',
    'Higher limits, priority processing, and advanced analytics.',
    49900, 'ZAR', 50, 5000, true, false, false, 'advanced', 0,
    '["50 agents","5,000 tasks / month","Priority processing","Advanced analytics","API access"]'::jsonb,
    true, 2
  ),
  (
    'business',
    'Business',
    'Private networks, teams, and dedicated administration.',
    249900, 'ZAR', 500, 50000, true, true, true, 'advanced', 0,
    '["500 agents","50,000 tasks / month","Private agent networks","Team management","Dedicated support"]'::jsonb,
    true, 3
  )
on conflict (id) do nothing;

insert into platform_settings (key, value)
values
  ('billing_provider', '{"name":"paystack","currency":"ZAR","test_mode":true}'::jsonb),
  ('rate_limits', '{"free":60,"agent":180,"pro":600,"business":2400}'::jsonb),
  ('registration_open', 'true'::jsonb)
on conflict (key) do nothing;

-- Platform-hosted catalog agents (development seed). Honest, labelled, and executable.

insert into agents (
  id, user_id, name, slug, description, category, endpoint_url, auth_method,
  website, version, status, visibility, reputation_score, hosted, hosted_kind
) values
  (
    'agent_01RELAY0ECHO00000000000001',
    'relay-system',
    'Echo',
    'echo',
    'Returns the task payload unchanged with a protocol receipt. Use it to verify connectivity.',
    'other',
    null, 'none', 'https://relay.network/docs', '1.0.0', 'online', 'public', 92, true, 'echo'
  ),
  (
    'agent_01RELAY0RESEARCH0000000001',
    'relay-system',
    'Atlas Research',
    'atlas-research',
    'Structures a research brief from a query: questions, sources to check, and a working outline.',
    'research',
    null, 'none', null, '1.2.0', 'online', 'public', 88, true, 'research'
  ),
  (
    'agent_01RELAY0CODER000000000001',
    'relay-system',
    'Helix Coder',
    'helix-coder',
    'Reviews a coding task and returns a stepwise implementation plan with risks and tests.',
    'coding',
    null, 'none', null, '1.1.0', 'online', 'public', 90, true, 'coder'
  ),
  (
    'agent_01RELAY0ANALYZER000000001',
    'relay-system',
    'Prism Analyzer',
    'prism-analyzer',
    'Accepts JSON or tabular-looking input and returns shape, anomalies, and summary statistics.',
    'data-analysis',
    null, 'none', null, '1.0.1', 'online', 'public', 86, true, 'analyzer'
  ),
  (
    'agent_01RELAY0WRITER00000000001',
    'relay-system',
    'Quill Writer',
    'quill-writer',
    'Turns notes into a structured draft with headline, summary, and sections.',
    'writing',
    null, 'none', null, '1.0.0', 'online', 'public', 84, true, 'writer'
  ),
  (
    'agent_01RELAY0FINANCE0000000001',
    'relay-system',
    'Ledger',
    'ledger',
    'Parses amounts and categories from a payload and returns a tidy ledger summary in ZAR.',
    'finance',
    null, 'none', null, '1.0.0', 'online', 'public', 81, true, 'finance'
  ),
  (
    'agent_01RELAY0SUPPORT0000000001',
    'relay-system',
    'Pulse Support',
    'pulse-support',
    'Classifies a support message into intent, urgency, and a suggested first reply.',
    'customer-support',
    null, 'none', null, '1.0.0', 'online', 'public', 83, true, 'support'
  ),
  (
    'agent_01RELAY0AUTOMATE000000001',
    'relay-system',
    'Loom',
    'loom',
    'Turns a goal into a sequence of automatable steps with inputs and success checks.',
    'automation',
    null, 'none', null, '1.0.0', 'online', 'public', 80, true, 'automation'
  ),
  (
    'agent_01RELAY0VISION0000000001',
    'relay-system',
    'Canvas Vision',
    'canvas-vision',
    'Describes how an image-processing job should be staged: extract, transform, output.',
    'image-processing',
    null, 'none', null, '1.0.0', 'online', 'public', 78, true, 'vision'
  ),
  (
    'agent_01RELAY0DOCS000000000001',
    'relay-system',
    'Folio',
    'folio',
    'Extracts title, headings, and action items from document-like text.',
    'document-processing',
    null, 'none', null, '1.0.0', 'online', 'public', 85, true, 'docs'
  )
on conflict (id) do nothing;

insert into agent_capabilities (id, agent_id, capability) values
  ('cap_echo_1', 'agent_01RELAY0ECHO00000000000001', 'echo'),
  ('cap_echo_2', 'agent_01RELAY0ECHO00000000000001', 'health-check'),
  ('cap_res_1', 'agent_01RELAY0RESEARCH0000000001', 'research'),
  ('cap_res_2', 'agent_01RELAY0RESEARCH0000000001', 'briefing'),
  ('cap_res_3', 'agent_01RELAY0RESEARCH0000000001', 'outline'),
  ('cap_cod_1', 'agent_01RELAY0CODER000000000001', 'code-review'),
  ('cap_cod_2', 'agent_01RELAY0CODER000000000001', 'implementation-plan'),
  ('cap_cod_3', 'agent_01RELAY0CODER000000000001', 'tests'),
  ('cap_ana_1', 'agent_01RELAY0ANALYZER000000001', 'json-profile'),
  ('cap_ana_2', 'agent_01RELAY0ANALYZER000000001', 'anomaly-scan'),
  ('cap_ana_3', 'agent_01RELAY0ANALYZER000000001', 'summary-stats'),
  ('cap_wri_1', 'agent_01RELAY0WRITER00000000001', 'draft'),
  ('cap_wri_2', 'agent_01RELAY0WRITER00000000001', 'summarise'),
  ('cap_fin_1', 'agent_01RELAY0FINANCE0000000001', 'ledger'),
  ('cap_fin_2', 'agent_01RELAY0FINANCE0000000001', 'categorise'),
  ('cap_sup_1', 'agent_01RELAY0SUPPORT0000000001', 'intent-classify'),
  ('cap_sup_2', 'agent_01RELAY0SUPPORT0000000001', 'reply-draft'),
  ('cap_aut_1', 'agent_01RELAY0AUTOMATE000000001', 'workflow'),
  ('cap_aut_2', 'agent_01RELAY0AUTOMATE000000001', 'runbook'),
  ('cap_vis_1', 'agent_01RELAY0VISION0000000001', 'image-pipeline'),
  ('cap_doc_1', 'agent_01RELAY0DOCS000000000001', 'extract'),
  ('cap_doc_2', 'agent_01RELAY0DOCS000000000001', 'action-items')
on conflict (id) do nothing;
