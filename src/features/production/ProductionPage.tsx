import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clapperboard,
  Columns3,
  ExternalLink,
  Plus,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useChannels,
  useCreateProduction,
  useMembers,
  useProductions,
} from "@/hooks/queries";
import { humanize, shortDate } from "@/lib/format";
import { PRODUCTION_STAGES, type Production, type ProductionStage } from "@/types";
import { SPEED_STACK, STARTER_STACK } from "./speedStack";

const STAGE_LABELS: Record<ProductionStage, string> = {
  scripting: "Scripting",
  editing: "Editing",
  packaging: "Packaging",
  scheduled: "Scheduled",
  published: "Published",
};

function ProductionCard({ production }: { production: Production }) {
  const { data: channels } = useChannels();
  const { data: members } = useMembers();
  const channel = channels?.find((c) => c.id === production.channelId);
  const assignee = members?.find((m) => m.id === production.assigneeId);
  const overdue =
    production.dueDate &&
    production.stage !== "published" &&
    new Date(production.dueDate).getTime() < Date.now();

  return (
    <Link to={`/production/${production.id}`} className="block">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="space-y-2 p-3.5">
          <div className="text-sm font-medium leading-snug">{production.title}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {channel && <Badge variant="outline">{channel.name}</Badge>}
            {production.dueDate && (
              <Badge variant={overdue ? "destructive" : "secondary"}>
                due {shortDate(production.dueDate)}
              </Badge>
            )}
            {production.voStatus && production.voStatus !== "not_started" && (
              <Badge variant="secondary">VO {humanize(production.voStatus)}</Badge>
            )}
          </div>
          {assignee && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px]">
                  {assignee.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {assignee.displayName}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function CalendarView({ productions }: { productions: Production[] }) {
  // Agenda-style calendar: upcoming items grouped by week, mobile-friendly.
  const dated = productions
    .filter((p) => p.dueDate || p.scheduledAt)
    .map((p) => ({ p, when: new Date(p.scheduledAt ?? p.dueDate!) }))
    .sort((a, b) => a.when.getTime() - b.when.getTime());

  if (!dated.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nothing scheduled yet — set due dates or schedule times in each video doc.
      </p>
    );
  }

  const weekOf = (d: Date) => {
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return monday.toISOString().slice(0, 10);
  };
  const groups = new Map<string, typeof dated>();
  for (const item of dated) {
    const key = weekOf(item.when);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([week, items]) => (
        <div key={week}>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Week of {shortDate(week)}
          </h3>
          <div className="space-y-2">
            {items.map(({ p, when }) => (
              <Link
                key={p.id}
                to={`/production/${p.id}`}
                className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="w-14 shrink-0 text-center">
                  <div className="text-lg font-semibold leading-none tabular-nums">
                    {when.getDate()}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {when.toLocaleDateString("en", { weekday: "short" })}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {STAGE_LABELS[p.stage]}
                    {p.scheduledAt &&
                      ` · publishes ${when.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}`}
                  </div>
                </div>
                <Badge variant={p.stage === "scheduled" ? "warning" : "secondary"}>
                  {STAGE_LABELS[p.stage]}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const STAGE_LABEL: Record<ProductionStage, string> = STAGE_LABELS;

function SpeedStackView() {
  return (
    <div className="space-y-5">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-sm">
              <span className="font-medium">The 30-video sprint stack (~$50–75/mo).</span>{" "}
              Tools accelerate a system — they don't replace one. Each tool below plugs into a
              specific pipeline stage; log which you used in the video doc so the learning loop
              can tell you what's actually working.
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {STARTER_STACK.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-primary">•</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {SPEED_STACK.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{category.title}</CardTitle>
              <Badge variant="secondary">{STAGE_LABEL[category.stage]}</Badge>
            </div>
            <p className="pt-1 text-sm text-muted-foreground">{category.intro}</p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {category.tools.map((tool) => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-md border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {tool.name}
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  {tool.free && <Badge variant="success">free tier</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tool.why}</p>
                <p className="mt-1.5 text-xs font-medium tabular-nums">{tool.price}</p>
              </a>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProductionPage() {
  const { data: productions, isLoading } = useProductions();
  const { data: channels } = useChannels();
  const { data: members } = useMembers();
  const createProduction = useCreateProduction();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", channelId: "", topic: "", assigneeId: "", dueDate: "" });

  const byStage = useMemo(() => {
    const map = new Map<ProductionStage, Production[]>();
    for (const stage of PRODUCTION_STAGES) map.set(stage, []);
    for (const p of productions ?? []) map.get(p.stage)?.push(p);
    return map;
  }, [productions]);

  const submit = async () => {
    if (!form.title.trim() || !form.channelId) {
      toast.error("A working title and a channel are required");
      return;
    }
    const created = await createProduction.mutateAsync({
      title: form.title.trim(),
      channelId: form.channelId,
      topic: form.topic.trim() || undefined,
      assigneeId: form.assigneeId || undefined,
      dueDate: form.dueDate || undefined,
    });
    setDialogOpen(false);
    setForm({ title: "", channelId: "", topic: "", assigneeId: "", dueDate: "" });
    toast.success("Video created — the doc is ready");
    navigate(`/production/${created.id}`);
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Production"
        description="The shared workspace where videos get made: every doc, every stage, everything the team put in."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus /> New video
          </Button>
        }
      />

      {(productions ?? []).length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="No videos in production"
          description="Create the first doc — hook, script, packaging, goal — and move it across the board as it gets made."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus /> New video
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board" className="gap-1.5">
              <Columns3 className="h-3.5 w-3.5" /> Board
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="speed" className="gap-1.5">
              <Rocket className="h-3.5 w-3.5" /> Speed stack
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {PRODUCTION_STAGES.map((stage) => (
                <Card key={stage} className="bg-transparent">
                  <CardHeader className="p-3.5 pb-2">
                    <CardTitle className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                      {STAGE_LABELS[stage]}
                      <Badge variant="secondary">{byStage.get(stage)?.length ?? 0}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 p-3.5 pt-0">
                    {(byStage.get(stage) ?? []).map((p) => (
                      <ProductionCard key={p.id} production={p} />
                    ))}
                    {(byStage.get(stage) ?? []).length === 0 && (
                      <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                        Empty
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardContent className="p-5">
                <CalendarView productions={productions ?? []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="speed">
            <SpeedStackView />
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New video</DialogTitle>
            <DialogDescription>
              Starts in Scripting with a full doc: hook, script, description, goal, packaging.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Working title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="The company that owns…"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select onValueChange={(v) => setForm({ ...form, channelId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a channel" />
                </SelectTrigger>
                <SelectContent>
                  {(channels ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="What's it about?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Assign to</Label>
                <Select onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {(members ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createProduction.isPending}>
              Create doc
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
