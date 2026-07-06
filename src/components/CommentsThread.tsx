import { useMemo, useState } from "react";
import { AtSign, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useMe,
  useMembers,
} from "@/hooks/queries";
import { relativeTime } from "@/lib/format";
import type { CommentEntityType, Member } from "@/types";

// Render a body with @Name mentions highlighted.
function renderBody(body: string, memberNames: string[]) {
  if (memberNames.length === 0) return body;
  const pattern = new RegExp(`@(${memberNames.map(escapeRe).join("|")})`, "g");
  const out: Array<string | JSX.Element> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(body))) {
    if (m.index > last) out.push(body.slice(last, m.index));
    out.push(
      <span key={key++} className="rounded bg-primary/15 px-1 font-medium text-primary">
        @{m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function CommentsThread({
  entityType,
  entityId,
}: {
  entityType: CommentEntityType;
  entityId: string;
}) {
  const { data: me } = useMe();
  const { data: members } = useMembers();
  const { data: comments } = useComments(entityType, entityId);
  const addComment = useAddComment(entityType, entityId);
  const deleteComment = useDeleteComment(entityType, entityId);

  const [body, setBody] = useState("");
  const memberNames = useMemo(() => (members ?? []).map((m) => m.displayName), [members]);

  // Resolve @Name tokens in the body to member ids.
  const resolveMentions = (text: string): string[] => {
    const ids = new Set<string>();
    for (const mem of members ?? []) {
      if (new RegExp(`@${escapeRe(mem.displayName)}\\b`).test(text)) ids.add(mem.id);
    }
    return [...ids];
  };

  const insertMention = (mem: Member) => {
    setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}@${mem.displayName} `);
  };

  const submit = () => {
    const text = body.trim();
    if (!text) return;
    addComment.mutate(
      { entityType, entityId, body: text, mentions: resolveMentions(text) },
      {
        onSuccess: () => setBody(""),
        onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
      },
    );
  };

  const mentionable = (members ?? []).filter((m) => m.id !== me?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        Discussion
        {comments && comments.length > 0 && (
          <Badge variant="secondary">{comments.length}</Badge>
        )}
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {(comments ?? []).map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px]">
                {c.author.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.author.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {relativeTime(c.createdAt)}
                </span>
                {c.author.id === me?.id && (
                  <button
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    onClick={() => deleteComment.mutate(c.id)}
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">
                {renderBody(c.body, memberNames)}
              </p>
            </div>
          </div>
        ))}
        {comments && comments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the conversation — @mention a teammate to notify them.
          </p>
        )}
      </div>

      {/* Composer */}
      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment…"
          rows={2}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          {mentionable.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AtSign className="h-3.5 w-3.5" />
              {mentionable.map((m) => (
                <button
                  key={m.id}
                  className="rounded border px-1.5 py-0.5 hover:bg-muted"
                  onClick={() => insertMention(m)}
                >
                  {m.displayName}
                </button>
              ))}
            </div>
          )}
          <Button
            size="sm"
            className="ml-auto"
            onClick={submit}
            disabled={!body.trim() || addComment.isPending}
          >
            <Send /> Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
