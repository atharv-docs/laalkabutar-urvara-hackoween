"use client";

import { useState } from "react";
import { CalendarPlus, CheckCircle2, History, RotateCcw, TriangleAlert, UserRoundCog, X, XCircle } from "lucide-react";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, Label, Select, cx } from "@/components/ui/primitives";
import { PriorityChip, TaskStatusChip } from "@/components/ui/domain";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TASK_TYPE_LABEL, cropLabel } from "@/data/crops";
import { fmtDayTime, fmtRange } from "@/lib/time";
import { actorName } from "@/services/audit";
import { isOverdue } from "@/services/scheduler";
import { reassignTask, updateTaskStatus } from "@/services/tasks";
import { extendAndReschedule } from "@/services/replanner";

export function TaskDetail({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { state, user, run, toast } = useReadyState();
  const task = state.tasks.find((t) => t.id === taskId);
  const [assignee, setAssignee] = useState(task?.assigneeId ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!task) return null;
  const field = state.fields.find((f) => f.id === task.fieldId);
  const farm = state.farms.find((f) => f.id === task.farmId);
  const farmer = state.users.find((u) => u.id === task.assigneeId);
  const machines = task.machineIds.map((id) => state.resources.find((r) => r.id === id)).filter(Boolean);
  const overdue = isOverdue(task, state.now);
  const open = task.status !== "done" && task.status !== "cancelled";

  return (
    <aside aria-labelledby="task-detail-title" className="rounded-panel border border-line bg-surface shadow-panel">
      <header className="flex items-start gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-muted">
            {TASK_TYPE_LABEL[task.type].en} · {cropLabel(task.crop)} · {task.id}
          </p>
          <h2 id="task-detail-title" className="text-lg font-semibold">
            {task.title}
          </h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <TaskStatusChip status={task.status} overdue={overdue} />
            <PriorityChip priority={task.priority} />
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-ink-muted hover:text-ink-strong" aria-label="Close task details">
          <X className="size-5" />
        </button>
      </header>

      {task.needsAttention && open && (
        <div className="flex gap-2 border-b border-line bg-terracotta-tint/60 px-4 py-3 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-terracotta-ink" />
          <div>
            <p className="font-semibold text-terracotta-ink">Needs your decision</p>
            <p className="text-ink-strong">{task.needsAttention}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[24, 48].map((h) => (
                <Button
                  key={h}
                  size="sm"
                  variant="secondary"
                  icon={CalendarPlus}
                  onClick={async () => {
                    let error: string | undefined;
                    await run(
                      (s) => {
                        const r = extendAndReschedule(s, task.id, h, user.id);
                        error = r.error;
                        return r.state;
                      },
                      {},
                    );
                    if (error) toast({ tone: "error", title: "No slot found", body: error });
                    else toast({ tone: "success", title: `Deadline extended by ${h / 24} day${h > 24 ? "s" : ""} and task rescheduled`, body: "The farmer sees the new time." });
                  }}
                >
                  Extend deadline {h / 24} day{h > 24 ? "s" : ""} and replan
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 px-4 py-3 text-sm">
        <dt className="text-ink-muted">Where</dt>
        <dd className="text-ink-strong">
          {farm?.name}, {field?.name}
        </dd>
        <dt className="text-ink-muted">When</dt>
        <dd className="tabular text-ink-strong">{fmtRange(task.start, task.end)}</dd>
        <dt className="text-ink-muted">Deadline</dt>
        <dd className="tabular text-ink-strong">{fmtDayTime(task.due)}</dd>
        <dt className="text-ink-muted">Farmer</dt>
        <dd className="text-ink-strong">{farmer?.name}</dd>
        <dt className="text-ink-muted">Machines</dt>
        <dd className="text-ink-strong">{machines.length ? machines.map((m) => `${m!.name}${m!.status !== "available" ? " (out of service)" : ""}`).join(", ") : "None"}</dd>
        <dt className="text-ink-muted">Materials</dt>
        <dd className="text-ink-strong">
          {task.inputs.length
            ? task.inputs
                .map((i) => {
                  const r = state.resources.find((x) => x.id === i.resourceId);
                  return `${i.quantity} ${r?.unit} ${r?.name}`;
                })
                .join(", ")
            : "None"}
        </dd>
        <dt className="text-ink-muted">Why</dt>
        <dd className="text-ink">{task.rationale || "No reason recorded"}</dd>
        {task.blockerReason && (
          <>
            <dt className="text-ink-muted">Blocked by</dt>
            <dd className="font-semibold text-terracotta-ink">{task.blockerReason}</dd>
          </>
        )}
        {task.completionNote && (
          <>
            <dt className="text-ink-muted">Farmer note</dt>
            <dd className="text-ink">“{task.completionNote}”</dd>
          </>
        )}
      </dl>

      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Label htmlFor="reassign">Reassign</Label>
              <Select id="reassign" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                {state.users
                  .filter((u) => u.role === "farmer" && u.status !== "deactivated")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.fieldIds.includes(task.fieldId) ? " · assigned to this field" : ""}
                    </option>
                  ))}
              </Select>
            </div>
            <Button
              variant="secondary"
              icon={UserRoundCog}
              disabled={assignee === task.assigneeId}
              onClick={() => void run((s) => reassignTask(s, task.id, assignee, user.id), { success: "Task reassigned", undoable: true })}
            >
              Save
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={CheckCircle2} variant="secondary" onClick={() => void run((s) => updateTaskStatus(s, task.id, "done", user.id, { note: "Verified by owner" }), { success: "Marked done", undoable: true })}>
              Mark done
            </Button>
            {task.status === "blocked" && (
              <Button icon={RotateCcw} variant="secondary" onClick={() => void run((s) => updateTaskStatus(s, task.id, "scheduled", user.id, { note: "Blocker resolved" }), { success: "Task unblocked", undoable: true })}>
                Blocker resolved
              </Button>
            )}
            <Button icon={XCircle} variant="ghost" onClick={() => setConfirmCancel(true)}>
              Cancel task
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-line px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <History aria-hidden className="size-4 text-ink-muted" />
          History
        </h3>
        <ol className="mt-2 space-y-2 border-l border-line pl-3">
          {[...task.history].reverse().map((h, i) => (
            <li key={`${h.at}-${i}`} className={cx("text-sm", i === 0 ? "text-ink-strong" : "text-ink")}>
              <time className="tabular block text-xs text-ink-muted" dateTime={h.at}>
                {fmtDayTime(h.at)} · {actorName(state, h.actor)}
              </time>
              {h.text}
            </li>
          ))}
        </ol>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this task?"
        confirmLabel="Cancel task"
        tone="danger"
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          void run((s) => updateTaskStatus(s, task.id, "cancelled", user.id, { note: "Cancelled by owner" }), { success: "Task cancelled", undoable: true });
        }}
      >
        {farmer?.name} will no longer see “{task.title}”. Machines and materials booked for it are released.
      </ConfirmDialog>
    </aside>
  );
}
