"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ClipboardCheck, Info, Microscope, Sprout, XCircle } from "lucide-react";
import type { Report } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, Chip, EmptyState, Label, PageHeader, Panel, Segmented, TextArea, cx } from "@/components/ui/primitives";
import { RiskChip, TaskStatusChip } from "@/components/ui/domain";
import { cropLabel } from "@/data/crops";
import { ageLabel, fmtDayTime, fmtRange } from "@/lib/time";
import { RISK_THRESHOLDS } from "@/services/risk";
import { createScoutingTask, dismissSuggestion, reviewReport } from "@/services/reports";
import { isOverdue } from "@/services/scheduler";
import { FarmMap } from "./FarmMap";

type Filter = "unverified" | "reviewed" | "all";

const INPUT_MODE: Record<Report["inputMode"], string> = {
  voice: "Voice transcript (browser speech)",
  typed: "Typed",
  demo_sample: "Demo sample, not a recording",
};

const SEVERITY: Record<Report["severity"], { label: string; tone: "sage" | "gold" | "terracotta" }> = {
  low: { label: "Low severity", tone: "sage" },
  medium: { label: "Medium severity", tone: "gold" },
  high: { label: "High severity", tone: "terracotta" },
};

function ReportStatusChip({ status }: { status: Report["status"] }) {
  if (status === "unverified") return <Chip tone="gold" icon={Microscope}>Unverified</Chip>;
  if (status === "reviewed") return <Chip tone="sage" icon={CheckCircle2}>Reviewed</Chip>;
  return <Chip tone="neutral" icon={XCircle}>Dismissed</Chip>;
}

