import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/data";

function slugify(name: string): string {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    `org-${Date.now().toString(36)}`
  );
}

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const client = getSupabaseClient()!;
  const [orgName, setOrgName] = useState("");
  const [channels, setChannels] = useState<Array<{ name: string; niche: string }>>([
    { name: "", niche: "" },
  ]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setBusy(true);
    try {
      const { data: orgId, error } = await client.rpc("create_organization", {
        org_name: orgName.trim(),
        org_slug: slugify(orgName),
      });
      if (error) throw error;

      const rows = channels
        .filter((c) => c.name.trim())
        .map((c) => ({
          organization_id: orgId,
          name: c.name.trim(),
          niche: c.niche.trim() || null,
        }));
      if (rows.length) {
        const { error: chError } = await client.from("channels").insert(rows);
        if (chError) throw chError;
      }
      toast.success(`${orgName} is ready`);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Set up your company</CardTitle>
          <CardDescription>
            One organization for the team; one channel per brand. You can add more later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company name</Label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="The Big 3"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Channels</Label>
              {channels.map((ch, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Input
                    value={ch.name}
                    onChange={(e) => {
                      const next = [...channels];
                      next[i] = { ...next[i], name: e.target.value };
                      setChannels(next);
                    }}
                    placeholder="Channel name"
                  />
                  <Input
                    value={ch.niche}
                    onChange={(e) => {
                      const next = [...channels];
                      next[i] = { ...next[i], niche: e.target.value };
                      setChannels(next);
                    }}
                    placeholder="Niche"
                  />
                </div>
              ))}
              {channels.length < 5 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setChannels([...channels, { name: "", niche: "" }])}
                >
                  + Add another channel
                </Button>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={busy || !orgName.trim()}>
              {busy ? "Creating…" : "Create workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
