"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Droplets, MessageSquareText, Package, PackageCheck, TriangleAlert, Wrench } from "lucide-react";
import type { Resource } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, Chip, EmptyState, PageHeader, Panel, TextInput } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ageLabel, fmtRange, istDate, ms } from "@/lib/time";
import { adjustStock, detectConflicts, setMachineStatus, stockPosition } from "@/services/resources";
import { ACTIVE_STATUSES } from "@/services/scheduler";

function StockRow({ resource }: { resource: Resource }) {
  const { state, user, run } = useReadyState();
  const pos = stockPosition(state, resource.id)!;
  const [value, setValue] = useState(String(resource.quantity));
  const changed = Number(value) !== resource.quantity && value.trim() !== "" && Number(value) >= 0;
  return (
    <tr className="border-b border-line/70 last:border-0">
      <td className="px-4 py-2.5">
        <span className="font-semibold text-ink-strong">{resource.name}</span>
        <span className="block text-ink-muted">{resource.kind === "water" ? "Water" : resource.category}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <label htmlFor={`stock-${resource.id}`} className="sr-only">
            On hand for {resource.name} in {resource.unit}
          </label>
          <TextInput id={`stock-${resource.id}`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} className="tabular h-8 w-20 text-right" />
          <span className="text-ink-muted">{resource.unit}</span>
          {changed && (
            <Button size="sm" variant="secondary" onClick={() => void run((s) => adjustStock(s, resource.id, Number(value), user.id), { success: `${resource.name} stock updated`, undoable: true })}>
              Save
            </Button>
          )}
        </div>
      </td>
      <td className="tabular px-3 py-2.5 text-right">
        {pos.committed} {resource.unit}
      </td>
      <td className="tabular px-3 py-2.5 text-right font-semibold text-ink-strong">
        {pos.free} {resource.unit}
      </td>
      <td className="px-4 py-2.5">
        {pos.short ? (
          <Chip tone="terracotta" icon={TriangleAlert}>
            Short
          </Chip>
        ) : pos.low ? (
          <Chip tone="gold" icon={TriangleAlert}>
            Low (reorder at {resource.reorderAt})
          </Chip>
        ) : (
          <Chip tone="sage" icon={CircleCheck}>
            Enough
          </Chip>
        )}
      </td>
    </tr>
  );
}

