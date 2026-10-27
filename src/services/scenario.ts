/**
 * Demo incidents. Each one changes real application state through the same
 * domain services an actual event would use; nothing here is a canned toast.
 */
import type { UrvaraState } from "@/types";
import { STORM_ZONES, stormBlocks } from "@/data/seed";
import { addHours } from "@/lib/time";
import { withAudit } from "./audit";
import { addProposal, proposeWeatherReplan } from "./replanner";
import { setMachineStatus } from "./resources";

export const DEMO_BREAKDOWN_MACHINE = "res-m01";

export function simulateWeatherChange(state: UrvaraState, actorId: string): { state: UrvaraState; proposalId?: string } {
  if (state.scenario.weatherChanged) return { state };
  const issuedAt = addHours(state.now, 0);
  const weather = state.weather.map((w) =>
    STORM_ZONES.includes(w.zone)
      ? { ...w, blocks: stormBlocks(w.zone), issuedAt, provider: "Seeded demo forecast (update)", source: "seeded" as const }
      : w,
  );
  let next: UrvaraState = { ...state, weather, scenario: { ...state.scenario, weatherChanged: true } };
  next = withAudit(next, actorId, "weather.updated", "wx-dindori,wx-niphad", "Forecast update: thunderstorms Thu afternoon to Fri morning over Dindori and Niphad (up to 16 mm, gusts 26 km/h)");
  const proposal = proposeWeatherReplan(next);
  if (!proposal) return { state: next };
  next = withAudit(addProposal(next, proposal), "system", "proposal.created", proposal.id, proposal.summary);
  return { state: next, proposalId: proposal.id };
}

export function simulateMachineBreakdown(state: UrvaraState, actorId: string, machineId = DEMO_BREAKDOWN_MACHINE) {
  return setMachineStatus(state, machineId, "broken", actorId, "Pump seal failure reported by operator; repair estimate 4 days");
}
