"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, CircleX, Plus } from "lucide-react";
import type { Priority, TaskType } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, Label, Select, TextArea, TextInput, cx } from "@/components/ui/primitives";
import { TASK_TYPE_LABEL } from "@/data/crops";
import { addHours, atLocal, fmtDay } from "@/lib/time";
import { createTask, validateTaskDraft, type TaskDraft } from "@/services/tasks";

const TYPES = Object.keys(TASK_TYPE_LABEL) as TaskType[];

/** Create and assign a task, validated live against every constraint. */
export function TaskForm({ onDone, defaultFieldId }: { onDone: (taskId?: string) => void; defaultFieldId?: string }) {
  const { state, user, run } = useReadyState();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("irrigation");
  const [fieldId, setFieldId] = useState(defaultFieldId ?? "");
  const [assigneeId, setAssigneeId] = useState("");
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(7);
  const [duration, setDuration] = useState(2);
  const [dueDays, setDueDays] = useState(1);
  const [priority, setPriority] = useState<Priority>("medium");
  const [machineId, setMachineId] = useState("");
  const [inputId, setInputId] = useState("");
  const [qty, setQty] = useState("");
  const [rationale, setRationale] = useState("");
  const [touched, setTouched] = useState(false);

  const field = state.fields.find((f) => f.id === fieldId);
  const start = atLocal(state.now, day, hour);
  const draft: TaskDraft = {
    title,
    type,
    fieldId,
    assigneeId,
    start,
    end: addHours(start, duration),
    due: atLocal(state.now, day + dueDays - 1, 20),
    priority,
    machineIds: machineId ? [machineId] : [],
    inputs: inputId && Number(qty) > 0 ? [{ resourceId: inputId, quantity: Number(qty) }] : [],
    rationale,
  };
  const issues = validateTaskDraft(state, draft);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const farmers = state.users
    .filter((u) => u.role === "farmer" && u.status !== "deactivated")
    .sort((a, b) => Number(b.fieldIds.includes(fieldId)) - Number(a.fieldIds.includes(fieldId)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (errors.length) return;
    let id: string | undefined;
    const ok = await run(
      (s) => {
        const r = createTask(s, draft, user.id);
        id = r.taskId;
        return r.state;
      },
      { success: `Task created and assigned to ${state.users.find((u) => u.id === assigneeId)?.name}`, undoable: true },
    );
    if (ok) onDone(id);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="tf-title">Task</Label>
          <TextInput id="tf-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Drip irrigation, 2 hours" aria-invalid={touched && !title.trim()} />
        </div>
        <div>
          <Label htmlFor="tf-type">Type</Label>
          <Select id="tf-type" value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABEL[t].en}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tf-field">Field</Label>
          <Select id="tf-field" value={fieldId} onChange={(e) => setFieldId(e.target.value)} aria-invalid={touched && !fieldId}>
            <option value="">Choose a field…</option>
            {state.farms.map((farm) => (
              <optgroup key={farm.id} label={farm.name}>
                {state.fields
                  .filter((f) => f.farmId === farm.id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.crop})
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tf-assignee" hint={field ? "assigned farmers listed first" : undefined}>
            Assign to
          </Label>
          <Select id="tf-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} aria-invalid={touched && !assigneeId}>
            <option value="">Choose a farmer…</option>
            {farmers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {fieldId && u.fieldIds.includes(fieldId) ? " · assigned here" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tf-priority">Priority</Label>
          <Select id="tf-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2 md:col-span-2">
          <div>
            <Label htmlFor="tf-day">Day</Label>
            <Select id="tf-day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {[0, 1, 2, 3, 4].map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? "Today" : fmtDay(atLocal(state.now, d, 12))}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tf-hour">Start</Label>
            <Select id="tf-hour" value={hour} onChange={(e) => setHour(Number(e.target.value))}>
              {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((h) => (
                <option key={h} value={h}>
                  {h > 12 ? `${h - 12}:00 pm` : h === 12 ? "12:00 pm" : `${h}:00 am`}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tf-duration">Duration</Label>
            <Select id="tf-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((h) => (
                <option key={h} value={h}>
                  {h} hour{h > 1 ? "s" : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="tf-due">Must be finished by</Label>
          <Select id="tf-due" value={dueDays} onChange={(e) => setDueDays(Number(e.target.value))}>
            {[1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {fmtDay(atLocal(state.now, day + d - 1, 20))}, 8:00 pm
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tf-machine" hint="optional">
            Shared machine
          </Label>
          <Select id="tf-machine" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
            <option value="">No machine</option>
            {state.resources
              .filter((r) => r.kind === "machine")
              .map((r) => (
                <option key={r.id} value={r.id} disabled={r.status !== "available"}>
                  {r.name}
                  {r.status !== "available" ? " (out of service)" : ""}
                </option>
              ))}
          </Select>
        </div>
        <div className="grid grid-cols-[1fr_7rem] gap-2 md:col-span-2">
          <div>
            <Label htmlFor="tf-input" hint="optional">
              Material or water
            </Label>
            <Select id="tf-input" value={inputId} onChange={(e) => setInputId(e.target.value)}>
              <option value="">None</option>
              {state.resources
                .filter((r) => r.kind === "input" || r.kind === "water")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.unit})
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tf-qty">Quantity</Label>
            <TextInput id="tf-qty" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ""))} disabled={!inputId} placeholder={inputId ? state.resources.find((r) => r.id === inputId)?.unit : ""} />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="tf-why" hint="shown to the farmer">
            Why this task
          </Label>
          <TextArea id="tf-why" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="e.g. Soil moisture 19%, below the 22% threshold" className="min-h-20" />
        </div>
      </div>

      {(touched ? issues : warnings).length > 0 && (
        <ul className="space-y-1.5" aria-live="polite">
          {(touched ? issues : warnings).map((i) => (
            <li key={i.message} className={cx("flex items-start gap-2 text-sm font-medium", i.level === "error" ? "text-terracotta-ink" : "text-gold-ink")}>
              {i.level === "error" ? <CircleX aria-hidden className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />}
              {i.message}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" icon={Plus} disabled={touched && errors.length > 0}>
          Create and assign
        </Button>
        <Button variant="secondary" onClick={() => onDone()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
