"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, CircleAlert, CircleCheck, Database, RefreshCw } from "lucide-react";
import type { CoordinatorReview, ReplanProposal } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, Chip, cx, type Tone } from "@/components/ui/primitives";
import { attachCoordinatorReviews, buildWeatherEvents, type FarmEvent } from "@/services/farmEvents";
import { fmtDay } from "@/lib/time";

/** Proposals already sent this session, so a remount does not send the same events twice. */
const sent = new Set<string>();

let availability: Promise<boolean> | null = null;
function coordinatorAvailable(): Promise<boolean> {
  availability ??= fetch("/api/farm-events", { cache: "no-store" })
    .then((r) => r.json() as Promise<{ available?: boolean }>)
    .then((b) => Boolean(b.available))
    .catch(() => false);
  return availability;
}

export interface EventReply {
  review?: CoordinatorReview;
  error?: string;
  /** HTTP status n8n answered with, when it answered. */
  n8nStatus?: number;
  /** n8n's reply body, trimmed by the server. */
  raw?: unknown;
}

export async function sendEvent(event: FarmEvent): Promise<EventReply> {
  try {
    const res = await fetch("/api/farm-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) });
    const body = (await res.json().catch(() => null)) as EventReply | null;
    return body?.review ? body : { ...body, error: body?.error ?? "The coordinator could not be reached." };
  } catch {
    return { error: "The coordinator could not be reached." };
  }
}

const STATUS: Record<CoordinatorReview["status"], { label: string; tone: Tone }> = {
  proposed: { label: "No approval needed", tone: "sage" },
  pending_approval: { label: "Needs owner approval", tone: "gold" },
  rejected: { label: "No usable plan", tone: "terracotta" },
};

const humanise = (type: string) => type.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/**
 * The n8n farm coordinator's decision. On a weather replan it is a second
 * opinion (one live run per affected farm, advisory only). On a coordinator
 * proposal it is the source of the changes above, shown read-only.
 */
export function CoordinatorPanel({ proposal }: { proposal: ReplanProposal }) {
  const { state, run } = useReadyState();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ farmId: string; error: string }[]>([]);
  const reviews = proposal.coordinator ?? [];
  const advisory = proposal.trigger === "weather";

  const ask = useCallback(async () => {
    const events = buildWeatherEvents(state, proposal);
    if (!events.length) return;
    sent.add(proposal.id);
    setBusy(true);
    setErrors([]);
    const results = await Promise.all(events.map(sendEvent));
    const ok = results.flatMap((r) => (r.review ? [r.review] : []));
    setErrors(results.flatMap((r, i) => (r.review ? [] : [{ farmId: events[i].farmId, error: r.error ?? "" }])));
    if (ok.length) await run((s) => attachCoordinatorReviews(s, proposal.id, ok));
    setBusy(false);
  }, [state, proposal, run]);

  useEffect(() => {
    let live = true;
    void coordinatorAvailable().then((yes) => {
      if (!live) return;
      setAvailable(yes);
      // The forecast change is the event: send it once, as soon as the replan exists.
      if (yes && advisory && proposal.status === "pending" && !proposal.coordinator?.length && !sent.has(proposal.id)) void ask();
    });
    return () => {
      live = false;
    };
  }, [proposal.id, proposal.status, proposal.coordinator?.length, advisory, ask]);

  if ((available === false || !advisory) && !reviews.length) return null;

  const farmName = (id: string) => state.farms.find((f) => f.id === id)?.name ?? id;
  const taskTitle = (id?: string) => (id ? (state.tasks.find((t) => t.id === id)?.title ?? id) : "");
  const machineName = (id?: string) => (id ? (state.resources.find((r) => r.id === id)?.name ?? id) : "");

  return (
    <div className="border-t border-line px-4 py-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-forest-tint text-forest">
          <Bot aria-hidden className="size-5" />
        </span>
        <div className="min-w-56 flex-1">
          <h3 className="font-semibold text-ink-strong">{advisory ? "Second opinion: n8n farm coordinator" : "What the n8n farm coordinator decided"}</h3>
          <p className="text-sm text-ink-muted">
            {advisory
              ? "Live run of the n8n workflow: an AI agent drafts a plan per farm and a rule-based validator checks it against the tasks and machines sent. Advisory only. Approving above applies Urvara's plan, not this one."
              : "The changes above come from this decision. Urvara re-checked each one against machine bookings, the farmer's other work, the forecast and the deadline before offering it."}
          </p>
        </div>
        {advisory && available && proposal.status === "pending" && (
          <Button variant="secondary" size="sm" icon={RefreshCw} disabled={busy} onClick={() => void ask()}>
            {reviews.length ? "Ask again" : "Ask coordinator"}
          </Button>
        )}
      </div>

      {busy && (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm text-ink">
          <RefreshCw aria-hidden className="size-4 animate-spin text-forest motion-reduce:animate-none" />
          Sending the forecast change to the coordinator. Each farm takes about 10 seconds.
        </p>
      )}

      {errors.map((e) => (
        <p key={e.farmId} role="alert" className="mt-3 flex items-start gap-2 text-sm text-terracotta-ink">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {farmName(e.farmId)}: {e.error}
        </p>
      ))}

      {reviews.length > 0 && (
        <ul className="mt-3 grid gap-3 lg:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.farmId} className="rounded-control border border-line bg-canvas/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink-strong">{farmName(r.farmId)}</p>
                <Chip tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Chip>
                {r.source === "preset" ? <Chip tone="gold">Pre-set demo answer</Chip> : <Chip tone="forest">Live n8n run</Chip>}
                {r.riskLevel && <Chip>Risk {r.riskLevel}</Chip>}
                {r.actions.some((a) => !a.valid) && (
                  <Chip tone="terracotta">
                    {r.actions.filter((a) => !a.valid).length} of {r.actions.length} actions fail checks
                  </Chip>
                )}
              </div>
              {r.fallbackReason && <p className="mt-1.5 text-sm text-gold-ink">Live call not used: {r.fallbackReason}. This answer was written in advance for the demo.</p>}
              {r.summary && <p className="mt-1.5 text-sm text-ink">{r.summary}</p>}
              {r.actions.length > 0 && (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {r.actions.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      {a.valid ? (
                        <CircleCheck aria-label="Passed validation" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
                      ) : (
                        <CircleAlert aria-label="Failed validation" className="mt-0.5 size-4 shrink-0 text-terracotta-ink" />
                      )}
                      <span className="min-w-0">
                        <span className="font-semibold text-ink-strong">{humanise(a.type)}</span>
                        {a.taskId && <span className="text-ink"> · {taskTitle(a.taskId)}</span>}
                        {a.newDate && /^\d{4}-\d{2}-\d{2}/.test(a.newDate) && a.type !== "CANCEL_TASK" && <span className="tabular text-ink"> → {fmtDay(`${a.newDate.slice(0, 10)}T12:00:00+05:30`)}</span>}
                        {a.resourceId && <span className="text-ink-muted"> · {machineName(a.resourceId)}</span>}
                        {a.description && <span className="block text-ink-muted">{a.description}</span>}
                        {a.issues.map((issue) => (
                          <span key={issue} className="block text-terracotta-ink">
                            {issue}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {r.issues.map((issue) => (
                <p key={issue} className="mt-1.5 text-sm text-terracotta-ink">
                  {issue}
                </p>
              ))}
              <p className={cx("mt-2 break-all text-xs", r.saved ? "text-ink-muted" : "text-terracotta-ink")}>
                <Database aria-hidden className="mr-1.5 inline size-3.5 align-[-2px]" />
                {r.source === "preset" ? "Not from n8n" : r.saved ? "Saved to n8n table farm_decisions" : "Not saved in n8n"} · <span className="tabular">{r.runId}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
