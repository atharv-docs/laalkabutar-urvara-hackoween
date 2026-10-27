/**
 * Notification module: what each role needs to see first, derived from state.
 */
import type { UrvaraState, User } from "@/types";
import { addHours, fmtRange, ms } from "@/lib/time";
import { cropLabel } from "@/data/crops";
import { detectConflicts } from "./resources";
import { isOverdue, blocksOverlapping, weatherFor } from "./scheduler";
import { latestRiskByField } from "./risk";
import { pick } from "@/lib/i18n";

export interface Alert {
  id: string;
  level: "urgent" | "attention" | "info";
  kind: "approval" | "conflict" | "risk" | "report" | "task" | "weather" | "stock";
  title: string;
  detail: string;
  href: string;
}

const LEVEL_RANK = { urgent: 0, attention: 1, info: 2 } as const;

export function ownerAlerts(state: UrvaraState): Alert[] {
  const out: Alert[] = [];
  for (const p of state.proposals.filter((x) => x.status === "pending")) {
    out.push({ id: `al-${p.id}`, level: "urgent", kind: "approval", title: `Approval needed: ${p.title}`, detail: p.summary, href: `/owner/operations?proposal=${p.id}` });
  }
  for (const t of state.tasks.filter((x) => x.needsAttention && x.status !== "done" && x.status !== "cancelled")) {
    out.push({ id: `al-att-${t.id}`, level: "urgent", kind: "task", title: `Needs attention: ${t.title}`, detail: t.needsAttention!, href: `/owner/operations?task=${t.id}` });
  }
  for (const t of state.tasks.filter((x) => isOverdue(x, state.now))) {
    out.push({ id: `al-od-${t.id}`, level: "attention", kind: "task", title: `Overdue: ${t.title}`, detail: `Was due ${fmtRange(t.start, t.end)}. Not marked complete.`, href: `/owner/operations?task=${t.id}` });
  }
  for (const r of state.reports.filter((x) => x.kind === "problem" && x.status === "unverified")) {
    const field = state.fields.find((f) => f.id === r.fieldId);
    out.push({ id: `al-rpt-${r.id}`, level: r.severity === "high" ? "urgent" : "attention", kind: "report", title: `Unverified crop report: ${cropLabel(r.crop)}, ${field?.name}`, detail: r.symptom ?? r.transcript, href: `/owner/crop-health?report=${r.id}` });
  }
  for (const r of state.reports.filter((x) => x.kind === "resource_request" && ms(x.createdAt) >= ms(addHours(state.now, -24)))) {
    out.push({ id: `al-req-${r.id}`, level: "attention", kind: "report", title: `Resource request: ${r.requestedResource ?? "see transcript"}`, detail: r.transcript, href: `/owner/resources` });
  }
  const high = [...latestRiskByField(state).values()].filter((s) => s.category === "high" && s.status === "suggested");
  if (high.length) {
    out.push({ id: "al-risk", level: "attention", kind: "risk", title: `${high.length} field${high.length > 1 ? "s" : ""} at high scouting risk`, detail: "Suggested inspections are waiting for a decision.", href: "/owner/crop-health" });
  }
  for (const c of detectConflicts(state)) {
    if (c.kind === "machine_unavailable" && state.proposals.some((p) => p.status === "pending" && p.trigger === "machine")) continue;
    out.push({ id: `al-${c.id}`, level: c.severity === "high" ? "urgent" : "attention", kind: c.kind.startsWith("stock") ? "stock" : "conflict", title: c.title, detail: c.detail, href: "/owner/resources" });
  }
  return out.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
}

export function farmerAlerts(state: UrvaraState, user: User): Alert[] {
  const out: Alert[] = [];
  const mine = state.tasks.filter((t) => t.assigneeId === user.id);
  for (const t of mine.filter((x) => x.changeNotice)) {
    out.push({ id: `fa-chg-${t.id}`, level: "attention", kind: "task", title: pick(user.language, t.title, t.titleHi, t.titlePa), detail: t.changeNotice!, href: `/farmer/tasks/${t.id}` });
  }
  for (const t of mine.filter((x) => isOverdue(x, state.now))) {
    out.push({ id: `fa-od-${t.id}`, level: "attention", kind: "task", title: pick(user.language, t.title, t.titleHi, t.titlePa), detail: "overdue", href: `/farmer/tasks/${t.id}` });
  }
  const risk = latestRiskByField(state);
  for (const fieldId of user.fieldIds) {
    const s = risk.get(fieldId);
    if (s && s.category === "high") {
      const field = state.fields.find((f) => f.id === fieldId);
      out.push({ id: `fa-risk-${fieldId}`, level: "attention", kind: "risk", title: field?.name ?? fieldId, detail: "risk", href: `/farmer/fields` });
    }
  }
  for (const farmId of user.farmIds) {
    const snapshot = weatherFor(state, farmId);
    const wet = blocksOverlapping(snapshot, state.now, addHours(state.now, 36)).find((b) => b.rainProb >= 60);
    if (wet && !out.some((a) => a.kind === "weather")) {
      out.push({ id: `fa-wx-${farmId}`, level: "attention", kind: "weather", title: `${wet.rainProb}%`, detail: wet.start, href: "/farmer" });
    }
  }
  return out;
}
