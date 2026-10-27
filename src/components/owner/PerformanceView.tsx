"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3 } from "lucide-react";
import type { Season } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Chip, EmptyState, PageHeader, Panel, Segmented, Stat } from "@/components/ui/primitives";
import { cropLabel } from "@/data/crops";
import { COMPLETED_SEASONS, cropComparison, farmSummary, formatINR, seasonTotals } from "@/services/analytics";
import { YieldChart } from "./PerformanceCharts";
import { ScorePanel } from "./ScorePanel";

export function PerformanceView() {
  const { state } = useReadyState();
  const params = useSearchParams();
  const [season, setSeason] = useState<Season>("Kharif 2026");
  const rows = cropComparison(state, season).sort((a, b) => b.valueINR - a.valueINR);
  const totals = seasonTotals(state, season);
  const farms = state.farms.map((f) => ({ farm: f, summary: farmSummary(state, f.id) }));

  return (
    <>
      <PageHeader
        title="Performance & Rupee Score"
        description="How each crop and farm performed against expectations, and each farmer's crop-specific record."
      />

      <Panel
        title="Business performance"
        description="Rupee figures are estimates from synthetic demo records (harvest × recorded price), not accounts."
        actions={<Segmented<Season> label="Season" value={season} onChange={setSeason} options={COMPLETED_SEASONS.map((s) => ({ value: s, label: s }))} />}
      >
        {rows.length === 0 ? (
          <EmptyState icon={BarChart3} title={`No completed harvests recorded for ${season}`}>
            Crop comparisons appear once harvest quantities are recorded for the season.
          </EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 border-b border-line pb-4 md:grid-cols-4">
              <Stat label="Harvest vs expected" value={totals.yieldPct != null ? `${totals.yieldPct}%` : "—"} context="all crops, by quintals" tone="gold" />
              <Stat label="Est. crop value" value={formatINR(totals.valueINR, true)} context="estimate, demo records" />
              <Stat label="Input cost recorded" value={formatINR(totals.inputCostINR, true)} context="seed, fertiliser, sprays, labour" />
              <Stat label="Value per ₹1 input" value={totals.inputCostINR ? `₹${(totals.valueINR / totals.inputCostINR).toFixed(2)}` : "—"} context="higher is better" />
            </div>
            <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <YieldChart rows={rows} />
              <div className="min-w-0 overflow-x-auto">
                <table className="tabular w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-line text-ink-muted">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-semibold">Crop</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Area (acres)</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Expected (q)</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Actual (q)</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Yield</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">q / acre</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Est. value</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Input cost</th>
                      <th scope="col" className="py-2 text-right font-semibold">Value / ₹ input</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                      <tr key={r.crop}>
                        <th scope="row" className="py-2 pr-3 font-semibold text-ink-strong">
                          {cropLabel(r.crop)}
                          <span className="block text-xs font-normal text-ink-muted">{r.records} record{r.records === 1 ? "" : "s"}</span>
                        </th>
                        <td className="py-2 pr-3 text-right">{r.areaAcres}</td>
                        <td className="py-2 pr-3 text-right">{r.expectedQ.toLocaleString("en-IN")}</td>
                        <td className="py-2 pr-3 text-right text-ink-strong">{r.actualQ.toLocaleString("en-IN")}</td>
                        <td className="py-2 pr-3 text-right">
                          <Chip tone={r.yieldPct >= 100 ? "sage" : r.yieldPct >= 90 ? "gold" : "terracotta"}>{r.yieldPct}%</Chip>
                        </td>
                        <td className="py-2 pr-3 text-right">{r.yieldPerAcre}</td>
                        <td className="py-2 pr-3 text-right text-ink-strong">{formatINR(r.valueINR, true)}</td>
                        <td className="py-2 pr-3 text-right">{formatINR(r.inputCostINR, true)}</td>
                        <td className="py-2 text-right">{r.inputCostINR ? `₹${(r.valueINR / r.inputCostINR).toFixed(2)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </Panel>

      <Panel className="mt-5" title="Farm comparison" description="Kharif 2026 harvest against expectation, and the estimated value of crops now standing (estimate from demo records)." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="tabular w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Farm</th>
                <th scope="col" className="px-3 py-2 font-semibold">Crops now</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Area (acres)</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Kharif 2026 yield</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Kharif 2026 input cost</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Standing crop value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {farms.map(({ farm, summary }) => (
                <tr key={farm.id}>
                  <th scope="row" className="px-4 py-2 font-semibold text-ink-strong">
                    {farm.name}
                    <span className="block text-xs font-normal text-ink-muted">{farm.village}</span>
                  </th>
                  <td className="px-3 py-2">{summary.crops.map((c) => cropLabel(c)).join(", ")}</td>
                  <td className="px-3 py-2 text-right">{summary.areaAcres}</td>
                  <td className="px-3 py-2 text-right">
                    {summary.lastSeasonYieldPct == null ? <span className="text-ink-muted">No harvest recorded</span> : <Chip tone={summary.lastSeasonYieldPct >= 100 ? "sage" : summary.lastSeasonYieldPct >= 90 ? "gold" : "terracotta"}>{summary.lastSeasonYieldPct}% of expected</Chip>}
                  </td>
                  <td className="px-3 py-2 text-right">{summary.lastSeasonInputCostINR == null ? "—" : formatINR(summary.lastSeasonInputCostINR, true)}</td>
                  <td className="px-4 py-2 text-right text-ink-strong">{formatINR(summary.standingValueINR, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <section className="mt-8" aria-labelledby="rupee-score-heading">
        <h2 id="rupee-score-heading" className="mb-3 text-xl font-semibold">
          Rupee Score
        </h2>
        <ScorePanel initial={{ farmer: params.get("farmer") ?? undefined, crop: params.get("crop") ?? undefined, season: params.get("season") ?? undefined }} />
      </section>
    </>
  );
}