export default function ResourcesPage() {
  const { state, user, run } = useReadyState();
  const router = useRouter();
  const [breaking, setBreaking] = useState<Resource | null>(null);
  const conflicts = detectConflicts(state);
  const machines = state.resources.filter((r) => r.kind === "machine");
  const stocks = state.resources.filter((r) => r.kind === "input" || r.kind === "water");
  const labour = state.resources.find((r) => r.kind === "labour");
  const today = istDate(state.now);
  const workingToday = new Set(state.tasks.filter((t) => istDate(t.start) === today && ACTIVE_STATUSES.includes(t.status)).map((t) => t.assigneeId));
  const requests = state.reports.filter((r) => r.kind === "resource_request").sort((a, b) => ms(b.createdAt) - ms(a.createdAt));

  return (
    <>
      <PageHeader title="Resources" description="Shared machines, materials, water and labour across all farms. A machine is never booked in two places at once, including travel time between farms." />

      <Panel title="Conflicts and shortages" description={conflicts.length ? "Resolve these before the work is due." : undefined} className="mb-5" bodyClassName={conflicts.length ? "p-0" : undefined}>
        {conflicts.length === 0 ? (
          <EmptyState icon={PackageCheck} title="No conflicts">
            Every booking has its machine, farmer, and enough stock.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/70">
            {conflicts.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                <TriangleAlert aria-hidden className={c.severity === "high" ? "mt-0.5 size-5 shrink-0 text-terracotta-ink" : "mt-0.5 size-5 shrink-0 text-gold-ink"} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-strong">{c.title}</p>
                  <p className="text-sm text-ink">{c.detail}</p>
                </div>
                {c.taskIds[0] && (
                  <Link href={`/owner/operations?task=${c.taskIds[0]}`} className="shrink-0 text-sm font-semibold text-forest hover:underline">
                    Open task
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Shared machines" className="mb-5" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Machine</th>
                <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2 font-semibold">Next booking</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Upcoming</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => {
                const bookings = state.tasks.filter((t) => t.machineIds.includes(m.id) && ACTIVE_STATUSES.includes(t.status) && ms(t.end) > ms(state.now)).sort((a, b) => ms(a.start) - ms(b.start));
                const next = bookings[0];
                const home = state.farms.find((f) => f.id === m.homeFarmId);
                return (
                  <tr key={m.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-ink-strong">{m.name}</span>
                      <span className="block text-ink-muted">Based at {home?.name ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {m.status === "available" ? (
                        <Chip tone="sage" icon={CircleCheck}>Available</Chip>
                      ) : (
                        <span>
                          <Chip tone="terracotta" icon={Wrench}>Out of service</Chip>
                          {m.statusNote && <span className="mt-0.5 block text-xs text-ink">{m.statusNote}</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-ink">
                      {next ? (
                        <Link href={`/owner/operations?task=${next.id}`} className="hover:underline">
                          {next.title}
                          <span className="tabular block text-ink-muted">
                            {state.farms.find((f) => f.id === next.farmId)?.name} · {fmtRange(next.start, next.end)}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-ink-muted">No upcoming bookings</span>
                      )}
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">{bookings.length}</td>
                    <td className="px-4 py-2.5 text-right">
                      {m.status === "available" ? (
                        <Button size="sm" variant="secondary" icon={Wrench} onClick={() => setBreaking(m)}>
                          Report breakdown
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" icon={CircleCheck} onClick={() => void run((s) => setMachineStatus(s, m.id, "available", user.id, "Repaired").state, { success: `${m.name} back in service`, undoable: true })}>
                          Mark repaired
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Materials and water" description="On hand, already booked by upcoming tasks, and what is left. Edit the on-hand figure after a delivery or stock check." className="mb-5" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Item</th>
                <th scope="col" className="px-3 py-2 font-semibold">On hand</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Booked</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Free</th>
                <th scope="col" className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((r) => (
                <StockRow key={`${r.id}-${r.quantity}`} resource={r} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-center gap-1.5 border-t border-line px-4 py-2 text-xs text-ink-muted">
          <Droplets aria-hidden className="size-3.5" /> Water allocations are daily volumes; bookings are what upcoming irrigation tasks will draw.
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Labour">
          {labour && (
            <p className="text-ink">
              <span className="tabular text-2xl font-semibold text-ink-strong">{workingToday.size}</span> of {state.users.filter((u) => u.role === "farmer" && u.status !== "deactivated").length} farmers have work today, plus a daily labour pool of{" "}
              <strong className="tabular font-semibold text-ink-strong">{labour.quantity} {labour.unit}</strong> on call.
            </p>
          )}
          <p className="mt-2 text-sm text-ink-muted">The planner never books a farmer for two tasks at the same time.</p>
        </Panel>
        <Panel title="Requests from farmers" bodyClassName={requests.length ? "p-0" : undefined}>
          {requests.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="No requests">
              When a farmer says “we need another sprayer”, it appears here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line/70">
              {requests.map((r) => (
                <li key={r.id} className="flex gap-3 px-4 py-3 text-sm">
                  <Package aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-ink" />
                  <div>
                    <p className="font-semibold text-ink-strong">
                      {r.requestedResource ?? "Request"} · {state.users.find((u) => u.id === r.reporterId)?.name}
                      <span className="font-normal text-ink-muted"> · {ageLabel(r.createdAt, state.now)}</span>
                    </p>
                    <p className="text-ink">“{r.transcript}”</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={!!breaking}
        title={`Report ${breaking?.name} out of service?`}
        confirmLabel="Mark broken and draft a replan"
        tone="danger"
        onClose={() => setBreaking(null)}
        onConfirm={async () => {
          const machine = breaking!;
          setBreaking(null);
          let id: string | undefined;
          const ok = await run((s) => {
            const r = setMachineStatus(s, machine.id, "broken", user.id, "Reported by owner");
            id = r.proposalId;
            return r.state;
          }, { success: `${machine.name} marked out of service` });
          if (ok && id) router.push(`/owner/operations?proposal=${id}`);
        }}
      >
        Urvara will look for another {breaking?.category} for each of its upcoming bookings and draft a replan for your approval. Nothing moves until you approve.
      </ConfirmDialog>
    </>
  );
}
