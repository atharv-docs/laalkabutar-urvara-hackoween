"use client";

import { useState } from "react";
import { Database, FlaskConical, ScrollText } from "lucide-react";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { PageHeader, Panel, Select, Label } from "@/components/ui/primitives";
import { DataSourceBadge } from "@/components/ui/domain";
import { DemoIncidents } from "@/components/owner/DemoIncidents";
import { isFirebaseConfigured } from "@/lib/firebase";
import { fmtDayTime } from "@/lib/time";
import { actorName } from "@/services/audit";

export default function SettingsPage() {
  const { state, repo } = useReadyState();
  const [filter, setFilter] = useState("");
  const families = [...new Set(state.auditEvents.map((e) => e.action.split(".")[0]))].sort();
  const events = state.auditEvents.filter((e) => !filter || e.action.startsWith(`${filter}.`));

  return (
    <>
      <PageHeader title="Settings & demo" description="Where the data comes from, demo controls, and the full audit trail." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={<span className="inline-flex items-center gap-2"><Database aria-hidden className="size-4 text-ink-muted" />Data source</span>}>
          <div className="flex items-center gap-2">
            <DataSourceBadge />
            <span className="font-semibold text-ink-strong">{repo.source === "demo" ? "Browser demo store" : "Firebase Firestore"}</span>
          </div>
          <p className="mt-2 text-ink">{repo.description}</p>
          <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-ink-muted">Firebase configured</dt>
            <dd className="text-ink-strong">{isFirebaseConfigured() ? "Yes" : "No: set NEXT_PUBLIC_FIREBASE_* in .env.local"}</dd>
            <dt className="text-ink-muted">Demo clock</dt>
            <dd className="tabular text-ink-strong">{fmtDayTime(state.now)} IST (fixed so the story repeats)</dd>
            <dt className="text-ink-muted">Weather</dt>
            <dd className="text-ink-strong">Seeded demo forecast{state.scenario.weatherChanged ? ", storm update applied" : ""}. Live API adapter is a next step.</dd>
            <dt className="text-ink-muted">Soil readings</dt>
            <dd className="text-ink-strong">Moisture simulated; pH, N, P, K and EC are manual soil-test entries</dd>
            <dt className="text-ink-muted">Voice</dt>
            <dd className="text-ink-strong">Browser speech recognition where supported; typed and sample input are labelled as such</dd>
          </dl>
        </Panel>
        <DemoIncidents />
      </div>

      <Panel
        className="mt-5"
        title={<span className="inline-flex items-center gap-2"><ScrollText aria-hidden className="size-4 text-ink-muted" />Audit trail</span>}
        description="Every approval, reassignment, report, correction and stock change, newest first."
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="audit-filter">Show</Label>
            <Select id="audit-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 w-44">
              <option value="">Everything</option>
              {families.map((f) => (
                <option key={f} value={f}>
                  {f.replace("_", " ")}
                </option>
              ))}
            </Select>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">When</th>
                <th scope="col" className="px-3 py-2 font-semibold">Who</th>
                <th scope="col" className="px-3 py-2 font-semibold">Action</th>
                <th scope="col" className="px-4 py-2 font-semibold">What happened</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-line/70 align-top last:border-0">
                  <td className="tabular whitespace-nowrap px-4 py-2 text-ink">{fmtDayTime(e.at)}</td>
                  <td className="px-3 py-2 text-ink-strong">{actorName(state, e.actorId)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-muted">{e.action}</td>
                  <td className="px-4 py-2 text-ink">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-center gap-1.5 border-t border-line px-4 py-2 text-xs text-ink-muted">
          <FlaskConical aria-hidden className="size-3.5" /> Synthetic demo events. Resetting the demo restores the original trail.
        </p>
      </Panel>
    </>
  );
}
