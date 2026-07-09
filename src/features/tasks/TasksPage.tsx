import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  KanbanSquare,
  ListTodo,
  Plus,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateTask,
  useDeleteTask,
  useDiscordConfig,
  useMe,
  useMembers,
  useProductions,
  useSaveDiscordConfig,
  useTasks,
  useUpdateTask,
} from "@/hooks/queries";
import { notifyTaskCreated, notifyTaskStatus, sendTestPing } from "@/lib/discord";
import { usePersistedState } from "@/hooks/usePersistedState";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "todo", label: "To do" },
  { status: "doing", label: "In progress" },
  { status: "done", label: "Done" },
];

const NEXT: Record<TaskStatus, TaskStatus | null> = { todo: "doing", doing: "done", done: null };

function dueTone(task: Task): string {
  if (!task.dueAt || task.status === "done") return "text-muted-foreground";
  return new Date(task.dueAt).getTime() < Date.now() ? "text-destructive" : "text-muted-foreground";
}

function shortDue(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function TaskCard({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: me } = useMe();
  const { data: config } = useDiscordConfig();
  const next = NEXT[task.status];

  const move = (status: TaskStatus) => {
    updateTask.mutate(
      { id: task.id, patch: { status } },
      {
        onSuccess: (updated) => {
          if (config) notifyTaskStatus(config, updated, me?.displayName ?? "Someone");
        },
      },
    );
  };

  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "text-sm font-medium leading-snug",
              task.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </div>
          <button
            className="shrink-0 p-0.5 text-muted-foreground transition-colors hover:text-destructive"
            onClick={() => deleteTask.mutate(task.id, { onSuccess: () => toast("Task removed") })}
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {task.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{task.notes}</p>}
        <div className="flex items-center gap-2">
          {task.assigneeName && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px]">
                  {task.assigneeName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {task.assigneeName}
            </span>
          )}
          {task.dueAt && (
            <span className={cn("flex items-center gap-1 text-xs", dueTone(task))}>
              <CalendarDays className="h-3 w-3" /> {shortDue(task.dueAt)}
            </span>
          )}
          <span className="ml-auto" />
          {next && (
            <Button size="sm" variant="secondary" className="h-6 px-2 text-xs" onClick={() => move(next)}>
              {next === "done" ? <Check className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
              {next === "doing" ? "Start" : "Done"}
            </Button>
          )}
          {!next && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => move("todo")}>
              Reopen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * One schedule, visual: a month grid of tasks + production due dates.
 * Tap a day to see its items; dots mark what kind of work lands there.
 */
function TasksCalendar({ tasks }: { tasks: Task[] }) {
  const { data: productions } = useProductions();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  type Item = { when: Date; label: string; kind: "task" | "video"; done: boolean; to?: string };
  const items: Item[] = useMemo(
    () =>
      [
        ...tasks
          .filter((t) => t.dueAt)
          .map((t) => ({
            when: new Date(t.dueAt!),
            label: t.assigneeName ? `${t.title} · ${t.assigneeName}` : t.title,
            kind: "task" as const,
            done: t.status === "done",
          })),
        ...(productions ?? [])
          .filter((p) => (p.dueDate || p.scheduledAt) && p.stage !== "published")
          .map((p) => ({
            when: new Date(p.scheduledAt ?? p.dueDate!),
            label: p.title,
            kind: "video" as const,
            done: false,
            to: `/production/${p.id}`,
          })),
      ].sort((a, b) => a.when.getTime() - b.when.getTime()),
    [tasks, productions],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const key = dayKey(item.when);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  // Build the month grid, Monday-first, padded to full weeks.
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: Array<Date | null> = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(new Date(month.getFullYear(), month.getMonth(), d));
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [month]);

  const now = new Date();
  const todayKey = dayKey(now);
  const selectedItems = byDay.get(selected) ?? [];
  const selectedDate = new Date(selected + "T12:00:00");
  const shift = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 sm:p-4">
          {/* Month header */}
          <div className="mb-2 flex items-center justify-between">
            <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {month.toLocaleDateString("en", { month: "long", year: "numeric" })}
              </span>
              {dayKey(new Date(month.getFullYear(), month.getMonth(), 15)) .slice(0, 7) !==
                todayKey.slice(0, 7) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    const d = new Date();
                    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                    setSelected(todayKey);
                  }}
                >
                  Today
                </Button>
              )}
            </div>
            <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase text-muted-foreground">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const key = dayKey(date);
              const dayItems = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              const hasOverdue = dayItems.some((it) => !it.done && it.when.getTime() < now.getTime());
              return (
                <button
                  key={i}
                  onClick={() => setSelected(key)}
                  aria-label={date.toDateString()}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-xs tabular-nums transition-colors",
                    isSelected
                      ? "bg-primary/15 font-semibold text-primary"
                      : "hover:bg-muted",
                    isToday && !isSelected && "font-semibold text-primary",
                    isToday && "ring-1 ring-inset ring-primary/50",
                  )}
                >
                  {date.getDate()}
                  <span className="flex h-1.5 items-center gap-0.5">
                    {dayItems.slice(0, 3).map((it, j) => (
                      <span
                        key={j}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          hasOverdue && !it.done
                            ? "bg-destructive"
                            : it.kind === "video"
                              ? "bg-warning"
                              : "bg-primary",
                          it.done && "opacity-40",
                        )}
                      />
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[8px] leading-none text-muted-foreground">
                        +{dayItems.length - 3}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> task
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" /> video
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> overdue
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Selected day */}
      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">
          {selectedDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        {selectedItems.length === 0 ? (
          <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
            Nothing scheduled this day.
          </p>
        ) : (
          <div className="space-y-1.5">
            {selectedItems.map((item, i) => {
              const overdue = !item.done && item.when.getTime() < now.getTime();
              const row = (
                <div
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                    item.done && "opacity-60",
                  )}
                >
                  {item.kind === "video" ? (
                    <Clapperboard className="h-3.5 w-3.5 shrink-0 text-warning" />
                  ) : (
                    <ListTodo className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  <span className={cn("min-w-0 flex-1 truncate", item.done && "line-through")}>
                    {item.label}
                  </span>
                  {overdue && <Badge variant="destructive">overdue</Badge>}
                  {item.kind === "video" && <Badge variant="outline">video</Badge>}
                </div>
              );
              return item.to ? (
                <Link key={i} to={item.to} className="block">
                  {row}
                </Link>
              ) : (
                <div key={i}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Local-time YYYY-MM-DD (never UTC — due dates are what the team sees). */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function DiscordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: members } = useMembers();
  const { data: config } = useDiscordConfig();
  const save = useSaveDiscordConfig();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [userIds, setUserIds] = useState<Record<string, string>>({});
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Hydrate the form once per open from the stored config.
  if (open && loadedFor !== "open") {
    setWebhookUrl(config?.webhookUrl ?? "");
    setUserIds(config?.userIds ?? {});
    setLoadedFor("open");
  }
  if (!open && loadedFor === "open") setLoadedFor(null);

  const submit = async () => {
    try {
      await save.mutateAsync({ webhookUrl: webhookUrl.trim(), userIds });
      if (webhookUrl.trim()) {
        await sendTestPing(webhookUrl.trim());
        toast.success("Connected — check your Discord channel for the test ping");
      } else {
        toast.success("Discord notifications turned off");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Discord notifications
          </DialogTitle>
          <DialogDescription>
            Task updates post to one channel. Map each teammate to their Discord user ID and
            they get @mentioned on their tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Webhook URL</Label>
            <Input
              type="password"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/…"
            />
            <p className="text-xs text-muted-foreground">
              Discord → your server → channel settings → Integrations → Webhooks → New webhook →
              Copy URL.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>@Mentions (optional)</Label>
            {(members ?? []).map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="w-20 shrink-0 truncate text-sm">{m.displayName}</span>
                <Input
                  value={userIds[m.id] ?? ""}
                  onChange={(e) => setUserIds({ ...userIds, [m.id]: e.target.value })}
                  placeholder="Discord user ID (right-click profile → Copy User ID)"
                  className="h-8 text-xs"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Needs Developer Mode on in Discord (Settings → Advanced) to copy IDs.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            Save & test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TasksPage() {
  const { data: tasks, isLoading } = useTasks();
  const { data: members } = useMembers();
  const { data: me } = useMe();
  const { data: config } = useDiscordConfig();
  const createTask = useCreateTask();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);
  const [form, setForm, clearForm] = usePersistedState("draft.task", {
    title: "", notes: "", assigneeId: "", dueAt: "",
  });

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const c of COLUMNS) map.set(c.status, []);
    for (const t of tasks ?? []) map.get(t.status)?.push(t);
    return map;
  }, [tasks]);

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error("Give the task a title");
      return;
    }
    try {
      const created = await createTask.mutateAsync({
        title: form.title.trim(),
        notes: form.notes.trim() || undefined,
        assigneeId: form.assigneeId || undefined,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      });
      if (config) notifyTaskCreated(config, created, me?.displayName ?? "Someone");
      toast.success("Task added");
      clearForm();
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tasks"
        description="Who's doing what, by when — with the publish schedule on the same calendar."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDiscordOpen(true)}>
              <Bell /> {config ? "Discord ✓" : "Connect Discord"}
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus /> New task
            </Button>
          </>
        }
      />

      <Tabs defaultValue="board">
        <TabsList className="mb-4">
          <TabsTrigger value="board" className="gap-1.5">
            <KanbanSquare className="h-3.5 w-3.5" /> Board
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          {(tasks ?? []).length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="Nothing on the board"
              description="Add the first task — assign it, give it a due date, and (with Discord connected) your teammate gets pinged automatically."
              action={
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus /> New task
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-3 md:gap-4">
              {COLUMNS.map(({ status, label }) => (
                <div key={status}>
                  <div className="mb-2 flex items-center justify-between px-0.5">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <Badge variant="secondary">{byStatus.get(status)?.length ?? 0}</Badge>
                  </div>
                  <div className="space-y-2">
                    {(byStatus.get(status) ?? []).map((t) => (
                      <TaskCard key={t.id} task={t} />
                    ))}
                    {(byStatus.get(status) ?? []).length === 0 && status !== "todo" && (
                      <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                        Empty
                      </div>
                    )}
                    {status === "todo" && (
                      <Input
                        placeholder="Add a task — press Enter"
                        className="h-9 border-dashed text-sm"
                        onKeyDown={(e) => {
                          const title = e.currentTarget.value.trim();
                          if (e.key !== "Enter" || !title) return;
                          const input = e.currentTarget;
                          createTask.mutate(
                            { title },
                            { onSuccess: () => { input.value = ""; } },
                          );
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <TasksCalendar tasks={tasks ?? []} />
        </TabsContent>
      </Tabs>

      {/* New task */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Task</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Record VO for the guitar video"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Assign to</Label>
                <Select
                  value={form.assigneeId}
                  onValueChange={(v) => setForm({ ...form, assigneeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
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
                <Label>Due</Label>
                <Input
                  type="date"
                  value={form.dueAt}
                  onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createTask.isPending}>
              <Plus /> Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DiscordDialog open={discordOpen} onOpenChange={setDiscordOpen} />
    </div>
  );
}