export function CropHealthView() {
  const { state, run, toast, user } = useReadyState();
  const params = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [note, setNote] = useState("");

  const problems = useMemo(
    () => state.reports.filter((r) => r.kind === "problem").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.reports],
  );
  const visible = problems.filter((r) => filter === "all" || (filter === "unverified" ? r.status === "unverified" : r.status !== "unverified"));
  const selectedId = params.get("report") ?? visible[0]?.id ?? problems[0]?.id;
  const selected = problems.find((r) => r.id === selectedId);

  const select = (id: string) => {
    setNote("");
    router.replace(`/owner/crop-health?report=${id}`, { scroll: false });
  };

  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? id;
  const fieldName = (id: string) => state.fields.find((f) => f.id === id)?.name ?? id;
  const farmName = (id: string) => state.farms.find((f) => f.id === id)?.name ?? id;

  const suggestions = selected
    ? state.scoutingSuggestions.filter((s) => s.sourceReportId === selected.id).sort((a, b) => b.score - a.score)
    : [];

  return (
    <>
      <PageHeader
        title="Crop Health"
        description="Crop problems reported by farmers, which nearby fields may be at risk, and whether someone has gone to look."
      />

      {problems.length === 0 ? (
        <EmptyState icon={Sprout} title="No crop problems reported">
          When a farmer reports a symptom by voice or text in the Farmer Portal, it appears here and Urvara checks nearby fields.
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Panel
            title="Reports"
            actions={
              <Segmented<Filter>
                label="Filter reports"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "unverified", label: "Unverified" },
                  { value: "reviewed", label: "Reviewed" },
                  { value: "all", label: "All" },
                ]}
              />
            }
            bodyClassName="p-0"
          >
            {visible.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={ClipboardCheck} title={filter === "unverified" ? "Every report has been reviewed" : "No reviewed reports yet"}>
                  Switch the filter to see the rest.
                </EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((r) => {
                  const active = r.id === selected?.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => select(r.id)}
                        aria-current={active ? "true" : undefined}
                        className={cx("w-full px-4 py-3 text-left transition-colors", active ? "bg-forest-tint" : "hover:bg-sunken/60")}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-ink-strong">{cropLabel(r.crop)}</span>
                          <span className="text-sm text-ink">
                            · {fieldName(r.fieldId)}, {farmName(r.farmId)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-ink-strong">{r.symptom ?? r.transcript}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <ReportStatusChip status={r.status} />
                          <Chip tone={SEVERITY[r.severity].tone}>{SEVERITY[r.severity].label}</Chip>
                          <span className="text-xs text-ink-muted">
                            {name(r.reporterId)} · {ageLabel(r.createdAt, state.now)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {selected ? (
            <div className="min-w-0 space-y-5">
              <Panel
                title={`${cropLabel(selected.crop)}: ${selected.symptom ?? "reported problem"}`}
                description={`${fieldName(selected.fieldId)}, ${farmName(selected.farmId)} · reported by ${name(selected.reporterId)} · ${fmtDayTime(selected.createdAt)}`}
                actions={<ReportStatusChip status={selected.status} />}
              >
                <blockquote lang={selected.language} className="rounded-control bg-sunken px-3 py-2.5 text-ink-strong">
                  “{selected.transcript}”
                </blockquote>
                <p className="mt-1.5 text-xs text-ink-muted">
                  {INPUT_MODE[selected.inputMode]} · {{ en: "English", hi: "Hindi", pa: "Punjabi" }[selected.language]} · observed {fmtDayTime(selected.observedAt)}
                </p>
                <p className="mt-3 flex items-start gap-2 rounded-control bg-gold-tint px-3 py-2 text-sm text-gold-ink">
                  <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>Heuristic triage, not a diagnosis. The report stays unverified until someone inspects the field.</span>
                </p>
                {selected.reviewNote && <p className="mt-3 text-sm text-ink">Review note: {selected.reviewNote}</p>}
                {selected.status === "unverified" && (
                  <div className="mt-4">
                    <Label htmlFor="review-note" hint="optional">
                      Review note
                    </Label>
                    <TextArea id="review-note" className="min-h-16" placeholder="e.g. Inspected rows 3–5, early blight lesions confirmed by agronomist" value={note} onChange={(e) => setNote(e.target.value)} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        icon={CheckCircle2}
                        onClick={() => void run((s) => reviewReport(s, selected.id, "reviewed", note.trim(), user.id), { success: "Report marked reviewed", undoable: true }).then(() => setNote(""))}
                      >
                        Mark reviewed
                      </Button>
                      <Button
                        variant="secondary"
                        icon={XCircle}
                        onClick={() => void run((s) => reviewReport(s, selected.id, "dismissed", note.trim(), user.id), { success: "Report dismissed", undoable: true }).then(() => setNote(""))}
                      >
                        Dismiss report
                      </Button>
                    </div>
                  </div>
                )}
              </Panel>

              <Panel title="Nearby fields to scout" description="Scored by the crop-risk module when the report arrived. Highest risk first.">
                <FarmMap
                  farms={state.farms}
                  originFarmId={selected.farmId}
                  risks={suggestions.filter((s) => s.status !== "dismissed").map((s) => ({ farmId: s.farmId, category: s.category, score: s.score }))}
                />
                {!selected.riskAssessedAt ? (
                  <p className="mt-4 text-sm text-ink">Risk check pending. It runs automatically while the Owner Portal is open.</p>
                ) : suggestions.length === 0 ? (
                  <p className="mt-4 text-sm text-ink">No nearby field scored above the scouting threshold (20/100).</p>
                ) : (
                  <ul className="mt-4 divide-y divide-line rounded-control border border-line">
                    {suggestions.map((s) => {
                      const task = s.taskId ? state.tasks.find((t) => t.id === s.taskId) : undefined;
                      return (
                        <li key={s.id} className={cx("px-3 py-3", s.status === "dismissed" && "opacity-70")}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-ink-strong">
                                {fieldName(s.fieldId)} <span className="font-normal text-ink">· {farmName(s.farmId)}</span>
                              </p>
                            </div>
                            <RiskChip category={s.category} score={s.score} />
                          </div>
                          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-ink">
                            {s.reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {s.status === "suggested" && (
                              <>
                                <Button
                                  size="sm"
                                  icon={Microscope}
                                  onClick={() => {
                                    const result = createScoutingTask(state, s.id, user.id);
                                    if (result.error) {
                                      toast({ tone: "error", title: "Scouting task not created", body: result.error });
                                      return;
                                    }
                                    const created = result.state.tasks.find((t) => t.id === result.taskId);
                                    void run(() => result.state, {
                                      success: created ? `Scouting task created for ${fmtRange(created.start, created.end)}` : "Scouting task created",
                                      undoable: true,
                                    });
                                  }}
                                >
                                  Create scouting task
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => void run((st) => dismissSuggestion(st, s.id, user.id), { success: "Suggestion dismissed", undoable: true })}>
                                  Dismiss
                                </Button>
                                {s.alertedAt && <span className="text-xs text-ink-muted">Assigned farmer alerted {ageLabel(s.alertedAt, state.now)}</span>}
                              </>
                            )}
                            {s.status === "task_created" && (
                              <span className="flex flex-wrap items-center gap-1.5 text-sm text-ink">
                                Follow-up:
                                {task ? (
                                  <>
                                    <TaskStatusChip status={task.status} overdue={isOverdue(task, state.now)} />
                                    <span>
                                      {task.title} · {name(task.assigneeId)} · {fmtRange(task.start, task.end)}
                                    </span>
                                  </>
                                ) : (
                                  <span>task {s.taskId}</span>
                                )}
                              </span>
                            )}
                            {s.status === "dismissed" && <Chip tone="neutral">Dismissed by owner</Chip>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>

              <Panel title="How the risk score works">
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
                  <li>
                    <strong className="text-ink-strong">Crop match</strong>: same crop counts fully; the same plant family (e.g. tomato and chilli) about half; unrelated crops very little.
                  </li>
                  <li>
                    <strong className="text-ink-strong">Distance</strong>: within 5 km counts fully, then 10 km, 20 km, and beyond.
                  </li>
                  <li>
                    <strong className="text-ink-strong">Weather</strong>: humidity and rain forecast for the next 48 h at each farm.
                  </li>
                  <li>
                    <strong className="text-ink-strong">Similar reports</strong>: other same-family reports within 20 km this week add up to 20 points.
                  </li>
                  <li>
                    Unverified reports are discounted by 15%. Score {RISK_THRESHOLDS.high}+ is high (scouting recommended), {RISK_THRESHOLDS.medium}–{RISK_THRESHOLDS.high - 1} medium, below that low.
                  </li>
                </ul>
              </Panel>
            </div>
          ) : (
            <EmptyState icon={Sprout} title="Choose a report">
              Select a report to see nearby fields at risk.
            </EmptyState>
          )}
        </div>
      )}
    </>
  );
}
