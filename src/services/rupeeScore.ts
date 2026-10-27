/**
 * Rupee Score: a crop-specific 0–100 performance index (demo methodology).
 * It is not a money amount, and every component shows the records behind it.
 */
import type { CropSeasonRecord, CropType, RupeeScoreRecord, ScoreComponent, Season, UrvaraState } from "@/types";
import { CROPS } from "@/data/crops";
import { nextId } from "@/lib/ids";
import { ms } from "@/lib/time";
import { withAudit } from "./audit";

export const MIN_COUNTED_TASKS = 4;

export const SCORE_WEIGHTS = {
  timeliness: 30,
  yield: 25,
  quality: 15,
  health: 15,
  efficiency: 15,
} as const;

const GRADE_VALUE = { A: 100, B: 75, C: 50 } as const;

export function scoreComponents(record: CropSeasonRecord): ScoreComponent[] {
  const counted = record.taskLog.filter((t) => t.verified && !t.excusedReason);
  const excused = record.taskLog.filter((t) => t.verified && t.excusedReason);
  const onTime = counted.filter((t) => t.onTime).length;
  const unverified = record.taskLog.length - counted.length - excused.length;
  const timeliness: ScoreComponent = {
    key: "timeliness",
    label: "Task timeliness",
    weight: SCORE_WEIGHTS.timeliness,
    value: counted.length >= MIN_COUNTED_TASKS ? Math.round((onTime / counted.length) * 100) : null,
    detail:
      counted.length >= MIN_COUNTED_TASKS
        ? `${onTime} of ${counted.length} verified tasks on time` +
          (excused.length ? `; ${excused.length} excused (outside the farmer's control)` : "") +
          (unverified ? `; ${unverified} not yet verified, not counted` : "")
        : `Only ${counted.length} verified task${counted.length === 1 ? "" : "s"}; at least ${MIN_COUNTED_TASKS} needed`,
    detailHi:
      counted.length >= MIN_COUNTED_TASKS
        ? `${counted.length} जांचे गए कामों में से ${onTime} समय पर` + (excused.length ? `; ${excused.length} माफ़ (आपके बस से बाहर)` : "")
        : `सिर्फ ${counted.length} जांचे गए काम; कम से कम ${MIN_COUNTED_TASKS} चाहिए`,
    sources: record.taskLog.map((t) => t.id),
  };

  const hasYield = record.expectedYieldQ != null && record.actualYieldQ != null && record.expectedYieldQ > 0;
  const ratio = hasYield ? record.actualYieldQ! / record.expectedYieldQ! : 0;
  const yieldC: ScoreComponent = {
    key: "yield",
    label: "Yield vs expected",
    weight: SCORE_WEIGHTS.yield,
    value: hasYield ? Math.min(100, Math.round((ratio / 1.1) * 100)) : null,
    detail: hasYield
      ? `${record.actualYieldQ} q harvested vs ${record.expectedYieldQ} q expected (${Math.round(ratio * 100)}%)`
      : "Harvest not recorded yet",
    detailHi: hasYield ? `${record.actualYieldQ} क्विंटल उपज, अपेक्षा ${record.expectedYieldQ} क्विंटल (${Math.round(ratio * 100)}%)` : "कटाई अभी दर्ज नहीं हुई",
    sources: hasYield ? [`${record.id}:yield`] : [],
  };

  const quality: ScoreComponent = {
    key: "quality",
    label: "Harvest quality",
    weight: SCORE_WEIGHTS.quality,
    value: record.qualityGrade ? GRADE_VALUE[record.qualityGrade] : null,
    detail: record.qualityGrade ? `Grade ${record.qualityGrade} at the mandi / buyer check` : "No quality grade recorded",
    detailHi: record.qualityGrade ? `मंडी / खरीदार जांच में ग्रेड ${record.qualityGrade}` : "गुणवत्ता ग्रेड दर्ज नहीं",
    sources: record.qualityGrade ? [`${record.id}:grade`] : [],
  };

  const incidentValues = record.incidents.map((i) => Math.max(0, (i.resolved ? 100 : 40) - (i.reportedWithinHours > 24 ? 20 : 0)));
  const health: ScoreComponent = {
    key: "health",
    label: "Crop-health handling",
    weight: SCORE_WEIGHTS.health,
    value: incidentValues.length ? Math.round(incidentValues.reduce((s, v) => s + v, 0) / incidentValues.length) : 100,
    detail: record.incidents.length
      ? `${record.incidents.filter((i) => i.resolved).length} of ${record.incidents.length} incidents resolved; ` +
        `${record.incidents.filter((i) => i.reportedWithinHours <= 24).length} reported within 24 h`
      : "No crop-health incidents recorded this season",
    detailHi: record.incidents.length
      ? `${record.incidents.length} में से ${record.incidents.filter((i) => i.resolved).length} समस्याएं सुलझीं; ${record.incidents.filter((i) => i.reportedWithinHours <= 24).length} की खबर 24 घंटे में दी`
      : "इस मौसम में फसल की कोई समस्या दर्ज नहीं",
    sources: record.incidents.map((i) => i.id),
  };

  const hasCost = record.inputCostINR != null && record.actualYieldQ != null && record.actualYieldQ > 0;
  const costPerQ = hasCost ? record.inputCostINR! / record.actualYieldQ! : 0;
  const benchmark = CROPS[record.crop].benchmarkCostPerQINR;
  const efficiency: ScoreComponent = {
    key: "efficiency",
    label: "Input efficiency",
    weight: SCORE_WEIGHTS.efficiency,
    value: hasCost ? Math.min(100, Math.round((benchmark / costPerQ) * 85)) : null,
    detail: hasCost
      ? `₹${Math.round(costPerQ).toLocaleString("en-IN")} input cost per quintal vs ₹${benchmark.toLocaleString("en-IN")} benchmark`
      : "Input costs or harvest not recorded",
    detailHi: hasCost ? `प्रति क्विंटल लागत ₹${Math.round(costPerQ).toLocaleString("en-IN")}, मानक ₹${benchmark.toLocaleString("en-IN")}` : "लागत या कटाई दर्ज नहीं",
    sources: hasCost ? [`${record.id}:costs`] : [],
  };

  return [timeliness, yieldC, quality, health, efficiency];
}

