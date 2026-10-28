"use client";

import { useState } from "react";
import { ArrowRight, Ban, Bot, Check, ChevronDown, CloudLightning, MessageSquareWarning, Undo2, Wrench, X } from "lucide-react";
import type { ReplanProposal } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button, Chip, Label, TextArea, cx } from "@/components/ui/primitives";
import { approveProposal, decideProposal } from "@/services/replanner";
import { actorName } from "@/services/audit";
import { ageLabel, fmtRange } from "@/lib/time";
import { CoordinatorPanel } from "./CoordinatorPanel";
import { ScheduleBoard } from "./ScheduleBoard";

/** Before/after review of a replan with an explicit owner decision. */
export function ProposalReview({ proposal }: { proposal: ReplanProposal }) {
  const { state, user, run } = useReadyState();
  const [confirm, setConfirm] = useState(false);
  const [noteFor, setNoteFor] = useState<"rejected" | "revision_requested" | null>(null);
  const [note, setNote] = useState("");
  const [showUnchanged, setShowUnchanged] = useState(false);
  const pending = proposal.status === "pending";
  const moved = proposal.changes.filter((c) => c.after);
  const cancelled = proposal.changes.filter((c) => c.cancel);
  const unresolved = proposal.changes.filter((c) => !c.after && !c.cancel);
  const Icon = proposal.trigger === "weather" ? CloudLightning : proposal.trigger === "coordinator" ? Bot : Wrench;

  const taskLabel = (taskId: string) => {
    const t = state.tasks.find((x) => x.id === taskId);
    if (!t) return { title: taskId, where: "", who: "" };
    const field = state.fields.find((f) => f.id === t.fieldId);
    const farm = state.farms.find((f) => f.id === t.farmId);
    return { title: t.title, where: `${farm?.name}, ${field?.name}`, who: state.users.find((u) => u.id === t.assigneeId)?.name ?? "" };
  };

  return (
    <section
      aria-labelledby={`${proposal.id}-title`}
      className={cx("rounded-panel border bg-surface shadow-panel", pending ? "border-gold" : "border-line")}
    >
      <header className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3.5">
        <span className={cx("grid size-10 shrink-0 place-items-center rounded-control", pending ? "bg-gold-tint text-gold-ink" : "bg-sunken text-ink")}>
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`${proposal.id}-title`} className="text-lg font-semibold">
              {proposal.title}
            </h2>
            {pending ? <Chip tone="gold">Waiting for your approval</Chip> : <Chip tone={proposal.status === "approved" ? "sage" : "neutral"}>{proposal.status.replace("_", " ")}</Chip>}
          </div>
          <p className="mt-0.5 text-ink">{proposal.summary}</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {proposal.trigger === "coordinator"
              ? `Drafted ${ageLabel(proposal.createdAt, state.now)} from an n8n farm coordinator decision, then checked by the Urvara planner (weather limits, machine travel buffer, farmer availability, deadlines).`
              : `Drafted by the Urvara planner ${ageLabel(proposal.createdAt, state.now)} using deterministic rules (weather limits, machine travel buffer, farmer availability, deadlines).`}
            {proposal.decidedBy && ` Decided by ${actorName(state, proposal.decidedBy)}${proposal.decisionNote ? `: “${proposal.decisionNote}”` : "."}`}
          </p>
        </div>
      </header>

      {pending && (
        <div className="border-b border-line px-4 py-4">
          <ScheduleBoard state={state} proposal={proposal} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Proposed changes</caption>
          <thead className="border-b border-line bg-canvas/70 text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">Task</th>
              <th scope="col" className="px-3 py-2 font-semibold">Before</th>
              <th scope="col" className="px-3 py-2 font-semibold">{pending ? "Proposed" : "After"}</th>
              <th scope="col" className="px-4 py-2 font-semibold">Why</th>
            </tr>
          </thead>
          <tbody>
            {proposal.changes.map((c) => {
              const t = taskLabel(c.taskId);
              const machinesBefore = c.before.machineIds.map((id) => state.resources.find((r) => r.id === id)?.name).join(", ");
              const machinesAfter = c.after?.machineIds.map((id) => state.resources.find((r) => r.id === id)?.name).join(", ");
              return (
                <tr key={c.taskId} className={cx("border-b border-line/70 align-top last:border-0", !c.after && !c.cancel && "bg-terracotta-tint/35")}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-strong">{t.title}</p>
                    <p className="text-ink-muted">{t.where}</p>
                    <p className="text-ink-muted">{t.who}</p>
                  </td>
                  <td className="tabular px-3 py-3 text-ink">
                    {fmtRange(c.before.start, c.before.end)}
                    {machinesBefore && <span className="block text-ink-muted">{machinesBefore}</span>}
                  </td>
                  <td className="tabular px-3 py-3">
                    {c.after ? (
                      <span className="flex items-start gap-1.5 font-semibold text-ink-strong">
                        <ArrowRight aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-ink" />
                        <span>
                          {fmtRange(c.after.start, c.after.end)}
                          {machinesAfter && <span className={cx("block font-normal", machinesAfter !== machinesBefore ? "text-gold-ink" : "text-ink-muted")}>{machinesAfter}</span>}
                        </span>
                      </span>
                    ) : c.cancel ? (
                      <Chip tone="neutral" icon={Ban}>
                        {pending ? "Cancel task" : "Cancelled"}
                      </Chip>
                    ) : (
                      <Chip tone="terracotta" icon={MessageSquareWarning}>
                        Needs your decision
                      </Chip>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3 text-ink">
                    {c.reason}
                    {c.unresolved && <span className="mt-1 block font-semibold text-terracotta-ink">{c.unresolved}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {proposal.unchangedTaskIds.length > 0 && (
        <div className="border-t border-line px-4 py-2.5">
          <button type="button" onClick={() => setShowUnchanged((v) => !v)} aria-expanded={showUnchanged} className="inline-flex items-center gap-1 text-sm font-semibold text-forest">
            <ChevronDown aria-hidden className={cx("size-4 transition-transform", showUnchanged && "rotate-180")} />
            {proposal.unchangedTaskIds.length} upcoming tasks stay as planned
          </button>
          {showUnchanged && (
            <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-ink sm:grid-cols-2">
              {proposal.unchangedTaskIds.map((id) => {
                const t = state.tasks.find((x) => x.id === id);
                return t ? (
                  <li key={id} className="flex gap-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-sage-ink" />
                    <span>
                      {t.title} <span className="text-ink-muted">· {fmtRange(t.start, t.end)}</span>
                    </span>
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </div>
      )}

      {(proposal.trigger === "weather" || proposal.trigger === "coordinator") && <CoordinatorPanel proposal={proposal} />}

      {pending && (
        <footer className="border-t border-line bg-canvas/60 px-4 py-3">
          {noteFor ? (
            <div className="max-w-xl">
              <Label htmlFor={`${proposal.id}-note`}>{noteFor === "rejected" ? "Why are you rejecting this plan?" : "What should change?"}</Label>
              <TextArea id={`${proposal.id}-note`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={noteFor === "rejected" ? "e.g. Spray must stay on Thursday; the contractor is booked" : "e.g. Keep the grape spray tomorrow morning, move the urea instead"} />
              <div className="mt-2 flex gap-2">
                <Button
                  variant={noteFor === "rejected" ? "danger" : "primary"}
                  disabled={!note.trim()}
                  onClick={() =>
                    void run((s) => decideProposal(s, proposal.id, noteFor, user.id, note.trim()), {
                      success: noteFor === "rejected" ? "Plan rejected. The schedule is unchanged." : "Revision requested. The schedule is unchanged until you approve a plan.",
                    })
                  }
                >
                  {noteFor === "rejected" ? "Reject plan" : "Send back for revision"}
                </Button>
                <Button variant="secondary" onClick={() => setNoteFor(null)}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button icon={Check} onClick={() => setConfirm(true)}>
                Approve plan
              </Button>
              <Button variant="secondary" icon={Undo2} onClick={() => setNoteFor("revision_requested")}>
                Request revision
              </Button>
              <Button variant="ghost" icon={X} onClick={() => setNoteFor("rejected")}>
                Reject
              </Button>
              <p className="text-sm text-ink-muted sm:ml-auto">Nothing moves until you approve.</p>
            </div>
          )}
        </footer>
      )}

      <ConfirmDialog
        open={confirm}
        title="Approve this schedule change?"
        confirmLabel="Approve and notify farmers"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          void run((s) => approveProposal(s, proposal.id, user.id), {
            success: `Plan approved: ${moved.length} task${moved.length === 1 ? "" : "s"} rescheduled`,
            undoable: true,
          });
        }}
      >
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {moved.length} task{moved.length === 1 ? "" : "s"} move to new slots{moved.some((c) => c.after!.machineIds.join() !== c.before.machineIds.join()) ? ", including shared-machine reassignments" : ""}.
          </li>
          {cancelled.length > 0 && (
            <li>
              {cancelled.length} task{cancelled.length === 1 ? " is" : "s are"} cancelled.
            </li>
          )}
          {unresolved.length > 0 && <li>{unresolved.length} task{unresolved.length === 1 ? " is" : "s are"} flagged for your follow-up; nothing is moved for {unresolved.length === 1 ? "it" : "them"}.</li>}
          <li>Assigned farmers see a “time changed” notice with the reason.</li>
          <li>Every change is written to the task history and audit log.</li>
        </ul>
      </ConfirmDialog>
    </section>
  );
}
