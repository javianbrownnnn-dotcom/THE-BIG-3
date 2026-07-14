import { useEffect, useRef, useState } from "react";
import {
  Bot, Check, Copy, FileEdit, FlaskConical, Lightbulb, RefreshCw, Send, ThumbsDown, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useApproveRecommendation,
  useInsights,
  useRecommendations,
  useRunLearningLoop,
  useSetRecommendationStatus,
} from "@/hooks/queries";
import { data } from "@/lib/data";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { messageOf } from "@/lib/errors";
import type {
  AiRecommendation, ChatMessage, ProposedSopChange, RecommendationStatus,
} from "@/types";

function ProposedChangePreview({ change }: { change: ProposedSopChange }) {
  return (
    <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <FileEdit className="h-3.5 w-3.5" />
        Proposed SOP change · {change.sopId ? change.sopTitle : `New SOP: ${change.sopTitle}`}
      </div>
      <p className="text-sm">{change.changeSummary}</p>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Preview the new version ({change.steps.length} steps)
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {change.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}

const SUGGESTIONS = [
  "What caused CTR to drop?",
  "Show our best-performing storytelling structure.",
  "What hook type performs best?",
  "What topics consistently underperform?",
  "What should Robert test next month?",
  "What are Javian's biggest content weaknesses?",
];

const statusVariant = (s: RecommendationStatus) =>
  s === "validated" ? ("success" as const)
  : s === "failed" || s === "rejected" ? ("destructive" as const)
  : s === "testing" ? ("warning" as const)
  : ("secondary" as const);

function RecommendationCard({ rec }: { rec: AiRecommendation }) {
  const setStatus = useSetRecommendationStatus();
  const approve = useApproveRecommendation();
  const act = (status: RecommendationStatus, label: string) => {
    setStatus.mutate(
      { id: rec.id, status },
      { onSuccess: () => toast.success(label) },
    );
  };
  const applyChange = () => {
    approve.mutate(rec.id, {
      onSuccess: (sop) =>
        toast.success(`Applied — "${sop.title}" is now v${sop.currentVersion?.versionNumber}`, {
          description: "The new version is saved to your SOPs; prior versions are kept.",
        }),
      onError: (err) => toast.error(messageOf(err)),
    });
  };
  const hasChange = !!rec.proposedChange;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <CardTitle className="text-sm leading-snug">{rec.title}</CardTitle>
        <Badge variant={statusVariant(rec.status)}>{rec.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{rec.rationale}</p>
        {rec.proposedChange && <ProposedChangePreview change={rec.proposedChange} />}
        {rec.measuredImpact && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <span className="font-medium">Measured outcome: </span>
            {rec.measuredImpact.metric.toUpperCase()} {rec.measuredImpact.before}% →{" "}
            {rec.measuredImpact.after}% (n={rec.measuredImpact.nBefore}→
            {rec.measuredImpact.nAfter}
            {rec.measuredImpact.tStat != null ? `, t=${rec.measuredImpact.tStat}` : ""})
          </div>
        )}
        {rec.outcomeNotes && (
          <p className="text-xs text-muted-foreground">{rec.outcomeNotes}</p>
        )}
        {rec.status === "proposed" && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={hasChange ? applyChange : () => act("accepted", "Recommendation accepted")} disabled={approve.isPending}>
              <Check /> {hasChange ? "Approve & apply" : "Accept"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => act("testing", "Marked as testing — the loop will measure the outcome")}
            >
              <FlaskConical /> Test it
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => act("rejected", "Recommendation rejected")}
            >
              <ThumbsDown /> Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CoachPage() {
  const { data: recommendations } = useRecommendations();
  const { data: insights } = useInsights();
  const runLoop = useRunLearningLoop();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const ask = async (question: string) => {
    if (!question.trim() || thinking) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    try {
      const reply = await data.askCoach(question, messages);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.answer, createdAt: new Date().toISOString() },
      ]);
    } catch (err) {
      toast.error(`The coach couldn't answer: ${String(err)}`);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Coach"
        description="The company strategist. Ask anything — answers are grounded in your actual performance data."
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={runLoop.isPending}
            onClick={() =>
              runLoop.mutate(undefined, {
                onSuccess: (r) =>
                  toast.success(
                    r.insights + r.recommendations + r.notifications > 0
                      ? `Loop complete: ${r.insights} insights, ${r.recommendations} recommendations, ${r.notifications} notifications`
                      : "Loop complete — nothing statistically new since the last run",
                  ),
                onError: (e) => toast.error(`Loop failed: ${String(e)}`),
              })
            }
          >
            <RefreshCw className={runLoop.isPending ? "animate-spin" : ""} />
            {runLoop.isPending ? "Analyzing…" : "Run learning loop"}
          </Button>
        }
      />

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Ask the coach</TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations ({recommendations?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="insights">Insights ({insights?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <Card className="flex min-h-[540px] flex-col">
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="flex-1 space-y-4 overflow-y-auto">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">
                      What should we change next to make better videos?
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      That's the only question that matters. Try one of these:
                    </p>
                    <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => ask(s)}
                          className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-4 py-3",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border bg-card",
                      )}
                    >
                      {m.role === "assistant" ? (
                        <>
                          <Markdown content={m.content} />
                          <button
                            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(m.content);
                                toast.success("Answer copied");
                              } catch {
                                toast.error("Clipboard blocked — long-press to copy manually");
                              }
                            }}
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </button>
                        </>
                      ) : (
                        <p className="text-sm">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
                      <Bot className="h-4 w-4 animate-pulse" /> Analyzing your data…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <form
                className="mt-4 flex gap-2 border-t pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about hooks, retention, competitors, what to test next…"
                  disabled={thinking}
                />
                <Button type="submit" size="icon" disabled={thinking || !input.trim()}>
                  <Send />
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="grid gap-4 lg:grid-cols-2">
            {(recommendations ?? []).map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
            {(recommendations ?? []).length === 0 && (
              <Card className="lg:col-span-2">
                <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
                  <X className="h-4 w-4" /> No recommendations yet — the learning loop runs daily.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <div className="space-y-3">
            {(insights ?? []).map((ins) => (
              <Card key={ins.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{ins.title}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{ins.body}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant="secondary">{ins.kind}</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {ins.confidence != null && `${Math.round(ins.confidence * 100)}% conf · `}
                        {relativeTime(ins.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
