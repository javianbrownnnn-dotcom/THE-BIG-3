import type { DiscordConfig, Task } from "@/types";

/**
 * Task notifications via a Discord webhook — sent straight from the browser
 * (Discord webhooks are CORS-enabled and need no auth beyond the URL).
 * Fire-and-forget: a failed ping never blocks the task action itself.
 */
async function post(webhookUrl: string, content: string): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: ["users"] } }),
  });
}

function mention(config: DiscordConfig, memberId?: string, fallback?: string): string {
  const discordId = memberId ? config.userIds[memberId] : undefined;
  return discordId ? `<@${discordId}>` : (fallback ?? "unassigned");
}

function due(task: Task): string {
  return task.dueAt
    ? ` — due ${new Date(task.dueAt).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}`
    : "";
}

export function notifyTaskCreated(config: DiscordConfig, task: Task, actor: string): void {
  post(
    config.webhookUrl,
    `📋 **${actor}** created **${task.title}** → ${mention(config, task.assigneeId, task.assigneeName)}${due(task)}`,
  ).catch(() => void 0);
}

export function notifyTaskAssigned(config: DiscordConfig, task: Task, actor: string): void {
  post(
    config.webhookUrl,
    `👉 **${actor}** assigned **${task.title}** to ${mention(config, task.assigneeId, task.assigneeName)}${due(task)}`,
  ).catch(() => void 0);
}

export function notifyTaskStatus(config: DiscordConfig, task: Task, actor: string): void {
  const line =
    task.status === "done"
      ? `✅ **${actor}** completed **${task.title}**`
      : `🔄 **${actor}** moved **${task.title}** to **${task.status === "doing" ? "In progress" : "To do"}** (${mention(config, task.assigneeId, task.assigneeName)})`;
  post(config.webhookUrl, line).catch(() => void 0);
}

/** Settings-dialog test ping so the webhook can be verified in one click. */
export async function sendTestPing(webhookUrl: string): Promise<void> {
  await post(webhookUrl, "👋 The Big 3 OS is connected — task notifications will land here.");
}
