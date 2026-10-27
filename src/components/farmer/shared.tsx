"use client";

/**
 * Farmer Portal building blocks: task icons, localised status, and task cards.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
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
import { pick, tr } from "@/lib/i18n";
import { tx } from "@/lib/i18n-farmer-extra";
import { fmtDayLocalised, fmtTimeLocalised, ms } from "@/lib/time";
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

export function TaskIcon({ type, size = "md", className }: { type: TaskType; size?: "md" | "lg"; className?: string }) {
  const Icon = TASK_ICON[type];
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-panel", TASK_TILE[type], size === "lg" ? "size-16" : "size-12", className)}>
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
  return pick(lang, task.title, task.titleHi, task.titlePa);
}

/** Due within two days and not finished: worth a nudge on the card. */
function dueSoon(task: Task, now: string) {
  if (!task.due || task.status === "done" || isOverdue(task, now)) return false;
  const left = ms(task.due) - ms(now);
  return left > 0 && left <= 48 * 3_600_000;
}

/**
 * One task as a large, tappable card. The action button lives outside the link.
 * `grouped` renders it as a row inside a shared panel instead of its own card;
 * `featured` sets it larger, for today's work.
 */
export function TaskCard({
  task,
  state,
  lang,
  action,
  grouped,
  featured,
}: {
  task: Task;
  state: UrvaraState;
  lang: Language;
  action?: ReactNode;
  grouped?: boolean;
  featured?: boolean;
}) {
  const active = task.status === "in_progress" || task.status === "blocked" || isOverdue(task, state.now);
  return (
    <li
      className={cx(
        "flex flex-col sm:flex-row sm:items-center",
        grouped ? "transition-colors hover:bg-canvas/60" : "rounded-panel border bg-surface shadow-panel",
        !grouped && (task.changeNotice ? "border-gold" : "border-line"),
        featured && active && "shadow-[inset_4px_0_0_var(--color-gold)]",
      )}
    >
      <Link href={`/farmer/tasks/${task.id}`} className={cx("flex min-w-0 flex-1 items-start gap-4 sm:items-center", featured ? "p-5 sm:gap-5 sm:p-6" : "p-4 sm:p-5")}>
        <TaskIcon type={task.type} size={featured ? "lg" : "md"} className={featured ? "max-sm:size-14" : "sm:size-14"} />
        <span className="min-w-0 flex-1">
          <span className={cx("block font-semibold leading-snug text-ink-strong", featured ? "text-xl sm:text-[1.375rem]" : "text-lg")}>{taskTitle(task, lang)}</span>
          <span className="mt-0.5 block text-ink">
            {taskTypeLabel(task.type, lang)} · {cropLabel(task.crop, lang)} · {fieldName(state, task.fieldId)}
          </span>
          <span className="tabular mt-1 flex items-center gap-1.5 text-ink">
            <CalendarDays aria-hidden className="size-4 shrink-0 text-ink-muted" />
            {whenLabel(task, lang)}
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <FarmerStatusChip task={task} lang={lang} now={state.now} />
            {task.changeNotice && (
              <Chip tone="gold" icon={AlertTriangle} className="text-sm">
                {tr(lang, "changed")}
              </Chip>
            )}
            {dueSoon(task, state.now) && (
              <Chip tone="gold" icon={Clock3} className="text-sm">
                {tx(lang, "dueSoon")}
              </Chip>
            )}
          </span>
        </span>
        {!action && (
          <>
            <span className="hidden h-11 shrink-0 items-center rounded-control border border-line-strong bg-surface px-4 text-[0.9375rem] font-semibold text-ink-strong sm:inline-flex">
              {tx(lang, "viewDetails")}
            </span>
            <ChevronRight aria-hidden className="mt-3 size-5 shrink-0 text-ink-muted sm:hidden" />
          </>
        )}
      </Link>
      {action && (
        <div className={cx("sm:shrink-0 sm:py-0 sm:pl-0", featured ? "px-5 pb-5 sm:pb-0 sm:pr-6" : "border-t border-line px-4 py-3 sm:border-0 sm:pr-5")}>{action}</div>
      )}
    </li>
  );
}
