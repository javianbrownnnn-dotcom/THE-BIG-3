import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/data";
import { messageOf } from "@/lib/errors";

function slugify(name: string): string {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    `org-${Date.now().toString(36)}`
  );
}

/** An invite link puts ?invite=CODE in the query string (survives the hash router). */
function inviteCodeFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get("invite")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const client = getSupabaseClient()!;
  const urlCode = inviteCodeFromUrl();
  // If they arrived via an invite link, default to the Join tab.
  const [mode, setMode] = useState<"create" | "join">(urlCode ? "join" : "create");
  const [orgName, setOrgName] = useState("");
  const [code, setCode] = useState(urlCode);
  const [channels, setChannels] = useState<Array<{ name: string; niche: string }>>([
    { name: "", niche: "" },
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (urlCode) {
      setCode(urlCode);
      setMode("join");
    }
  }, [urlCode]);

  const createOrg = async (e: React.FormEvent) => {
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
      toast.error(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const joinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const { error } = await client.rpc("redeem_invite", { invite_code: code.trim() });
      if (error) throw error;
      toast.success("You're in! Welcome to the team.");
      onComplete();
    } catch (err) {
      toast.error(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{mode === "create" ? "Set up your company" : "Join your team"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "One organization for the team; one channel per brand. You can add more later."
              : "Enter the invite code your team owner shared to join their workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Toggle */}
          <div className="mb-4 flex rounded-md border p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`flex-1 rounded px-3 py-1.5 transition-colors ${
                mode === "create" ? "bg-muted font-medium" : "text-muted-foreground"
              }`}
            >
              Create a workspace
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`flex-1 rounded px-3 py-1.5 transition-colors ${
                mode === "join" ? "bg-muted font-medium" : "text-muted-foreground"
              }`}
            >
              Join with a code
            </button>
          </div>

          {mode === "create" ? (
            <form onSubmit={createOrg} className="space-y-4">
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
          ) : (
            <form onSubmit={joinTeam} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Invite code</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD2345"
                  className="font-mono tracking-widest"
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ask your team owner for a link from Settings → Members.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={busy || !code.trim()}>
                {busy ? "Joining…" : "Join team"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
