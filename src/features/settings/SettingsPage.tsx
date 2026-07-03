import { Keyboard, Plug, RotateCcw, Users, Webhook } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useMembers, useOrg } from "@/hooks/queries";
import { useTheme } from "@/hooks/useTheme";
import { data } from "@/lib/data";

const INTEGRATIONS = [
  { name: "YouTube Data API", description: "Pull video metadata and publish events automatically.", available: false },
  { name: "YouTube Analytics API", description: "Daily metric snapshots without manual entry.", available: false },
  { name: "Claude API", description: "Powers the AI Coach, learning loop, and reports.", available: true },
  { name: "Slack", description: "Send notifications and weekly reports to a channel.", available: false },
  { name: "Discord", description: "Send notifications to your team server.", available: false },
  { name: "Google Drive", description: "Export reports and SOPs to a shared drive.", available: false },
  { name: "Email", description: "Digest notifications for the team.", available: false },
];

const SHORTCUTS: Array<[string, string]> = [
  ["⌘K / Ctrl+K", "Command palette & global search"],
  ["g then d", "Go to Dashboard"],
  ["g then v", "Go to Videos"],
  ["g then x", "Go to Competitors"],
  ["g then i", "Go to Ideas"],
  ["g then s", "Go to SOPs"],
  ["g then r", "Go to Reports"],
  ["g then a", "Go to AI Coach"],
];

export function SettingsPage() {
  const { data: org } = useOrg();
  const { data: members } = useMembers();
  const { dark, toggle } = useTheme();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        description={`Organization: ${org?.name ?? "—"}${data.isDemo ? " · running on demo data" : ""}`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> Members & roles
            </CardTitle>
            <CardDescription>
              Owner and admin manage the org; editors write; viewers read. Enforced by Row Level
              Security.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(members ?? []).map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{m.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium">{m.displayName}</div>
                </div>
                <Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Dark mode first. Light mode for daylight sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle">Dark mode</Label>
              <Switch id="theme-toggle" checked={dark} onCheckedChange={toggle} />
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Keyboard className="h-4 w-4 text-muted-foreground" /> Keyboard shortcuts
              </div>
              <div className="grid gap-1.5">
                {SHORTCUTS.map(([keys, label]) => (
                  <div key={keys} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-muted-foreground" /> Integrations
            </CardTitle>
            <CardDescription>
              The architecture is integration-ready — each provider maps to a row in the
              integrations table and a typed adapter.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((integration) => (
              <div key={integration.name} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{integration.name}</span>
                  <Badge variant={integration.available ? "success" : "outline"}>
                    {integration.available ? "configured via env" : "coming soon"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{integration.description}</p>
              </div>
            ))}
            <div className="rounded-md border border-dashed p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Webhook className="h-4 w-4 text-muted-foreground" /> Webhooks
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Register endpoints for any event: video published, outlier detected, SOP updated,
                recommendation created.
              </p>
            </div>
          </CardContent>
        </Card>

        {data.isDemo && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Demo data</CardTitle>
              <CardDescription>
                You're in demo mode — everything you add or change is saved in this browser. Reset
                restores the original seeded company.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => data.resetLocalData()}>
                <RotateCcw /> Reset demo data
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
