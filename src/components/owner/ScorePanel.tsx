"use client";

import { useState, type FormEvent } from "react";
import { History, PenLine, Trophy, Users } from "lucide-react";
import type { CropSeasonRecord, CropType, RupeeScoreRecord, Season, UrvaraState } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, Chip, EmptyState, FieldError, Label, Panel, Select, TextArea, TextInput, cx } from "@/components/ui/primitives";
import { CROP_ORDER, cropLabel } from "@/data/crops";
import { fmtDay } from "@/lib/time";
import { correctRecord, latestScore, leaderboard, scoreHistory, seasonsWithData, type ScoreCorrection } from "@/services/rupeeScore";
import { ScoreHistoryChart } from "./PerformanceCharts";

type CorrectionType = ScoreCorrection["type"];

const CORRECTION_LABEL: Record<CorrectionType, string> = {
  excuse: "Excuse a late task (outside the farmer's control)",
  unexcuse: "Remove an excuse",
  verify: "Verify an unverified task",
  yield: "Correct harvest quantity",
  grade: "Correct quality grade",
  annotate: "Add a note only (disputed outcome)",
};

function ScoreValue({ score }: { score: number | null | undefined }) {
  if (score == null) return <Chip tone="neutral">Not enough data</Chip>;
  return (
    <span className="tabular text-lg font-semibold text-gold-ink">
      {score}
      <span className="text-sm font-medium text-ink-muted"> / 100</span>
    </span>
  );
}