/** Weighted score over components with data; null unless timeliness and yield both exist. */
export function computeScore(components: ScoreComponent[]): number | null {
  const byKey = Object.fromEntries(components.map((c) => [c.key, c]));
  if (byKey.timeliness?.value == null || byKey.yield?.value == null) return null;
  const present = components.filter((c) => c.value != null);
  const weight = present.reduce((s, c) => s + c.weight, 0);
  return Math.round(present.reduce((s, c) => s + c.value! * c.weight, 0) / weight);
}

export function buildScoreRecord(
  state: Pick<UrvaraState, "rupeeScoreRecords">,
  record: CropSeasonRecord,
  at: string,
  reason: string,
): RupeeScoreRecord {
  const components = scoreComponents(record);
  return {
    id: nextId("rs", state.rupeeScoreRecords),
    farmerId: record.farmerId,
    crop: record.crop,
    season: record.season,
    score: computeScore(components),
    components,
    at,
    reason,
  };
}

export function scoreHistory(state: UrvaraState, farmerId: string, crop: CropType, season?: Season): RupeeScoreRecord[] {
  return state.rupeeScoreRecords
    .filter((r) => r.farmerId === farmerId && r.crop === crop && (!season || r.season === season))
    .sort((a, b) => ms(a.at) - ms(b.at) || a.id.localeCompare(b.id));
}

export function latestScore(state: UrvaraState, farmerId: string, crop: CropType, season: Season): RupeeScoreRecord | undefined {
  const history = scoreHistory(state, farmerId, crop, season);
  return history[history.length - 1];
}

export interface LeaderboardRow {
  rank: number | null;
  farmerId: string;
  record: CropSeasonRecord;
  score: RupeeScoreRecord | undefined;
}

