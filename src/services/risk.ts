/**
 * Explainable crop-risk scoring for scouting. This is a heuristic triage aid:
 * it never confirms a disease, it only says where to look first and why.
 */
import type { Report, ScoutingSuggestion, UrvaraState } from "@/types";
import { CROPS, cropLabel } from "@/data/crops";
import { distanceKm } from "@/lib/geo";
import { addHours, hoursBetween, ms } from "@/lib/time";
import { nextId } from "@/lib/ids";
import { blocksOverlapping } from "./scheduler";
import { withAudit } from "./audit";

export const RISK_THRESHOLDS = { high: 60, medium: 35 } as const;

export interface RiskFactorBreakdown {
  susceptibility: number;
  proximity: number;
  climate: number;
  confidence: number;
  similarBonus: number;
}

export function riskCategory(score: number): ScoutingSuggestion["category"] {
  if (score >= RISK_THRESHOLDS.high) return "high";
  if (score >= RISK_THRESHOLDS.medium) return "medium";
  return "low";
}

/** Score every other field against one crop-health report. */
export function assessReport(state: UrvaraState, report: Report): Omit<ScoutingSuggestion, "id">[] {
  if (report.kind !== "problem") return [];
  const origin = state.farms.find((f) => f.id === report.farmId);
  if (!origin) return [];
  const family = CROPS[report.crop].family;

  return state.fields
    .filter((field) => field.id !== report.fieldId && field.id !== "fld-01")
    .map((field) => {
      const farm = state.farms.find((f) => f.id === field.farmId)!;
      const km = distanceKm(origin, farm);
      const reasons: string[] = [];

      let susceptibility = 0.15;
      if (field.crop === report.crop) {
        susceptibility = 1;
        reasons.push(`Same crop (${cropLabel(field.crop)})`);
      } else if (CROPS[field.crop].family === family) {
        susceptibility = 0.55;
        reasons.push(`${cropLabel(field.crop)} is in the same plant family as ${cropLabel(report.crop)}`);
      }

      let proximity = 0.1;
      if (km <= 5) proximity = 1;
      else if (km <= 10) proximity = 0.7;
      else if (km <= 20) proximity = 0.4;
      reasons.push(km < 0.5 ? "Same farm" : `${km.toFixed(1)} km from the reported field`);

      const snapshot = state.weather.find((w) => w.zone === farm.weatherZone);
      const next48 = blocksOverlapping(snapshot, state.now, addHours(state.now, 48));
      const avgHumidity = next48.length ? next48.reduce((s, b) => s + b.humidity, 0) / next48.length : 60;
      const wetSpell = next48.some((b) => b.rainProb >= 60);
      let climate = avgHumidity >= 80 ? 1 : avgHumidity >= 70 ? 0.75 : 0.45;
      if (wetSpell) climate = Math.max(climate, 0.9);
      reasons.push(
        wetSpell
          ? `Rain forecast in the next 48 h (humidity ~${Math.round(avgHumidity)}%) favours leaf disease`
          : `Humidity ~${Math.round(avgHumidity)}% over the next 48 h`,
      );

      const similar = state.reports.filter(
        (r) =>
          r.id !== report.id &&
          r.kind === "problem" &&
          r.status !== "dismissed" &&
          CROPS[r.crop].family === family &&
          hoursBetween(r.createdAt, report.createdAt) <= 24 * 7 &&
          hoursBetween(r.createdAt, report.createdAt) >= -24 * 7 &&
          distanceKm(state.farms.find((f) => f.id === r.farmId)!, farm) <= 20,
      ).length;
      const similarBonus = Math.min(20, similar * 10);
      if (similar) reasons.push(`${similar} similar report${similar > 1 ? "s" : ""} nearby this week`);

      const confidence = report.status === "reviewed" ? 1 : 0.85;
      const score = Math.min(100, Math.round(100 * susceptibility * (0.6 * proximity + 0.4 * climate) * confidence + similarBonus));

      return {
        sourceReportId: report.id,
        farmId: field.farmId,
        fieldId: field.id,
        score,
        category: riskCategory(score),
        reasons,
        createdAt: state.now,
        status: "suggested" as const,
        alertedAt: riskCategory(score) === "high" ? state.now : undefined,
      };
    })
    .filter((s) => s.score >= 20)
    .sort((a, b) => b.score - a.score);
}

export function addSuggestionsForReport(state: UrvaraState, report: Report): UrvaraState {
  const assessed = assessReport(state, report);
  const suggestions = [...state.scoutingSuggestions];
  for (const s of assessed) suggestions.push({ ...s, id: nextId("sct", suggestions) });
  const reports = state.reports.map((r) => (r.id === report.id ? { ...r, riskAssessedAt: state.now } : r));
  const high = assessed.filter((s) => s.category === "high").length;
  return withAudit(
    { ...state, scoutingSuggestions: suggestions, reports },
    "system",
    "risk.assessed",
    report.id,
    assessed.length
      ? `Risk check on ${report.id}: ${assessed.length} nearby field(s) scored, ${high} high. Report stays unverified until inspected.`
      : `Risk check on ${report.id}: no nearby field above the scouting threshold.`,
  );
}

/**
 * The crop-risk module runs on the owner side (it needs every farm's data),
 * picking up any problem report that has not been scored yet.
 */
export function assessUnscoredReports(state: UrvaraState): UrvaraState {
  let next = state;
  for (const report of state.reports) {
    if (report.kind === "problem" && !report.riskAssessedAt && report.status !== "dismissed") {
      next = addSuggestionsForReport(next, report);
    }
  }
  return next;
}

/** Most recent suggestion per field, for map and overview summaries. */
export function latestRiskByField(state: UrvaraState): Map<string, ScoutingSuggestion> {
  const map = new Map<string, ScoutingSuggestion>();
  for (const s of state.scoutingSuggestions) {
    if (s.status === "dismissed") continue;
    const prev = map.get(s.fieldId);
    if (!prev || ms(s.createdAt) > ms(prev.createdAt) || (s.createdAt === prev.createdAt && s.score > prev.score)) map.set(s.fieldId, s);
  }
  return map;
}
