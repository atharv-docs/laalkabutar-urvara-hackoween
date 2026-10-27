/**
 * Farmer reports: confirmed voice/typed reports land on the field timeline,
 * trigger risk assessment, and close matching tasks when the farmer says so.
 */
import type { CropType, Language, Report, ReportKind, Severity, TaskType, UrvaraState } from "@/types";
import { nextId } from "@/lib/ids";
import { addHours, ms } from "@/lib/time";
import { withAudit } from "./audit";
import { createTask, updateTaskStatus } from "./tasks";
import { findSlot } from "./scheduler";

export interface ReportDraft {
  kind: ReportKind;
  inputMode: Report["inputMode"];
  fieldId: string;
  crop: CropType;
  transcript: string;
  symptom?: string;
  severity: Severity;
  requestedResource?: string;
  taskType?: TaskType;
  language: Language;
  answer?: string;
  answerBy?: "ai" | "rules";
  /** Task the farmer confirmed this completion report refers to. */
  completesTaskId?: string;
}

/** The open task a completion report most plausibly refers to. */
export function matchCompletionTask(state: UrvaraState, userId: string, fieldId: string, taskType?: TaskType) {
  return state.tasks
    .filter(
      (t) =>
        t.assigneeId === userId &&
        t.fieldId === fieldId &&
        (!taskType || t.type === taskType) &&
        ["scheduled", "in_progress", "blocked"].includes(t.status) &&
        ms(t.start) <= ms(addHours(state.now, 24)),
    )
    .sort((a, b) => Math.abs(ms(a.start) - ms(state.now)) - Math.abs(ms(b.start) - ms(state.now)))[0];
}

export function submitReport(state: UrvaraState, draft: ReportDraft, reporterId: string): { state: UrvaraState; reportId: string } {
  const field = state.fields.find((f) => f.id === draft.fieldId);
  if (!field) throw new Error("Unknown field");
  const id = nextId("rpt", state.reports);
  const report: Report = {
    id,
    kind: draft.kind,
    inputMode: draft.inputMode,
    reporterId,
    farmId: field.farmId,
    fieldId: field.id,
    crop: draft.crop,
    transcript: draft.transcript.trim(),
    symptom: draft.symptom,
    severity: draft.severity,
    requestedResource: draft.requestedResource,
    createdAt: state.now,
    observedAt: state.now,
    status: draft.kind === "problem" ? "unverified" : "reviewed",
    language: draft.language,
    answer: draft.answer,
    answerBy: draft.answerBy,
  };
  let next: UrvaraState = { ...state, reports: [report, ...state.reports] };
  const kindLabel: Record<ReportKind, string> = {
    problem: "crop problem",
    completion: "task completion",
    resource_request: "resource request",
    question: "question",
    condition: "field condition",
  };
  next = withAudit(next, reporterId, `report.${draft.kind}`, id, `New ${kindLabel[draft.kind]} report on ${field.name} (${draft.inputMode === "voice" ? "voice transcript" : draft.inputMode === "typed" ? "typed" : "demo sample"})`);
  if (draft.kind === "completion" && draft.completesTaskId) {
    next = updateTaskStatus(next, draft.completesTaskId, "done", reporterId, { note: draft.transcript.slice(0, 120), via: `report ${id}` });
  }
  return { state: next, reportId: id };
}

export function reviewReport(state: UrvaraState, reportId: string, status: Report["status"], note: string, actorId: string): UrvaraState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) return state;
  const reports = state.reports.map((r) => (r.id === reportId ? { ...r, status, reviewNote: note || undefined } : r));
  return withAudit({ ...state, reports }, actorId, `report.${status}`, reportId, `Report ${reportId} marked ${status}${note ? `: ${note}` : ""}`);
}

/** Turn a scouting suggestion into a real inspection task at the next free slot. */
export function createScoutingTask(state: UrvaraState, suggestionId: string, actorId: string): { state: UrvaraState; taskId?: string; error?: string } {
  const suggestion = state.scoutingSuggestions.find((s) => s.id === suggestionId);
  if (!suggestion || suggestion.status !== "suggested") return { state, error: "This suggestion has already been handled." };
  const field = state.fields.find((f) => f.id === suggestion.fieldId)!;
  const assignee = state.users.find((u) => u.role === "farmer" && u.status === "active" && u.fieldIds.includes(field.id));
  if (!assignee) return { state, error: `No active farmer is assigned to ${field.name}. Assign one first.` };
  const report = state.reports.find((r) => r.id === suggestion.sourceReportId);
  const probe = {
    id: "probe",
    type: "scouting",
    farmId: field.farmId,
    fieldId: field.id,
    assigneeId: assignee.id,
    start: state.now,
    end: addHours(state.now, 1),
    due: addHours(state.now, suggestion.category === "high" ? 30 : 54),
    machineIds: [],
  } as unknown as Parameters<typeof findSlot>[1];
  const slot = findSlot(state, probe);
  if (!slot) return { state, error: `${assignee.name} has no free hour before the scouting deadline. Reassign or extend it.` };
  const created = createTask(
    state,
    {
      title: `Scout ${field.name} for ${report?.symptom?.toLowerCase() ?? "reported symptoms"}`,
      type: "scouting",
      fieldId: field.id,
      assigneeId: assignee.id,
      start: slot.start,
      end: slot.end,
      due: probe.due,
      priority: suggestion.category === "high" ? "high" : "medium",
      machineIds: [],
      inputs: [],
      rationale: `Risk ${suggestion.score}/100 (${suggestion.category}) from report ${suggestion.sourceReportId}: ${suggestion.reasons.join("; ")}. Unverified report; inspect and record what you find.`,
    },
    actorId,
  );
  const scoutingSuggestions = created.state.scoutingSuggestions.map((s) =>
    s.id === suggestionId ? { ...s, status: "task_created" as const, taskId: created.taskId } : s,
  );
  return { state: { ...created.state, scoutingSuggestions }, taskId: created.taskId };
}

export function dismissSuggestion(state: UrvaraState, suggestionId: string, actorId: string): UrvaraState {
  const s = state.scoutingSuggestions.find((x) => x.id === suggestionId);
  if (!s) return state;
  const scoutingSuggestions = state.scoutingSuggestions.map((x) => (x.id === suggestionId ? { ...x, status: "dismissed" as const } : x));
  return withAudit({ ...state, scoutingSuggestions }, actorId, "scouting.dismissed", suggestionId, `Dismissed scouting suggestion for ${state.fields.find((f) => f.id === s.fieldId)?.name}`);
}
