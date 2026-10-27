/**
 * The facts an AI reply may use, gathered from the farmer's own fields only.
 * Built where the data lives (the browser in demo mode) and sent as plain text,
 * so the model can explain but never invent numbers.
 */
import type { Field, Language, ReportKind, UrvaraState, User } from "@/types";
import { CROPS, STAGE_LABEL, TASK_TYPE_LABEL } from "@/data/crops";
import { addHours, ageLabel, fmtDayTime, ms, relativeDay } from "@/lib/time";
import { blocksOverlapping, weatherFor } from "./scheduler";
import { fieldInsights, latestReading } from "./soil";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ReplyRequest {
  language: Language;
  /** The conversation so far, oldest first; the last turn is the farmer's. */
  messages: ChatTurn[];
  /** Facts from the farmer's records, one per line. */
  facts: string;
  /** Urvara's reading of the farmer's latest message. */
  hint?: {
    kind: ReportKind;
    /** e.g. field, symptom, severity. */
    understood: string;
    /** The rule-based answer, if any: the model should agree with it. */
    draftAnswer?: string;
  };
}

/** Turns sent to the model; older ones are dropped to keep requests small. */
export const MAX_TURNS = 12;

/** Hard cap so a request stays small whatever the seed holds. */
export const MAX_FACTS_CHARS = 4000;

/** "Thu, 29 Oct, 2:00 pm (tomorrow)", so the model never has to work out relative days. */
function when(iso: string, now: string): string {
  const rel = relativeDay(iso, now);
  return ["today", "tomorrow", "yesterday"].includes(rel) ? `${fmtDayTime(iso)} (${rel})` : fmtDayTime(iso);
}

function fieldFacts(state: UrvaraState, field: Field): string[] {
  const lines = [`${field.name}: ${CROPS[field.crop].label}, ${STAGE_LABEL[field.stage].en} stage, ${field.areaAcres} acres, ${field.soilType} soil.`];
  const moisture = latestReading(state, field.id, "moisture");
  if (moisture) lines.push(`  Soil moisture ${moisture.value}% (${ageLabel(moisture.at, state.now)}, ${moisture.source}).`);
  const ph = latestReading(state, field.id, "ph");
  if (ph) lines.push(`  Soil pH ${ph.value} (${ageLabel(ph.at, state.now)}).`);
  for (const insight of fieldInsights(state, field.id).filter((i) => i.level !== "ok").slice(0, 2)) lines.push(`  Note: ${insight.title}. ${insight.detail}`);
  const snapshot = weatherFor(state, field.farmId);
  const blocks = blocksOverlapping(snapshot, state.now, addHours(state.now, 48));
  if (snapshot && blocks.length) {
    const rain = blocks.reduce((s, b) => s + b.rainMm, 0);
    const wettest = blocks.reduce((w, b) => (b.rainProb > w.rainProb ? b : w), blocks[0]);
    const windiest = blocks.reduce((w, b) => (b.windKmh > w.windKmh ? b : w), blocks[0]);
    lines.push(
      `  Weather next 48 h (${snapshot.zoneLabel}, ${snapshot.source} forecast): ${Math.round(rain)} mm rain in total, highest chance ${wettest.rainProb}% at ${when(wettest.start, state.now)}, wind up to ${windiest.windKmh} km/h.`,
    );
  }
  return lines;
}

export function buildReplyFacts(state: UrvaraState, user: User, fieldId: string | undefined): string {
  const fields = state.fields.filter((f) => user.fieldIds.includes(f.id));
  const focus = fields.find((f) => f.id === fieldId);
  const ordered = focus ? [focus, ...fields.filter((f) => f !== focus)] : fields;
  const lines = [`Now: ${fmtDayTime(state.now)} IST. Farmer: ${user.name}${user.village ? `, ${user.village}` : ""}.`];
  for (const field of ordered) lines.push(...fieldFacts(state, field));

  const tasks = state.tasks
    .filter((t) => t.assigneeId === user.id && ["scheduled", "in_progress", "blocked"].includes(t.status) && ms(t.end) > ms(addHours(state.now, -24)))
    .sort((a, b) => ms(a.start) - ms(b.start))
    .slice(0, 5);
  if (tasks.length) {
    lines.push("Upcoming work for this farmer:");
    for (const t of tasks) {
      const where = state.fields.find((f) => f.id === t.fieldId)?.name ?? "";
      const machines = t.machineIds.map((id) => state.resources.find((r) => r.id === id)?.name).filter(Boolean).join(", ");
      lines.push(`  ${TASK_TYPE_LABEL[t.type].en} on ${where}, ${when(t.start, state.now)} (${t.status.replace("_", " ")})${machines ? `, machine ${machines}` : ""}.`);
    }
  }
  return lines.join("\n").slice(0, MAX_FACTS_CHARS);
}
