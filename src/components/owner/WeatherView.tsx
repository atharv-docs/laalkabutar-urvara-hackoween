"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, CloudRain, Droplets, Eye, Thermometer, Wind } from "lucide-react";
import type { SensorKind } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Chip, EmptyState, Label, PageHeader, Panel, Segmented, Select, cx } from "@/components/ui/primitives";
import { Provenance } from "@/components/ui/domain";
import { cropLabel, STAGE_LABEL } from "@/data/crops";
import { fmtDay, fmtDayTime, fmtTime } from "@/lib/time";
import { EC_HIGH, fieldInsights, latestReading, MOISTURE_HIGH, MOISTURE_LOW, readingsFor, SENSOR_META } from "@/services/soil";
import { MoistureChart } from "./MoistureChart";

const KINDS: SensorKind[] = ["moisture", "ph", "nitrogen", "phosphorus", "potassium", "ec"];
const STALE_HOURS: Record<SensorKind, number> = { moisture: 6, ph: 45 * 24, nitrogen: 45 * 24, phosphorus: 45 * 24, potassium: 45 * 24, ec: 45 * 24 };

const INSIGHT = {
  action: { icon: AlertTriangle, tone: "terracotta" as const, label: "Action" },
  watch: { icon: Eye, tone: "gold" as const, label: "Watch" },
  ok: { icon: CheckCircle2, tone: "sage" as const, label: "OK" },
};

function moistureLabel(v: number) {
  if (v < MOISTURE_LOW) return { text: "Dry", tone: "terracotta" as const };
  if (v > MOISTURE_HIGH) return { text: "Wet", tone: "gold" as const };
  return { text: "OK", tone: "sage" as const };
}

