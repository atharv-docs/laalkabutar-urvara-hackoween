"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { RiskChip } from "@/components/ui/domain";
import { FarmMap, type MapRisk } from "@/components/owner/FarmMap";
import { STAGE_LABEL, cropLabel } from "@/data/crops";
import { farmSummary, formatINR } from "@/services/analytics";
import { latestRiskByField } from "@/services/risk";
import { latestReading, MOISTURE_LOW } from "@/services/soil";

export default function FarmsPage() {
  const { state } = useReadyState();
  const risk = latestRiskByField(state);
  const mapRisks: MapRisk[] = state.farms.flatMap((farm) => {
    const best = state.fields
      .filter((f) => f.farmId === farm.id)
      .map((f) => risk.get(f.id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .sort((a, b) => b.score - a.score)[0];
    return best ? [{ farmId: farm.id, category: best.category, score: best.score }] : [];
  });

  return (
    <>
      <PageHeader title="Farms & Fields" description="Every farm you manage, its fields, crops, stages and who works them." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel title="Where the farms are" description="Coloured by the highest open scouting risk on any field.">
          <FarmMap farms={state.farms} risks={mapRisks} />
        </Panel>
        <div className="space-y-4">
          {state.farms.map((farm) => {
            const s = farmSummary(state, farm.id);
            const fields = state.fields.filter((f) => f.farmId === farm.id);
            const people = state.users.filter((u) => u.role === "farmer" && u.status !== "deactivated" && u.farmIds.includes(farm.id));
            return (
              <section key={farm.id} aria-labelledby={`farm-${farm.id}`} className="rounded-panel border border-line bg-surface shadow-panel">
                <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3">
                  <h2 id={`farm-${farm.id}`} className="text-base font-semibold">
                    <Link href={`/owner/farms/${farm.id}`} className="hover:underline">
                      {farm.name}
                    </Link>
                  </h2>
                  <span className="text-sm text-ink-muted">
                    {farm.village}, {farm.district} · {s.areaAcres} ac
                  </span>
                  <RiskChip category={s.risk} />
                  <Link href={`/owner/farms/${farm.id}`} className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
                    Open <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </header>
                <ul className="divide-y divide-line/70">
                  {fields.map((f) => {
                    const m = latestReading(state, f.id, "moisture");
                    return (
                      <li key={f.id} className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-2 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                        <span className="min-w-0">
                          <span className="font-semibold text-ink-strong">{f.name}</span>
                          <span className="block text-ink-muted">
                            {cropLabel(f.crop)} · {STAGE_LABEL[f.stage].en} · {f.areaAcres} ac
                          </span>
                        </span>
                        <span className="hidden text-ink sm:block">
                          {state.users
                            .filter((u) => u.role === "farmer" && u.fieldIds.includes(f.id))
                            .map((u) => u.name)
                            .join(", ") || <span className="text-terracotta-ink">No farmer assigned</span>}
                        </span>
                        <span className="tabular text-right">
                          {m ? (
                            <span className={m.value < MOISTURE_LOW ? "font-semibold text-terracotta-ink" : "text-ink"}>
                              {m.value}% moisture{m.value < MOISTURE_LOW ? ", dry" : ""}
                            </span>
                          ) : (
                            <span className="text-ink-muted">No probe</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <footer className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-4 py-2 text-sm text-ink">
                  <span className="inline-flex items-center gap-1.5">
                    <Users aria-hidden className="size-4 text-ink-muted" />
                    {people.length} farmer{people.length === 1 ? "" : "s"}
                  </span>
                  <span className="tabular">{s.openTasks} open tasks{s.overdue ? `, ${s.overdue} overdue` : ""}</span>
                  <span className="tabular">Standing value ≈ {formatINR(s.standingValueINR, true)} (demo estimate)</span>
                </footer>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
