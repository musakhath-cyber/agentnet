import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, CATEGORY_LABELS, type AgentCategory } from "@/lib/constants";
import type { AgentInput } from "@/lib/types";

const KINDS = ["echo", "research", "coder", "analyzer", "writer", "finance", "support", "automation", "vision", "docs", "llm"];

export function AgentForm({
  initial,
  submitLabel,
  onSubmit,
  pending,
  error,
}: {
  initial?: Partial<AgentInput>;
  submitLabel: string;
  onSubmit: (input: AgentInput) => void;
  pending?: boolean;
  error?: string | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "other");
  const [capabilities, setCapabilities] = useState((initial?.capabilities ?? []).join(", "));
  const [endpointUrl, setEndpointUrl] = useState(initial?.endpointUrl ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [version, setVersion] = useState(initial?.version ?? "1.0.0");
  const [hosted, setHosted] = useState(initial?.hosted ?? true);
  const [hostedKind, setHostedKind] = useState(initial?.hostedKind ?? "echo");
  const [visibility, setVisibility] = useState(initial?.visibility ?? "public");
  const [authMethod, setAuthMethod] = useState(initial?.authMethod ?? "none");

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          description,
          category,
          capabilities: capabilities.split(",").map((c) => c.trim()).filter(Boolean),
          endpointUrl: hosted ? null : endpointUrl,
          website,
          version,
          hosted,
          hostedKind: hosted ? hostedKind : null,
          visibility,
          authMethod,
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Category">
          <select
            className="h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c as AgentCategory]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} required />
      </Field>
      <Field label="Capabilities (comma separated)">
        <Input value={capabilities} onChange={(e) => setCapabilities(e.target.value)} placeholder="research, briefing" />
      </Field>
      <div className="flex items-center gap-3">
        <input
          id="hosted"
          type="checkbox"
          checked={hosted}
          onChange={(e) => setHosted(e.target.checked)}
          className="size-4 accent-accent"
        />
        <Label htmlFor="hosted">Host on AgentNet (process tasks on-platform)</Label>
      </div>
      <p className="text-xs text-subtle">
        Uncheck to use an HTTPS webhook or to poll <code className="font-mono">GET /api/v1/tasks?agent=…</code>.
      </p>
      {hosted ? (
        <Field label="Hosted kind">
          <select
            className="h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm"
            value={hostedKind}
            onChange={(e) => setHostedKind(e.target.value)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Webhook endpoint">
            <Input value={endpointUrl ?? ""} onChange={(e) => setEndpointUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Auth method">
            <select
              className="h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm"
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value)}
            >
              <option value="none">None</option>
              <option value="bearer">Bearer</option>
              <option value="api_key">API key header</option>
              <option value="hmac">HMAC</option>
            </select>
          </Field>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Website">
          <Input value={website ?? ""} onChange={(e) => setWebsite(e.target.value)} />
        </Field>
        <Field label="Version">
          <Input value={version} onChange={(e) => setVersion(e.target.value)} />
        </Field>
        <Field label="Visibility">
          <select
            className="h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="network">Network</option>
          </select>
        </Field>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
