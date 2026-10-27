/**
 * Owner analytics derived from shared records. Every rupee figure here is an
 * estimate from synthetic demo records and is labelled as such in the UI.
 */
import type { CropType, Season, UrvaraState } from "@/types";
import { CROPS, PLAN_YIELD_Q_PER_ACRE } from "@/data/crops";
import { istDate } from "@/lib/time";
import { isOverdue } from "./scheduler";
import { latestRiskByField } from "./risk";

export const CURRENT_SEASON: Season = "Rabi 2026-27";
export const COMPLETED_SEASONS: Season[] = ["Kharif 2026", "Rabi 2025-26", "Kharif 2025"];

export function standingValueINR(state: UrvaraState, fieldId: string): number {
  const field = state.fields.find((f) => f.id === fieldId);
  if (!field) return 0;
  return Math.round(field.areaAcres * PLAN_YIELD_Q_PER_ACRE[field.crop] * CROPS[field.crop].pricePerQINR);
}

export interface FarmSummary {
  farmId: string;
  fieldCount: number;
  crops: CropType[];
  areaAcres: number;
  tasksToday: number;
  doneToday: number;
  openTasks: number;
  overdue: number;
  attention: number;
  risk: "high" | "medium" | "low" | "none";
  standingValueINR: number;
  lastSeasonYieldPct: number | null;
  lastSeasonInputCostINR: number | null;
}

export function farmSummary(state: UrvaraState, farmId: string): FarmSummary {
  const fields = state.fields.filter((f) => f.farmId === farmId);
  const tasks = state.tasks.filter((t) => t.farmId === farmId && t.status !== "cancelled" && t.status !== "suggested");
  const today = istDate(state.now);
  const todays = tasks.filter((t) => istDate(t.start) === today);
  const risks = latestRiskByField(state);
  const riskLevels = fields.map((f) => risks.get(f.id)?.category).filter(Boolean);
  const records = state.cropSeasons.filter((r) => r.farmId === farmId && r.season === "Kharif 2026" && r.actualYieldQ != null && r.expectedYieldQ);
  const expected = records.reduce((s, r) => s + (r.expectedYieldQ ?? 0), 0);
  const actual = records.reduce((s, r) => s + (r.actualYieldQ ?? 0), 0);
  return {
    farmId,
    fieldCount: fields.length,
    crops: [...new Set(fields.map((f) => f.crop))],
    areaAcres: fields.reduce((s, f) => s + f.areaAcres, 0),
    tasksToday: todays.length,
    doneToday: todays.filter((t) => t.status === "done").length,
    openTasks: tasks.filter((t) => t.status === "scheduled" || t.status === "in_progress" || t.status === "blocked").length,
    overdue: tasks.filter((t) => isOverdue(t, state.now)).length,
    attention: tasks.filter((t) => t.needsAttention || t.status === "blocked").length,
    risk: riskLevels.includes("high") ? "high" : riskLevels.includes("medium") ? "medium" : riskLevels.length ? "low" : "none",
    standingValueINR: fields.reduce((s, f) => s + standingValueINR(state, f.id), 0),
    lastSeasonYieldPct: expected ? Math.round((actual / expected) * 100) : null,
    lastSeasonInputCostINR: records.length ? records.reduce((s, r) => s + (r.inputCostINR ?? 0), 0) : null,
  };
}

export interface CropComparisonRow {
  crop: CropType;
  areaAcres: number;
  expectedQ: number;
  actualQ: number;
  yieldPct: number;
  yieldPerAcre: number;
  valueINR: number;
  inputCostINR: number;
  records: number;
}

export function cropComparison(state: UrvaraState, season: Season): CropComparisonRow[] {
  const byCrop = new Map<CropType, CropComparisonRow>();
  for (const r of state.cropSeasons.filter((x) => x.season === season && x.actualYieldQ != null && x.expectedYieldQ)) {
    const row = byCrop.get(r.crop) ?? { crop: r.crop, areaAcres: 0, expectedQ: 0, actualQ: 0, yieldPct: 0, yieldPerAcre: 0, valueINR: 0, inputCostINR: 0, records: 0 };
    row.areaAcres += r.areaAcres;
    row.expectedQ += r.expectedYieldQ!;
    row.actualQ += r.actualYieldQ!;
    row.valueINR += r.actualYieldQ! * (r.pricePerQINR ?? CROPS[r.crop].pricePerQINR);
    row.inputCostINR += r.inputCostINR ?? 0;
    row.records += 1;
    byCrop.set(r.crop, row);
  }
  return [...byCrop.values()].map((row) => ({
    ...row,
    yieldPct: Math.round((row.actualQ / row.expectedQ) * 100),
    yieldPerAcre: Math.round((row.actualQ / row.areaAcres) * 10) / 10,
  }));
}

export function seasonTotals(state: UrvaraState, season: Season) {
  const rows = cropComparison(state, season);
  return {
    valueINR: rows.reduce((s, r) => s + r.valueINR, 0),
    inputCostINR: rows.reduce((s, r) => s + r.inputCostINR, 0),
    yieldPct: rows.length ? Math.round((rows.reduce((s, r) => s + r.actualQ, 0) / rows.reduce((s, r) => s + r.expectedQ, 0)) * 100) : null,
  };
}

export function formatINR(value: number, compact = false): string {
  if (compact) {
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
    if (value >= 1e3) return `₹${(value / 1e3).toFixed(0)}k`;
  }
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
