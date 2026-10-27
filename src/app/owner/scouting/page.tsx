"use client";

import Link from "next/link";
import { MapPin, MapPinned, Route, Share2, Telescope } from "lucide-react";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Chip, PageHeader, Panel } from "@/components/ui/primitives";
import { TaskStatusChip } from "@/components/ui/domain";
import { fmtRange, ms } from "@/lib/time";
import { isOverdue } from "@/services/scheduler";

const PLANNED = [
  { icon: MapPin, title: "Scouting pins on the field map", body: "Drop a pin with the reason, risk level, crops, due time and the checks to make." },
  { icon: Share2, title: "Share one scout across nearby farms", body: "Assign a scout to a cluster of pins and let Urvara order the route by risk and distance." },
  { icon: Route, title: "Check-ins and observations", body: "The scout checks in at each pin, records what they found, and closes the inspection." },
  { icon: MapPinned, title: "Pins from disease-risk events", body: "High-risk fields from a crop report become suggested pins automatically." },
];

export default function ScoutingPage() {
  const { state } = useReadyState();
  const scouting = state.tasks.filter((t) => t.type === "scouting" && t.status !== "cancelled").sort((a, b) => ms(a.start) - ms(b.start));
  return (
    <>
      <PageHeader
        title="Scouting"
        description="Pins, shared scouts and check-ins are future scope and not built yet. Scouting itself already works as tasks created from crop-risk suggestions."
        actions={<Chip tone="gold" icon={Telescope}>Future scope</Chip>}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="What works today" description="Scouting tasks created from Crop Health suggestions or by hand." bodyClassName={scouting.length ? "p-0" : undefined}>
          {scouting.length === 0 ? (
            <p className="text-sm text-ink">
              No scouting tasks yet. Create one from a suggestion in <Link href="/owner/crop-health" className="font-semibold text-forest underline">Crop Health</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-line/70">
              {scouting.map((t) => (
                <li key={t.id}>
                  <Link href={`/owner/operations?task=${t.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-canvas">
                    <span>
                      <span className="font-semibold text-ink-strong">{t.title}</span>
                      <span className="tabular block text-sm text-ink-muted">
                        {state.farms.find((f) => f.id === t.farmId)?.name} · {fmtRange(t.start, t.end)} · {state.users.find((u) => u.id === t.assigneeId)?.name}
                      </span>
                    </span>
                    <TaskStatusChip status={t.status} overdue={isOverdue(t, state.now)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Planned: field scouting module" description="Shown here so the roadmap is honest. None of these controls are active.">
          <ul className="space-y-3">
            {PLANNED.map((p) => (
              <li key={p.title} className="flex gap-3">
                <p.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
                <span>
                  <span className="font-semibold text-ink-strong">{p.title}</span>
                  <span className="block text-sm text-ink">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