/** Same crop, same season only. Rows without enough data are listed but not ranked. */
export function leaderboard(state: UrvaraState, crop: CropType, season: Season): LeaderboardRow[] {
  const rows = state.cropSeasons
    .filter((r) => r.crop === crop && r.season === season)
    .map((record) => ({ farmerId: record.farmerId, record, score: latestScore(state, record.farmerId, crop, season), rank: null as number | null }));
  const ranked = rows.filter((r) => r.score?.score != null).sort((a, b) => b.score!.score! - a.score!.score!);
  ranked.forEach((r, i) => (r.rank = i + 1));
  return [...ranked, ...rows.filter((r) => r.score?.score == null)];
}

export function seasonsWithData(state: UrvaraState, crop: CropType): Season[] {
  return [...new Set(state.cropSeasons.filter((r) => r.crop === crop).map((r) => r.season))];
}

export type ScoreCorrection =
  | { type: "excuse"; taskLogId: string; reason: string }
  | { type: "unexcuse"; taskLogId: string }
  | { type: "verify"; taskLogId: string }
  | { type: "yield"; actualYieldQ: number }
  | { type: "grade"; grade: "A" | "B" | "C" }
  | { type: "annotate"; text: string };

/**
 * Apply an owner correction to the underlying record, recompute, and append a
 * new score version with the reason. History is never overwritten.
 */
export function correctRecord(
  state: UrvaraState,
  cropSeasonId: string,
  correction: ScoreCorrection,
  note: string,
  actorId: string,
): UrvaraState {
  const record = state.cropSeasons.find((r) => r.id === cropSeasonId);
  if (!record) return state;
  let updated: CropSeasonRecord = record;
  let what: string;
  switch (correction.type) {
    case "excuse": {
      const entry = record.taskLog.find((t) => t.id === correction.taskLogId);
      updated = { ...record, taskLog: record.taskLog.map((t) => (t.id === correction.taskLogId ? { ...t, excusedReason: correction.reason } : t)) };
      what = `Marked "${entry?.label}" as excused (${correction.reason})`;
      break;
    }
    case "unexcuse": {
      const entry = record.taskLog.find((t) => t.id === correction.taskLogId);
      updated = { ...record, taskLog: record.taskLog.map((t) => (t.id === correction.taskLogId ? { ...t, excusedReason: undefined } : t)) };
      what = `Removed the excuse on "${entry?.label}"`;
      break;
    }
    case "verify": {
      const entry = record.taskLog.find((t) => t.id === correction.taskLogId);
      updated = { ...record, taskLog: record.taskLog.map((t) => (t.id === correction.taskLogId ? { ...t, verified: true } : t)) };
      what = `Verified "${entry?.label}"`;
      break;
    }
    case "yield":
      updated = { ...record, actualYieldQ: correction.actualYieldQ };
      what = `Corrected harvest from ${record.actualYieldQ ?? "none"} q to ${correction.actualYieldQ} q`;
      break;
    case "grade":
      updated = { ...record, qualityGrade: correction.grade };
      what = `Corrected quality grade from ${record.qualityGrade ?? "none"} to ${correction.grade}`;
      break;
    case "annotate":
      updated = record;
      what = "Added a note";
      break;
  }
  const annotationText = [what, note].filter(Boolean).join(". ");
  updated = { ...updated, annotations: [...updated.annotations, { at: state.now, by: actorId, text: correction.type === "annotate" ? correction.text : annotationText }] };
  const cropSeasons = state.cropSeasons.map((r) => (r.id === cropSeasonId ? updated : r));
  const scoreRecord = buildScoreRecord(state, updated, state.now, note ? `${what}. ${note}` : what);
  const next = { ...state, cropSeasons, rupeeScoreRecords: [...state.rupeeScoreRecords, scoreRecord] };
  const prev = latestScore(state, record.farmerId, record.crop, record.season)?.score;
  return withAudit(
    next,
    actorId,
    "rupee_score.corrected",
    cropSeasonId,
    `${what}. Score ${prev ?? "n/a"} → ${scoreRecord.score ?? "n/a"}.`,
  );
}
