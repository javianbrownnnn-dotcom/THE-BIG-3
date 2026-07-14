import { useMemo, useState } from "react";
import { Check, Copy, Link2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useCreateInvite,
  useInvites,
  useMe,
  useMembers,
  useRevokeInvite,
} from "@/hooks/queries";
import type { Invite, OrgRole } from "@/types";
import { messageOf } from "@/lib/errors";

// The link an invitee opens; ?invite lives in the query string so it survives
// the hash router (which owns everything after #).
function inviteUrl(code: string): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return `${base.replace(/\/$/, "")}/?invite=${code}`;
}

const ROLE_HINT: Record<OrgRole, string> = {
  owner: "Full control, including billing.",
  admin: "Manage the team and publish videos.",
  editor: "Do everything except publish.",
  viewer: "Read-only access.",
};

export function TeamInvites() {
  const { data: me } = useMe();
  const { data: members } = useMembers();
  const { data: invites } = useInvites();
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();

  const [role, setRole] = useState<OrgRole>("editor");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const myRole = useMemo(
    () => members?.find((m) => m.id === me?.id)?.role,
    [members, me],
  );
  const canManage = myRole === "owner" || myRole === "admin";

  const copy = async (code: string) => {
    const url = inviteUrl(code);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (e.g. non-secure context) — surface the link to copy by hand.
    }
    setCopied(code);
    toast.success("Invite link copied", { description: url });
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
  };

  const create = async () => {
    try {
      const invite = await createInvite.mutateAsync({
        role,
        email: email.trim() || undefined,
      });
      setEmail("");
      await copy(invite.code);
    } catch (err) {
      toast.error(messageOf(err));
    }
  };

  return (
    <div className="space-y-4">
      {/* Current members */}
      <div className="space-y-3">
        {(members ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{m.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {m.displayName}
                {m.id === me?.id && <span className="text-muted-foreground"> (you)</span>}
              </div>
            </div>
            <Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role}</Badge>
          </div>
        ))}
      </div>

      {canManage && (
        <>
          <Separator />
          {/* Create an invite */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <UserPlus className="h-4 w-4 text-muted-foreground" /> Invite a teammate
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Their email (optional label)"
                className="sm:flex-1"
              />
              <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={create} disabled={createInvite.isPending}>
                <Link2 /> Create link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{ROLE_HINT[role]}</p>
          </div>

          {/* Pending invites */}
          {(invites ?? []).length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Pending invites</Label>
              {(invites ?? []).map((inv: Invite) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {inv.code}
                      </code>
                      <Badge variant="outline">{inv.role}</Badge>
                      {inv.email && (
                        <span className="truncate text-xs text-muted-foreground">{inv.email}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copy(inv.code)}>
                    {copied === inv.code ? <Check className="text-success" /> : <Copy />}
                    Copy link
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeInvite.mutate(inv.id)}
                    aria-label="Revoke invite"
                  >
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Send the link to your teammate. They sign up, and it drops them straight into this
            workspace with the role you chose. Links expire in 14 days and work once.
          </p>
        </>
      )}
    </div>
  );
}
