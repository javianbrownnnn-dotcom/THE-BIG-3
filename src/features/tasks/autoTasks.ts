// Auto-tasks: when a video doc enters a stage, the standard task set for that
// stage appears on the board automatically — assigned to the doc's owner, due
// when the doc is due, Discord-pinged if connected. Deduped by exact title so
// bouncing between stages never duplicates work.

import { toast } from "sonner";
import {
  useCreateTask,
  useDiscordConfig,
  useMe,
  useTasks,
} from "@/hooks/queries";
import { notifyTaskCreated } from "@/lib/discord";
import type { Production, ProductionStage } from "@/types";

const STAGE_TASKS: Partial<Record<ProductionStage, string[]>> = {
  editing: ["Edit", "Record/generate VO"],
  packaging: ["Design thumbnail", "Finalize title + description"],
  scheduled: ["Publish QA check"],
};

export function useAutoStageTasks() {
  const { data: tasks } = useTasks();
  const createTask = useCreateTask();
  const { data: config } = useDiscordConfig();
  const { data: me } = useMe();

  return async (production: Production, stage: ProductionStage) => {
    const templates = STAGE_TASKS[stage];
    if (!templates) return;
    const existing = new Set((tasks ?? []).map((t) => t.title));
    let created = 0;
    for (const prefix of templates) {
      const title = `${prefix}: ${production.title}`;
      if (existing.has(title)) continue;
      try {
        const task = await createTask.mutateAsync({
          title,
          assigneeId: production.assigneeId,
          dueAt: production.dueDate
            ? new Date(production.dueDate).toISOString()
            : undefined,
          notes: `Auto-created — "${production.title}" moved to ${stage}.`,
        });
        if (config) notifyTaskCreated(config, task, me?.displayName ?? "The Big 3 OS");
        created++;
      } catch {
        // Task creation is a convenience — never block the stage change.
      }
    }
    if (created) {
      toast(`${created} task${created > 1 ? "s" : ""} added to the board for ${stage}`);
    }
  };
}
