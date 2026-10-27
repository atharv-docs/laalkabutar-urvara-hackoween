"use client";

/**
 * Domain-specific chips and labels shared by both portals.
 */
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  CloudSun,
  Database,
  FlaskConical,
  Hand,
  PauseCircle,
  PlayCircle,
  Radio,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { DataProvenance, Priority, ScoutingSuggestion, TaskStatus } from "@/types";
import { useUrvara } from "@/components/providers/UrvaraProvider";
import { ageLabel, fmtDayTime, isStale } from "@/lib/time";
import { Chip, cx } from "./primitives";

/** The Urvara mark (sprout over furrows), cut out of the supplied logo. "light" for dark grounds, "forest" for light ones. */
export function Logo({ size = 36, ground = "dark", className }: { size?: number; ground?: "dark" | "light"; className?: string }) {
  return (
    <Image
      src={ground === "dark" ? "/brand/urvara-mark-light.png" : "/brand/urvara-mark-forest.png"}
      alt=""
      width={size}
      height={Math.round((size * 400) / 440)}
      priority
      className={cx("shrink-0", className)}
    />
  );
}

export function Wordmark({ tone = "dark", size = "md" }: { tone?: "dark" | "light"; size?: "md" | "lg" }) {
  return (
    <span className={cx("inline-flex items-baseline gap-1.5 font-semibold tracking-[-0.01em]", size === "lg" ? "text-3xl" : "text-xl", tone === "light" ? "text-ivory" : "text-forest")}>
      Urvara
      <span className={cx("font-medium", size === "lg" ? "text-xl" : "text-sm", tone === "light" ? "text-sage" : "text-sage-ink")}>AI</span>
    </span>
  );
}

/** Persistent indicator of where the data on screen actually comes from. */
export function DataSourceBadge({ inverse = false, shortLabel }: { inverse?: boolean; shortLabel?: { demo: string; live: string } }) {
  const { repo } = useUrvara();
  const demo = repo.source === "demo";
  return (
    <span
      title={repo.description}
      className={cx(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold tracking-[0.04em]",
        demo ? (inverse ? "bg-gold text-ink-strong" : "bg-gold-tint text-gold-ink") : inverse ? "bg-sage text-ink-strong" : "bg-sage-tint text-sage-ink",
      )}
    >
      {demo ? <FlaskConical aria-hidden className="size-3.5" /> : <Database aria-hidden className="size-3.5" />}
      {shortLabel ? (demo ? shortLabel.demo : shortLabel.live) : demo ? "DEMO DATA" : "LIVE DATA"}
    </span>
  );
}

const PROVENANCE: Record<DataProvenance, { label: string; tone: "gold" | "sage" | "neutral"; icon: typeof Radio }> = {
  live: { label: "Live", tone: "sage", icon: Radio },
  manual: { label: "Manual entry", tone: "neutral", icon: Hand },
  simulated: { label: "Simulated", tone: "gold", icon: FlaskConical },
  seeded: { label: "Demo forecast", tone: "gold", icon: FlaskConical },
};

/** Source + timestamp for any reading. Stale readings say so. */
export function Provenance({ source, at, now, staleAfterHours, className }: { source: DataProvenance; at: string; now: string; staleAfterHours?: number; className?: string }) {
  const p = PROVENANCE[source];
  const stale = staleAfterHours != null && isStale(at, now, staleAfterHours);
  return (
    <span className={cx("inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-muted", className)}>
      <Chip tone={p.tone} icon={p.icon}>
        {p.label}
      </Chip>
      <time dateTime={at} title={fmtDayTime(at)}>
        {ageLabel(at, now)}
      </time>
      {stale && (
        <Chip tone="terracotta" icon={AlertTriangle}>
          Stale
        </Chip>
      )}
    </span>
  );
}

const STATUS: Record<TaskStatus, { label: string; tone: "forest" | "sage" | "gold" | "terracotta" | "neutral"; icon: typeof CircleDot }> = {
  suggested: { label: "Suggested", tone: "neutral", icon: Sparkles },
  scheduled: { label: "Scheduled", tone: "forest", icon: CircleDot },
  in_progress: { label: "In progress", tone: "gold", icon: PlayCircle },
  done: { label: "Done", tone: "sage", icon: CheckCircle2 },
  blocked: { label: "Blocked", tone: "terracotta", icon: PauseCircle },
  cancelled: { label: "Cancelled", tone: "neutral", icon: XCircle },
};

export function TaskStatusChip({ status, overdue }: { status: TaskStatus; overdue?: boolean }) {
  if (overdue) {
    return (
      <Chip tone="terracotta" icon={AlertTriangle}>
        Overdue
      </Chip>
    );
  }
  const s = STATUS[status];
  return (
    <Chip tone={s.tone} icon={s.icon}>
      {s.label}
    </Chip>
  );
}

export function PriorityChip({ priority }: { priority: Priority }) {
  if (priority === "low") return <Chip tone="neutral">Low</Chip>;
  return <Chip tone={priority === "high" ? "gold" : "neutral"}>{priority === "high" ? "High priority" : "Medium"}</Chip>;
}

export function RiskChip({ category, score }: { category: ScoutingSuggestion["category"] | "none"; score?: number }) {
  if (category === "none") return <Chip tone="neutral" icon={CircleDashed}>No risk flag</Chip>;
  const tone = category === "high" ? "terracotta" : category === "medium" ? "gold" : "sage";
  const label = category === "high" ? "High risk" : category === "medium" ? "Medium risk" : "Low risk";
  return (
    <Chip tone={tone} icon={category === "high" ? ShieldAlert : category === "medium" ? AlertTriangle : CloudSun}>
      {label}
      {score != null && <span className="tabular font-medium opacity-80">· {score}</span>}
    </Chip>
  );
}
