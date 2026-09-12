import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchMe, updateSettings } from "@/lib/fns/session";

export const Route = createFileRoute("/dashboard/settings")({ component: Settings });

function Settings() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (!me.data) return;
    setDisplayName(me.data.profile.displayName ?? "");
    setCompany(me.data.profile.company ?? "");
    setWebsite(me.data.profile.website ?? "");
  }, [me.data]);

  const save = useMutation({
    mutationFn: () => updateSettings({ data: { displayName, company, website } }),
    onSuccess: () => {
      toast.success("Settings saved");
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-3xl tracking-tight">Settings</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="block space-y-2">
          <Label>Display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="block space-y-2">
          <Label>Company</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
        <label className="block space-y-2">
          <Label>Website</Label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
        <p className="text-sm text-muted">
          Plan: {me.data?.plan?.name ?? "—"}. Role: {me.data?.profile.role}.
        </p>
        <Button type="submit" disabled={save.isPending}>
          Save
        </Button>
      </form>
    </div>
  );
}
