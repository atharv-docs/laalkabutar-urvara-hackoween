"use client";

/**
 * Farmer Portal building blocks: task icons, localised status, and task cards.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Droplets,
  PauseCircle,
  PlayCircle,
  Scissors,
  Search,
  Shovel,
  SprayCan,
  Sprout,
  Wheat,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Language, Task, TaskStatus, TaskType, UrvaraState } from "@/types";
import { TASK_TYPE_LABEL, cropLabel } from "@/data/crops";
import { tr } from "@/lib/i18n";
import { fmtDayLocalised, fmtTimeLocalised } from "@/lib/time";
import { isOverdue } from "@/services/scheduler";
import { Chip, cx, type Tone } from "@/components/ui/primitives";

export const TASK_ICON: Record<TaskType, LucideIcon> = {
  irrigation: Droplets,
  spraying: SprayCan,
  fertiliser: Sprout,
  harvest: Wheat,
  scouting: Search,
  sowing: Shovel,
  pruning: Scissors,
};

/** Icon tile colour per task type; the label beside it carries the meaning. */
const TASK_TILE: Record<TaskType, string> = {
  irrigation: "bg-forest-tint text-forest",
  spraying: "bg-gold-tint text-gold-ink",
  fertiliser: "bg-sage-tint text-sage-ink",
  harvest: "bg-gold-tint text-gold-ink",
  scouting: "bg-terracotta-tint text-terracotta-ink",
  sowing: "bg-sage-tint text-sage-ink",
  pruning: "bg-forest-tint text-forest",
};

export function TaskIcon({ type, size = "md" }: { type: TaskType; size?: "md" | "lg" }) {
  const Icon = TASK_ICON[type];
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-panel", TASK_TILE[type], size === "lg" ? "size-16" : "size-12")}>
      <Icon aria-hidden className={size === "lg" ? "size-8" : "size-6"} />
    </span>
  );
}

const STATUS: Record<TaskStatus, { key: "done" | "inProgress" | "blocked" | "scheduled"; tone: Tone; icon: LucideIcon }> = {
  suggested: { key: "scheduled", tone: "neutral", icon: CircleDot },
  scheduled: { key: "scheduled", tone: "forest", icon: CircleDot },
  in_progress: { key: "inProgress", tone: "gold", icon: PlayCircle },
  done: { key: "done", tone: "sage", icon: CheckCircle2 },
  blocked: { key: "blocked", tone: "terracotta", icon: PauseCircle },
  cancelled: { key: "scheduled", tone: "neutral", icon: XCircle },
};

export function FarmerStatusChip({ task, lang, now }: { task: Task; lang: Language; now: string }) {
  if (isOverdue(task, now)) {
    return (
      <Chip tone="terracotta" icon={AlertTriangle} className="text-sm">
        {tr(lang, "overdue")}
      </Chip>
    );
  }
  const s = STATUS[task.status];
  return (
    <Chip tone={s.tone} icon={s.icon} className="text-sm">
      {tr(lang, s.key)}
    </Chip>
  );
}

export function taskTypeLabel(type: TaskType, lang: Language) {
  return TASK_TYPE_LABEL[type][lang];
}

export function fieldName(state: UrvaraState, fieldId: string) {
  return state.fields.find((f) => f.id === fieldId)?.name ?? fieldId;
}

export function whenLabel(task: Task, lang: Language) {
  return `${fmtDayLocalised(task.start, lang)} · ${fmtTimeLocalised(task.start, lang)}–${fmtTimeLocalised(task.end, lang)}`;
}

export function taskTitle(task: Task, lang: Language): string {
  return lang === "hi" && task.titleHi ? task.titleHi : task.title;
}

/** One task as a large, tappable card. The action button lives outside the link. */
export function TaskCard({
  task,
  state,
  lang,
  action,
}: {
  task: Task;
  state: UrvaraState;
  lang: Language;
  action?: ReactNode;
}) {
  return (
    <li className={cx("rounded-panel border bg-surface shadow-panel", task.changeNotice ? "border-gold" : "border-line")}>
      <Link href={`/farmer/tasks/${task.id}`} className="flex items-start gap-3 p-3.5">
        <TaskIcon type={task.type} />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold leading-snug text-ink-strong">{taskTitle(task, lang)}</span>
          <span className="mt-0.5 block text-ink">
            {taskTypeLabel(task.type, lang)} · {cropLabel(task.crop, lang)} · {fieldName(state, task.fieldId)}
          </span>
          <span className="tabular mt-0.5 block text-ink">{whenLabel(task, lang)}</span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <FarmerStatusChip task={task} lang={lang} now={state.now} />
            {task.changeNotice && (
              <Chip tone="gold" icon={AlertTriangle} className="text-sm">
                {tr(lang, "changed")}
              </Chip>
            )}
          </span>
        </span>
      </Link>
      {action && <div className="border-t border-line px-3.5 py-3">{action}</div>}
    </li>
  );
}
