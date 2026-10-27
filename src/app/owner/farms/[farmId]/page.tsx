"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CircleCheck, Droplets, Eye, MapPinOff, Pencil, Plus, Sprout, TriangleAlert } from "lucide-react";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, Chip, EmptyState, PageHeader, Panel, cx } from "@/components/ui/primitives";
import { Provenance, RiskChip, TaskStatusChip } from "@/components/ui/domain";
import { FieldForm } from "@/components/owner/FieldForm";
import { STAGE_LABEL, TASK_TYPE_LABEL, cropLabel } from "@/data/crops";
import { addHours, ageLabel, fmtRange, ms } from "@/lib/time";
import { farmSummary, formatINR } from "@/services/analytics";
import { latestRiskByField } from "@/services/risk";
import { blocksOverlapping, isOverdue, weatherFor } from "@/services/scheduler";
import { fieldInsights, latestReading, SENSOR_META } from "@/services/soil";
import type { SensorKind } from "@/types";

const KINDS: SensorKind[] = ["moisture", "ph", "nitrogen", "phosphorus", "potassium", "ec"];

export default function FarmDetailPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const { state } = useReadyState();
  const [editing, setEditing] = useState<string | null>(null);
  const farm = state.farms.find((f) => f.id === farmId);

  if (!farm) {
    return (
      <EmptyState icon={MapPinOff} title="Farm not found" action={<Link href="/owner/farms" className="font-semibold text-forest underline">Back to Farms & Fields</Link>}>
        It may have been removed, or the link is wrong.
      </EmptyState>
    );
  }

  const s = farmSummary(state, farm.id);
  const fields = state.fields.filter((f) => f.farmId === farm.id);
  const risk = latestRiskByField(state);
  const snapshot = weatherFor(state, farm.id);
  const next48 = blocksOverlapping(snapshot, state.now, addHours(state.now, 48));
  const tasks = state.tasks
    .filter((t) => t.farmId === farm.id && t.status !== "cancelled" && (ms(t.end) > ms(state.now) || t.status !== "done"))
    .sort((a, b) => ms(a.start) - ms(b.start));
  const reports = state.reports.filter((r) => r.farmId === farm.id).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));

  return (
    <>
      <Link href="/owner/farms" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Farms & Fields
      </Link>
      <PageHeader
        title={farm.name}
        description={`${farm.village}, ${farm.district} · ${s.areaAcres} acres · ${fields.length} fields · ${farm.lat.toFixed(3)}° N, ${farm.lng.toFixed(3)}° E`}
        actions={
          <Button variant="secondary" icon={Plus} onClick={() => setEditing("new")} disabled={editing === "new"}>
            Add field
          </Button>
        }
      />

      {editing === "new" && (
        <Panel className="mb-5" title={`New field on ${farm.name}`}>
          <FieldForm farmId={farm.id} onDone={() => setEditing(null)} />
        </Panel>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="space-y-5">
          {fields.map((field) => {
            const r = risk.get(field.id);
            const insights = fieldInsights(state, field.id);
            const people = state.users.filter((u) => u.role === "farmer" && u.fieldIds.includes(field.id));
            return (
              <Panel
                key={field.id}
                title={field.name}
                description={`${cropLabel(field.crop)} · ${STAGE_LABEL[field.stage].en} · ${field.areaAcres} ac · ${field.soilType} soil · planted ${field.plantedOn}`}
                actions={
                  <>
                    {r && <RiskChip category={r.category} score={r.score} />}
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(field.id)}>
                      Edit
                    </Button>
                  </>
                }
              >
                {editing === field.id ? (
                  <FieldForm farmId={farm.id} field={field} onDone={() => setEditing(null)} />
                ) : (
                  <>
                    <p className="text-sm text-ink">
                      Assigned: {people.length ? people.map((p) => p.name).join(", ") : <span className="font-semibold text-terracotta-ink">nobody yet. Assign a farmer in Farmers.</span>}
                    </p>
                    <ul className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                      {KINDS.map((kind) => {
                        const reading = latestReading(state, field.id, kind);
                        return (
                          <li key={kind} className="min-w-0">
                            <p className="text-sm text-ink-muted">{SENSOR_META[kind].label}</p>
                            {reading ? (
                              <>
                                <p className="tabular text-lg font-semibold text-ink-strong">
                                  {reading.value} <span className="text-sm font-normal text-ink">{reading.unit}</span>
                                </p>
                                <Provenance source={reading.source} at={reading.at} now={state.now} staleAfterHours={kind === "moisture" ? 6 : 24 * 45} />
                              </>
                            ) : (
                              <p className="text-sm text-ink-muted">No reading</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <ul className="mt-4 space-y-2">
                      {insights.map((i) => (
                        <li
                          key={i.title}
                          className={cx(
                            "flex gap-2 rounded-control px-3 py-2 text-sm",
                            i.level === "action" ? "bg-terracotta-tint/70" : i.level === "watch" ? "bg-gold-tint/70" : "bg-sage-tint/60",
                          )}
                        >
                          {i.level === "action" ? (
                            <Droplets aria-hidden className="mt-0.5 size-4 shrink-0 text-terracotta-ink" />
                          ) : i.level === "watch" ? (
                            <Eye aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-ink" />
                          ) : (
                            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-sage-ink" />
                          )}
                          <span>
                            <span className="font-semibold text-ink-strong">{i.title}. </span>
                            {i.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>
            );
          })}
        </div>

        <div className="space-y-5">
          <Panel title="Weather, next 48 hours" description={snapshot ? `${snapshot.zoneLabel} forecast` : undefined}>
            {snapshot ? (
              <>
                <ul className="divide-y divide-line/70 text-sm">
                  {next48.map((b) => (
                    <li key={b.start} className="tabular flex items-center justify-between gap-3 py-1.5">
                      <span className="text-ink">{fmtRange(b.start, b.end)}</span>
                      <span className={b.rainProb >= 60 ? "font-semibold text-terracotta-ink" : "text-ink-strong"}>
                        {b.rainProb}% · {b.rainMm} mm · {b.windKmh} km/h
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 border-t border-line pt-3 text-sm">
                  <p className="text-ink-muted">Local station (separate from the regional forecast)</p>
                  <p className="tabular font-semibold text-ink-strong">
                    {snapshot.local.tempC} °C · {snapshot.local.humidity}% RH · wind {snapshot.local.windKmh} km/h
                  </p>
                  <Provenance source={snapshot.local.source} at={snapshot.local.at} now={state.now} staleAfterHours={3} />
                </div>
                <div className="mt-2">
                  <Provenance source={snapshot.source} at={snapshot.issuedAt} now={state.now} staleAfterHours={12} />
                </div>
              </>
            ) : (
              <p className="text-sm text-ink">No forecast zone set for this farm.</p>
            )}
          </Panel>

          <Panel title="Tasks" description={`${s.openTasks} open${s.overdue ? `, ${s.overdue} overdue` : ""}`} bodyClassName="p-0">
            {tasks.length === 0 ? (
              <p className="p-4 text-sm text-ink">No open tasks on this farm.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/owner/operations?task=${t.id}`} className="block px-4 py-2.5 hover:bg-canvas">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-ink-strong">{t.title}</span>
                        <TaskStatusChip status={t.status} overdue={isOverdue(t, state.now)} />
                      </span>
                      <span className="tabular block text-sm text-ink-muted">
                        {TASK_TYPE_LABEL[t.type].en} · {fmtRange(t.start, t.end)} · {state.users.find((u) => u.id === t.assigneeId)?.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Activity from the field" description="Farmer reports for this farm, newest first." bodyClassName="p-0">
            {reports.length === 0 ? (
              <p className="p-4 text-sm text-ink">No reports yet.</p>
            ) : (
              <ol className="divide-y divide-line/70">
                {reports.map((r) => (
                  <li key={r.id} className="px-4 py-2.5 text-sm">
                    <p className="flex flex-wrap items-center gap-1.5">
                      {r.kind === "problem" ? <Sprout aria-hidden className="size-4 text-terracotta-ink" /> : <TriangleAlert aria-hidden className="hidden" />}
                      <span className="font-semibold text-ink-strong">{state.users.find((u) => u.id === r.reporterId)?.name}</span>
                      <span className="text-ink-muted">· {state.fields.find((f) => f.id === r.fieldId)?.name.split(" – ")[0]} · {ageLabel(r.createdAt, state.now)}</span>
                      {r.kind === "problem" && <Chip tone={r.status === "unverified" ? "terracotta" : "neutral"}>{r.status === "unverified" ? "Unverified" : r.status}</Chip>}
                    </p>
                    <p className="mt-0.5 text-ink">“{r.transcript}”</p>
                    {r.kind === "problem" && (
                      <Link href={`/owner/crop-health?report=${r.id}`} className="mt-1 inline-block font-semibold text-forest hover:underline">
                        Review risk and scouting
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <p className="text-xs text-ink-muted">Standing crop value ≈ {formatINR(s.standingValueINR)} (planning yield × demo price; estimate only).</p>
        </div>
      </div>
    </>
  );
}
