"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Plus, Search } from "lucide-react";
import type { TaskStatus, TaskType } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, EmptyState, Label, PageHeader, Panel, Select, TextInput, cx } from "@/components/ui/primitives";
import { PriorityChip, TaskStatusChip } from "@/components/ui/domain";
import { ScheduleBoard } from "@/components/owner/ScheduleBoard";
import { ProposalReview } from "@/components/owner/ProposalReview";
import { DemoIncidents } from "@/components/owner/DemoIncidents";
import { TaskForm } from "@/components/owner/TaskForm";
import { TaskDetail } from "@/components/owner/TaskDetail";
import { ContentSkeleton } from "@/components/PortalGate";
import { TASK_TYPE_LABEL } from "@/data/crops";
import { fmtRange, ms } from "@/lib/time";
import { isOverdue } from "@/services/scheduler";

type StatusFilter = "open" | "attention" | TaskStatus | "all";

function Operations() {
  const { state } = useReadyState();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selected = params.get("task");
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [farmId, setFarmId] = useState("");
  const [type, setType] = useState<TaskType | "">("");
  const [q, setQ] = useState("");

  const select = (taskId: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (taskId) next.set("task", taskId);
    else next.delete("task");
    next.delete("proposal");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const pending = state.proposals.filter((p) => p.status === "pending");
  const decided = state.proposals.filter((p) => p.status !== "pending").slice(0, 4);

  const tasks = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.tasks
      .filter((t) => {
        if (status === "open" && !["scheduled", "in_progress", "blocked"].includes(t.status)) return false;
        if (status === "attention" && !(t.needsAttention || t.status === "blocked" || isOverdue(t, state.now))) return false;
        if (!["open", "attention", "all"].includes(status) && t.status !== status) return false;
        if (farmId && t.farmId !== farmId) return false;
        if (type && t.type !== type) return false;
        if (needle) {
          const who = state.users.find((u) => u.id === t.assigneeId)?.name ?? "";
          const where = state.fields.find((f) => f.id === t.fieldId)?.name ?? "";
          if (![t.title, who, where, t.id].some((s) => s.toLowerCase().includes(needle))) return false;
        }
        return true;
      })
      .sort((a, b) => Number(!!b.needsAttention) - Number(!!a.needsAttention) || ms(a.start) - ms(b.start));
  }, [state, status, farmId, type, q]);

  return (
    <>
      <PageHeader
        title="Operations & Tasks"
        description="Plan, assign and approve work across every farm. Schedule changes from the planner wait here for your decision."
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)} disabled={creating}>
            New task
          </Button>
        }
      />

      {creating && (
        <Panel className="mb-5" title="New task" description="Urvara checks machine bookings (with travel time), farmer availability, stock and the forecast as you fill this in.">
          <TaskForm
            onDone={(id) => {
              setCreating(false);
              if (id) select(id);
            }}
          />
        </Panel>
      )}

      <div className="space-y-5">
        {pending.map((p) => (
          <ProposalReview key={p.id} proposal={p} />
        ))}
        {pending.length === 0 && (
          <p className="rounded-panel border border-line bg-surface px-4 py-3 text-ink shadow-panel">
            No schedule changes are waiting for approval. When the forecast changes or a machine goes down, the planner drafts a replan here.
          </p>
        )}
      </div>

      {pending.length === 0 && (
        <Panel className="mt-5" title="Shared machines, next five days" description="Bookings per machine with each zone's rain outlook. Hatched lanes are out of service.">
          <ScheduleBoard state={state} highlightTaskId={selected ?? undefined} />
        </Panel>
      )}

      <div className={cx("mt-5 grid grid-cols-1 gap-5", selected && "xl:grid-cols-[minmax(0,1fr)_26rem]")}>
        <Panel className="min-w-0" title="Tasks" description={`${tasks.length} shown`} bodyClassName="p-0">
          <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="f-status">Status</Label>
              <Select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
                <option value="open">Open (to do, in progress, blocked)</option>
                <option value="attention">Needs attention</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="f-farm">Farm</Label>
              <Select id="f-farm" value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                <option value="">All farms</option>
                {state.farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="f-type">Type</Label>
              <Select id="f-type" value={type} onChange={(e) => setType(e.target.value as TaskType | "")}>
                <option value="">All types</option>
                {(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((t) => (
                  <option key={t} value={t}>
                    {TASK_TYPE_LABEL[t].en}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="f-q">Search</Label>
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <TextInput id="f-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Task, farmer or field" className="pl-8" />
              </div>
            </div>
          </div>
          {tasks.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ClipboardList}
                title="No tasks match these filters"
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatus("all");
                      setFarmId("");
                      setType("");
                      setQ("");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              >
                Try “All” statuses, or create a task with the New task button.
              </EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-line bg-canvas/70 text-ink-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">Task</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Where</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Farmer</th>
                    <th scope="col" className="px-3 py-2 font-semibold">When</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => {
                    const field = state.fields.find((f) => f.id === t.fieldId);
                    const farm = state.farms.find((f) => f.id === t.farmId);
                    return (
                      <tr
                        key={t.id}
                        className={cx("border-b border-line/70 last:border-0", selected === t.id ? "bg-forest-tint/60" : "hover:bg-canvas", t.needsAttention && "bg-terracotta-tint/30")}
                      >
                        <td className="px-4 py-2.5">
                          <button type="button" onClick={() => select(t.id)} className="text-left font-semibold text-forest hover:underline" aria-pressed={selected === t.id}>
                            {t.title}
                          </button>
                          <span className="block text-ink-muted">
                            {TASK_TYPE_LABEL[t.type].en}
                            {t.machineIds.length > 0 && ` · ${t.machineIds.map((id) => state.resources.find((r) => r.id === id)?.name).join(", ")}`}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-ink">
                          {farm?.name}
                          <span className="block text-ink-muted">{field?.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-ink">{state.users.find((u) => u.id === t.assigneeId)?.name}</td>
                        <td className="tabular px-3 py-2.5 text-ink">{fmtRange(t.start, t.end)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            <TaskStatusChip status={t.status} overdue={isOverdue(t, state.now)} />
                            {t.priority === "high" && <PriorityChip priority="high" />}
                            {t.needsAttention && t.status !== "blocked" && <span className="text-xs font-semibold text-terracotta-ink">Needs decision</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        {selected && (
          <div className="xl:sticky xl:top-20 xl:self-start">
            <TaskDetail key={selected} taskId={selected} onClose={() => select(null)} />
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <DemoIncidents />
        <Panel title="Recent decisions" description="Approved, rejected and revised plans stay on record.">
          {decided.length === 0 ? (
            <p className="text-sm text-ink">No decisions yet.</p>
          ) : (
            <ul className="space-y-3">
              {decided.map((p) => (
                <li key={p.id} className="text-sm">
                  <p className="font-semibold text-ink-strong">
                    {p.title} <span className="font-normal text-ink-muted">· {p.status.replace("_", " ")}</span>
                  </p>
                  <p className="text-ink">{p.decisionNote ?? p.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

export default function OperationsPage() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <Operations />
    </Suspense>
  );
}