function Breakdown({ score }: { score: RupeeScoreRecord }) {
  return (
    <ul className="space-y-3">
      {score.components.map((c) => (
        <li key={c.key}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-ink-strong">
              {c.label} <span className="text-sm font-normal text-ink-muted">· weight {c.weight}%</span>
            </span>
            <span className="tabular text-sm font-semibold text-ink-strong">{c.value == null ? "No data" : `${c.value} / 100`}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
            {c.value != null && <div className="h-full rounded-full bg-gold" style={{ width: `${c.value}%` }} />}
          </div>
          <p className="mt-1 text-sm text-ink">{c.detail}</p>
          {c.sources.length > 0 && (
            <p className="mt-0.5 break-words text-xs text-ink-muted">
              Source records: <span className="tabular">{c.sources.join(", ")}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function CorrectionForm({ record, state }: { record: CropSeasonRecord; state: UrvaraState }) {
  const { run, user } = useReadyState();
  const [type, setType] = useState<CorrectionType>("excuse");
  const [taskLogId, setTaskLogId] = useState("");
  const [reason, setReason] = useState("");
  const [yieldQ, setYieldQ] = useState(String(record.actualYieldQ ?? ""));
  const [grade, setGrade] = useState<"A" | "B" | "C">(record.qualityGrade ?? "B");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const late = record.taskLog.filter((t) => t.verified && !t.onTime && !t.excusedReason);
  const excused = record.taskLog.filter((t) => t.excusedReason);
  const unverified = record.taskLog.filter((t) => !t.verified);
  const options = type === "excuse" ? late : type === "unexcuse" ? excused : type === "verify" ? unverified : [];
  const needsTask = type === "excuse" || type === "unexcuse" || type === "verify";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const chosen = options.find((o) => o.id === taskLogId)?.id ?? options[0]?.id;
    if (needsTask && !chosen) errs.task = "There is no task record of this kind to correct.";
    if (type === "excuse" && !reason.trim()) errs.reason = "Say what was outside the farmer's control, e.g. canal closure.";
    const q = Number(yieldQ);
    if (type === "yield" && (!Number.isFinite(q) || q <= 0)) errs.yield = "Enter the harvest in quintals, greater than 0.";
    if (!note.trim()) errs.note = "Add a note explaining the evidence for this correction.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    let correction: ScoreCorrection;
    switch (type) {
      case "excuse":
        correction = { type, taskLogId: chosen!, reason: reason.trim() };
        break;
      case "unexcuse":
      case "verify":
        correction = { type, taskLogId: chosen! };
        break;
      case "yield":
        correction = { type, actualYieldQ: q };
        break;
      case "grade":
        correction = { type, grade };
        break;
      default:
        correction = { type: "annotate", text: note.trim() };
    }
    const before = latestScore(state, record.farmerId, record.crop, record.season)?.score;
    const preview = correctRecord(state, record.id, correction, note.trim(), user.id);
    const after = latestScore(preview, record.farmerId, record.crop, record.season)?.score;
    const ok = await run((s) => correctRecord(s, record.id, correction, note.trim(), user.id), {
      success: `Record corrected. Rupee Score ${before ?? "n/a"} → ${after ?? "not enough data"}`,
    });
    if (ok) {
      setNote("");
      setReason("");
      setTaskLogId("");
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div>
        <Label htmlFor="corr-type">What needs correcting?</Label>
        <Select id="corr-type" value={type} onChange={(e) => { setType(e.target.value as CorrectionType); setTaskLogId(""); setErrors({}); }}>
          {(Object.keys(CORRECTION_LABEL) as CorrectionType[]).map((k) => (
            <option key={k} value={k}>
              {CORRECTION_LABEL[k]}
            </option>
          ))}
        </Select>
      </div>
      {needsTask && (
        <div>
          <Label htmlFor="corr-task">Task record</Label>
          <Select id="corr-task" value={taskLogId || options[0]?.id || ""} onChange={(e) => setTaskLogId(e.target.value)} disabled={options.length === 0} aria-invalid={!!errors.task} aria-describedby={errors.task ? "corr-task-err" : undefined}>
            {options.length === 0 && <option value="">None available</option>}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
                {o.excusedReason ? ` (excused: ${o.excusedReason})` : ""} · {o.id}
              </option>
            ))}
          </Select>
          <FieldError id="corr-task-err">{errors.task}</FieldError>
        </div>
      )}
      {type === "excuse" && (
        <div>
          <Label htmlFor="corr-reason">Reason outside their control</Label>
          <TextInput id="corr-reason" placeholder="e.g. Sprayer breakdown, 2–4 Sep" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!errors.reason} aria-describedby={errors.reason ? "corr-reason-err" : undefined} />
          <FieldError id="corr-reason-err">{errors.reason}</FieldError>
        </div>
      )}
      {type === "yield" && (
        <div>
          <Label htmlFor="corr-yield" hint={`currently ${record.actualYieldQ ?? "not recorded"}`}>
            Harvest (quintals)
          </Label>
          <TextInput id="corr-yield" type="number" inputMode="decimal" min={0} value={yieldQ} onChange={(e) => setYieldQ(e.target.value)} aria-invalid={!!errors.yield} aria-describedby={errors.yield ? "corr-yield-err" : undefined} />
          <FieldError id="corr-yield-err">{errors.yield}</FieldError>
        </div>
      )}
      {type === "grade" && (
        <div>
          <Label htmlFor="corr-grade" hint={`currently ${record.qualityGrade ?? "not recorded"}`}>
            Quality grade
          </Label>
          <Select id="corr-grade" value={grade} onChange={(e) => setGrade(e.target.value as "A" | "B" | "C")}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </Select>
        </div>
      )}
      <div>
        <Label htmlFor="corr-note">{type === "annotate" ? "Note" : "Evidence / note"}</Label>
        <TextArea id="corr-note" className="min-h-16" placeholder="e.g. Repair log from the service centre confirms the sprayer was down" value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!errors.note} aria-describedby={errors.note ? "corr-note-err" : undefined} />
        <FieldError id="corr-note-err">{errors.note}</FieldError>
      </div>
      <Button type="submit" icon={PenLine}>
        Save correction
      </Button>
      <p className="text-xs text-ink-muted">The score is recomputed and a new version is added to the history. Earlier versions are never overwritten.</p>
    </form>
  );
}

export function ScorePanel({ initial }: { initial: { farmer?: string; crop?: string; season?: string } }) {
  const { state, user } = useReadyState();
  const crops = CROP_ORDER.filter((c) => state.cropSeasons.some((r) => r.crop === c));
  const [crop, setCrop] = useState<CropType>(crops.includes(initial.crop as CropType) ? (initial.crop as CropType) : crops[0]);
  const seasons = seasonsWithData(state, crop);
  const [seasonPick, setSeasonPick] = useState<Season | undefined>(initial.season as Season | undefined);
  const season = seasonPick && seasons.includes(seasonPick) ? seasonPick : seasons[0];
  const rows = season ? leaderboard(state, crop, season) : [];
  const [farmerPick, setFarmerPick] = useState<string | undefined>(initial.farmer);
  const selected = rows.find((r) => r.farmerId === farmerPick) ?? rows[0];
  const ranked = rows.filter((r) => r.rank != null);
  const unranked = rows.filter((r) => r.rank == null);
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? id;

  if (crops.length === 0) {
    return (
      <EmptyState icon={Trophy} title="No crop records yet">
        Rupee Scores appear once a season has task, harvest and cost records.
      </EmptyState>
    );
  }

  const history = selected ? scoreHistory(state, selected.farmerId, crop) : [];
  const seasonHistory = history.filter((h) => h.season === season);

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-ink">
        <strong className="text-ink-strong">Rupee Score</strong> is a 0–100 performance index for one farmer on one crop in one season, built from the records below. It is a demo
        methodology, not an amount of money, and it must never be used on its own to decide wages, discipline, hiring, lending or access to equipment. Farmers are only ever compared with
        others growing the same crop.
      </p>
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Label htmlFor="score-crop">Crop</Label>
          <Select id="score-crop" value={crop} onChange={(e) => { setCrop(e.target.value as CropType); setFarmerPick(undefined); setSeasonPick(undefined); }}>
            {crops.map((c) => (
              <option key={c} value={c}>
                {cropLabel(c)}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Label htmlFor="score-season">Season</Label>
          <Select id="score-season" value={season} onChange={(e) => { setSeasonPick(e.target.value as Season); setFarmerPick(undefined); }}>
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title={`${cropLabel(crop)} leaderboard, ${season}`} description="Same crop and season only. Select a farmer to see why." bodyClassName="p-0">
          {ranked.length === 1 && <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-sm text-ink"><Users aria-hidden className="size-4" />No peers to compare yet: only one farmer has enough data.</p>}
          <ol className="divide-y divide-line">
            {ranked.map((r) => (
              <li key={r.farmerId}>
                <button
                  type="button"
                  onClick={() => setFarmerPick(r.farmerId)}
                  aria-current={selected?.farmerId === r.farmerId ? "true" : undefined}
                  className={cx("flex w-full items-center gap-3 px-4 py-3 text-left", selected?.farmerId === r.farmerId ? "bg-forest-tint" : "hover:bg-sunken/60")}
                >
                  <span className="tabular w-7 text-lg font-semibold text-ink-muted">#{r.rank}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-strong">{name(r.farmerId)}</span>
                    <span className="block text-sm text-ink">
                      {state.fields.find((f) => f.id === r.record.fieldId)?.name} · {r.record.areaAcres} acres
                    </span>
                  </span>
                  <ScoreValue score={r.score?.score} />
                </button>
              </li>
            ))}
          </ol>
          {unranked.length > 0 && (
            <div className="border-t border-line px-4 py-3">
              <h3 className="text-sm font-semibold text-ink-muted">Not ranked: not enough data</h3>
              <ul className="mt-1 space-y-1">
                {unranked.map((r) => {
                  const missing = r.score?.components.filter((c) => c.value == null && (c.key === "timeliness" || c.key === "yield")).map((c) => c.detail) ?? ["No score computed yet"];
                  return (
                    <li key={r.farmerId}>
                      <button type="button" onClick={() => setFarmerPick(r.farmerId)} className={cx("w-full rounded-control px-2 py-1.5 text-left text-sm", selected?.farmerId === r.farmerId ? "bg-forest-tint" : "hover:bg-sunken/60")}>
                        <span className="font-semibold text-ink-strong">{name(r.farmerId)}</span> <span className="text-ink">· {missing.join("; ")}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {rows.length === 0 && (
            <div className="p-4">
              <EmptyState icon={Trophy} title="No records for this season" />
            </div>
          )}
        </Panel>

        {selected && (
          <div className="min-w-0 space-y-5">
            <Panel
              title={`${name(selected.farmerId)}: ${cropLabel(crop)}, ${season}`}
              description="Every component, its weight, and the records behind it."
              actions={<ScoreValue score={selected.score?.score} />}
            >
              {selected.score ? <Breakdown score={selected.score} /> : <p className="text-ink">No score computed yet.</p>}
              <p className="mt-3 rounded-control bg-gold-tint px-3 py-2 text-xs text-gold-ink">Demo data: synthetic records, demo methodology until formally validated.</p>
            </Panel>

            <Panel title="Score history" actions={<History aria-hidden className="size-5 text-ink-muted" />}>
              {history.length > 0 && <ScoreHistoryChart history={history} />}
              <h3 className="mt-4 text-sm font-semibold">Changes this season</h3>
              <ol className="mt-2 space-y-2">
                {[...seasonHistory].reverse().map((h, i, arr) => {
                  const prev = arr[i + 1];
                  const delta = h.score != null && prev?.score != null ? h.score - prev.score : null;
                  return (
                    <li key={h.id} className="rounded-control border border-line px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <time dateTime={h.at} className="font-semibold text-ink-strong">{fmtDay(h.at)}</time>
                        <ScoreValue score={h.score} />
                        {delta != null && delta !== 0 && <Chip tone={delta > 0 ? "sage" : "terracotta"}>{delta > 0 ? `+${delta}` : delta}</Chip>}
                        {delta === 0 && <Chip tone="neutral">No change</Chip>}
                      </div>
                      <p className="mt-0.5 text-sm text-ink">{h.reason}</p>
                    </li>
                  );
                })}
              </ol>
            </Panel>

            <Panel title="Correct or annotate the record" description="Owners can fix records and note disputed outcomes. Context outside the farmer's control should not count against them.">
              <CorrectionForm key={`${selected.record.id}-${user.id}`} record={selected.record} state={state} />
              {selected.record.annotations.length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-semibold">Notes on this record</h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {[...selected.record.annotations].reverse().map((a) => (
                      <li key={`${a.at}-${a.text}`} className="text-ink">
                        <span className="font-semibold text-ink-strong">{fmtDay(a.at)}</span> · {name(a.by)}: {a.text}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