export function WeatherView() {
  const { state } = useReadyState();
  const [zone, setZone] = useState(state.weather[0]?.zone ?? "");
  const [fieldId, setFieldId] = useState(state.fields[0]?.id ?? "");
  const snapshot = state.weather.find((w) => w.zone === zone);
  const field = state.fields.find((f) => f.id === fieldId);
  const farm = state.farms.find((f) => f.id === field?.farmId);

  return (
    <>
      <PageHeader
        title="Weather & Sensors"
        description="Forecasts per weather zone, local station readings, and soil readings per field. Every value shows its source and age."
      />

      {state.scenario.weatherChanged && (
        <p className="mb-5 flex items-start gap-2 rounded-panel border border-line bg-terracotta-tint px-4 py-3 text-terracotta-ink">
          <CloudRain aria-hidden className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong className="font-semibold">Forecast updated (demo incident):</strong> thunderstorms Thursday afternoon to Friday morning over Dindori and Niphad. Affected tasks were sent to Operations for approval.
          </span>
        </p>
      )}

      <Panel
        title="Forecast"
        description="Regional forecast in 6-hour blocks. Seeded demo forecast: not a live weather service."
        actions={
          state.weather.length > 1 ? (
            <Segmented label="Weather zone" value={zone} onChange={setZone} options={state.weather.map((w) => ({ value: w.zone, label: w.zoneLabel }))} />
          ) : undefined
        }
      >
        {!snapshot ? (
          <EmptyState icon={CloudRain} title="No forecast available">
            The forecast provider returned nothing for this zone. Tasks keep their schedule; check again later.
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-ink">
                <span className="font-semibold text-ink-strong">{snapshot.provider}</span> · issued {fmtDayTime(snapshot.issuedAt)} · 5-day horizon
              </p>
              <Provenance source={snapshot.source} at={snapshot.issuedAt} now={state.now} staleAfterHours={12} />
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Applies to: {state.farms.filter((f) => f.weatherZone === snapshot.zone).map((f) => f.name).join(", ") || "no farms"}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="tabular w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line text-ink-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-semibold">Day</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Period</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Temp (°C)</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Humidity (%)</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Rain chance (%)</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Rain (mm)</th>
                    <th scope="col" className="py-2 font-semibold">Wind (km/h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {snapshot.blocks.map((b) => {
                    const wet = b.rainProb >= 60;
                    const windy = b.windKmh >= 15;
                    return (
                      <tr key={b.start} className={cx(wet && "bg-terracotta-tint/50")}>
                        <td className="py-2 pr-3 font-semibold text-ink-strong">{fmtDay(b.start)}</td>
                        <td className="py-2 pr-3 text-ink">
                          {fmtTime(b.start)}–{fmtTime(b.end)}
                        </td>
                        <td className="py-2 pr-3 text-ink-strong">{b.tempC}</td>
                        <td className="py-2 pr-3 text-ink-strong">{b.humidity}</td>
                        <td className="py-2 pr-3 text-ink-strong">
                          <span className="inline-flex items-center gap-1.5">
                            {b.rainProb}
                            {wet && <Chip tone="terracotta" icon={CloudRain}>Rain likely</Chip>}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-ink-strong">{b.rainMm}</td>
                        <td className="py-2 text-ink-strong">
                          <span className="inline-flex items-center gap-1.5">
                            {b.windKmh} {b.windDir}
                            {windy && <Chip tone="gold" icon={Wind}>No spraying</Chip>}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-control border border-line bg-sunken/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Local station reading, {snapshot.zoneLabel}</h3>
                <Provenance source={snapshot.local.source} at={snapshot.local.at} now={state.now} staleAfterHours={3} />
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">Measured on the ground, kept separate from the regional forecast above.</p>
              <dl className="tabular mt-2 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="flex items-center gap-1 text-ink-muted"><Thermometer aria-hidden className="size-4" />Temperature</dt>
                  <dd className="font-semibold text-ink-strong">{snapshot.local.tempC} °C</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-ink-muted"><Droplets aria-hidden className="size-4" />Humidity</dt>
                  <dd className="font-semibold text-ink-strong">{snapshot.local.humidity}%</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-ink-muted"><Wind aria-hidden className="size-4" />Wind</dt>
                  <dd className="font-semibold text-ink-strong">{snapshot.local.windKmh} km/h</dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </Panel>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          title="Soil readings by field"
          description="Moisture from simulated probes; pH, nutrients and salinity from the last manual soil test."
          actions={
            <div className="w-full sm:w-72">
              <Label htmlFor="soil-field">Field</Label>
              <Select id="soil-field" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
                {state.farms.map((f) => (
                  <optgroup key={f.id} label={f.name}>
                    {state.fields
                      .filter((x) => x.farmId === f.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({cropLabel(x.crop)})
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
            </div>
          }
        >
          {!field ? (
            <EmptyState icon={Droplets} title="No field selected" />
          ) : (
            <>
              <p className="text-sm text-ink">
                {farm?.name} · {cropLabel(field.crop)}, {STAGE_LABEL[field.stage].en.toLowerCase()} stage · {field.areaAcres} acres · {field.soilType} soil
              </p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {KINDS.map((kind) => {
                  const r = latestReading(state, field.id, kind);
                  const meta = SENSOR_META[kind];
                  return (
                    <li key={kind} className="rounded-control border border-line bg-canvas/60 p-3">
                      <p className="text-sm text-ink-muted">{meta.label}</p>
                      {r ? (
                        <>
                          <p className="tabular mt-0.5 text-xl font-semibold text-ink-strong">
                            {r.value} <span className="text-sm font-medium text-ink">{r.unit}</span>
                          </p>
                          <Provenance className="mt-1" source={r.source} at={r.at} now={state.now} staleAfterHours={STALE_HOURS[kind]} />
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-ink">No reading yet</p>
                      )}
                      <p className="mt-1.5 text-xs text-ink-muted">{meta.hint}</p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4">
                <MoistureChart readings={readingsFor(state, field.id, "moisture")} />
              </div>
            </>
          )}
        </Panel>

        <Panel title="What the readings suggest" description="Threshold checks combined with the forecast. Advice to review, not a guarantee.">
          {field && (
            <ul className="space-y-3">
              {fieldInsights(state, field.id).map((insight) => {
                const meta = INSIGHT[insight.level];
                return (
                  <li key={insight.title} className="rounded-control border border-line p-3">
                    <div className="flex items-center gap-2">
                      <Chip tone={meta.tone} icon={meta.icon}>{meta.label}</Chip>
                      <span className="font-semibold text-ink-strong">{insight.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink">{insight.detail}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-5" title="All fields at a glance" description="Latest reading per field. Select a row to see its detail above." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="tabular w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Field</th>
                <th scope="col" className="px-3 py-2 font-semibold">Crop</th>
                <th scope="col" className="px-3 py-2 font-semibold">Moisture (% VWC)</th>
                <th scope="col" className="px-3 py-2 font-semibold">pH</th>
                <th scope="col" className="px-3 py-2 font-semibold">EC (dS/m)</th>
                <th scope="col" className="px-3 py-2 font-semibold">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {state.fields.map((f) => {
                const m = latestReading(state, f.id, "moisture");
                const ph = latestReading(state, f.id, "ph");
                const ec = latestReading(state, f.id, "ec");
                const flags = fieldInsights(state, f.id).filter((i) => i.level !== "ok");
                const ml = m ? moistureLabel(m.value) : null;
                return (
                  <tr key={f.id} className={cx("cursor-pointer hover:bg-sunken/60", f.id === fieldId && "bg-forest-tint")} onClick={() => setFieldId(f.id)}>
                    <td className="px-4 py-2">
                      <button type="button" className="text-left font-semibold text-ink-strong hover:underline" onClick={() => setFieldId(f.id)}>
                        {f.name}
                      </button>
                      <span className="block text-xs text-ink-muted">{state.farms.find((x) => x.id === f.farmId)?.name}</span>
                    </td>
                    <td className="px-3 py-2 text-ink">{cropLabel(f.crop)}</td>
                    <td className="px-3 py-2">
                      {m && ml ? (
                        <span className="inline-flex items-center gap-1.5 text-ink-strong">
                          {m.value}
                          <Chip tone={ml.tone}>{ml.text}</Chip>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink-strong">{ph?.value ?? "—"}</td>
                    <td className="px-3 py-2 text-ink-strong">
                      {ec ? (
                        <span className="inline-flex items-center gap-1.5">
                          {ec.value}
                          {ec.value > EC_HIGH && <Chip tone="gold">High</Chip>}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink">{flags.length ? flags.map((i) => i.title).join("; ") : <span className="text-ink-muted">None</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
