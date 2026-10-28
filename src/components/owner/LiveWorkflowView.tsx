"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, CircleAlert, CloudRain, ExternalLink, Play, RotateCcw } from "lucide-react";
import type { CoordinatorReview } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, Chip, PageHeader, Panel, cx } from "@/components/ui/primitives";
import { DEMO_COORDINATOR_EVENT } from "@/data/coordinatorDemo";
import { COORDINATOR_GRAPH, inferPath, type PathStep } from "@/data/n8nWorkflow";
import { chooseDemoReview, proposalFromCoordinator } from "@/services/farmEvents";
import { fmtRange } from "@/lib/time";
import { sendEvent } from "./CoordinatorPanel";
import { ProposalReview } from "./ProposalReview";
import { WorkflowCanvas, type NodeState } from "./WorkflowCanvas";

type Phase = "idle" | "sending" | "replaying" | "done";

const STEP_MS = 420;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Judging page: send the fixed farm event to the live n8n workflow, light up
 * the path its reply shows it took, then see the farm schedule change.
 */
export function LiveWorkflowView() {
  const { state, run } = useReadyState();
  const [phase, setPhase] = useState<Phase>("idle");
  const [path, setPath] = useState<PathStep[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [seconds, setSeconds] = useState<number>();
  const [review, setReview] = useState<CoordinatorReview | null>(null);
  const [callError, setCallError] = useState("");
  const [message, setMessage] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const graph = COORDINATOR_GRAPH;
  const proposal = state.proposals.find((p) => p.trigger === "coordinator");
  const states: Record<string, NodeState> = {};
  if (phase === "sending") states[graph.nodes[0].name] = "waiting";
  path.slice(0, revealed).forEach((s) => (states[s.node] = s.status));
  if (phase === "replaying" && path[revealed]) states[path[revealed].node] = "running";
  const selectedStep = path.slice(0, revealed).find((s) => s.node === selected);

  async function start() {
    const event = { ...DEMO_COORDINATOR_EVENT, eventId: `${DEMO_COORDINATOR_EVENT.eventId}-${Date.now().toString(36)}` };
    setPhase("sending");
    setPath([]);
    setRevealed(0);
    setSelected(undefined);
    setCallError("");
    setMessage("");
    const t0 = performance.now();
    const reply = await sendEvent(event);
    if (!alive.current) return;
    setSeconds((performance.now() - t0) / 1000);
    const chosen = chooseDemoReview(state, reply.review ?? reply.error ?? "The coordinator could not be reached.");
    setReview(chosen);

    const steps = inferPath(event, reply.n8nStatus, reply.raw);
    if (steps) {
      setPath(steps);
      setPhase("replaying");
      for (let i = 0; i < steps.length; i += 1) {
        setRevealed(i);
        await wait(STEP_MS);
        if (!alive.current) return;
      }
      setRevealed(steps.length);
      setSelected(steps.find((s) => s.node.startsWith("AI Agent"))?.node ?? steps[steps.length - 1].node);
    } else setCallError(reply.error ?? "n8n did not answer.");

    let id: string | undefined;
    await run(
      (s) => {
        const r = proposalFromCoordinator(s, chosen);
        id = r.proposalId;
        return r.state;
      },
      { success: chosen.source === "live" ? "n8n answered. The farm schedule change is below." : "Live n8n answer not used; the pre-set answer is below." },
    );
    if (!id) setMessage("These tasks have already moved or finished. Reset the demo scenario to replay.");
    setPhase("done");
  }

  const busy = phase === "sending" || phase === "replaying";
  const ev = DEMO_COORDINATOR_EVENT;

  return (
    <>
      <PageHeader
        title="Live n8n workflow"
        description="A farm event goes to the real n8n workflow. Watch the path it took light up, then see the farm's schedule change in Urvara."
        actions={
          <Button icon={busy ? Bot : Play} variant="gold" disabled={busy || !!proposal} onClick={() => void start()}>
            {phase === "sending" ? "Waiting for n8n…" : phase === "replaying" ? "Showing the run…" : proposal ? "Event already sent" : "Send event to n8n"}
          </Button>
        }
      />

      <Panel
          title={
            <span className="inline-flex flex-wrap items-center gap-2">
              {graph.name}
              {seconds !== undefined && path.length > 0 && <Chip tone="forest">n8n answered in {seconds.toFixed(1)} s</Chip>}
            </span>
          }
          description="Drawn from the workflow's documented structure. n8n reports nothing while it runs, so the path is lit from its reply: which branch ran, and each stage's data. Click a lit node to see it."
        >
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <WorkflowCanvas graph={graph} states={states} selected={selected} onSelect={setSelected} />
          </div>
          {phase === "sending" && (
            <p role="status" className="mt-3 text-sm text-ink">
              Event sent to the n8n webhook. The AI agent and the validator usually take 5–10 seconds…
            </p>
          )}
          {callError && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-terracotta-ink">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {callError}
            </p>
          )}
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel title={<span className="inline-flex items-center gap-2"><CloudRain aria-hidden className="size-4 text-forest" />Event sent</span>}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-ink-muted">Type</dt>
              <dd className="font-semibold text-ink-strong">{ev.eventType}</dd>
              <dt className="text-ink-muted">Farm</dt>
              <dd className="text-ink">{state.farms.find((f) => f.id === ev.farmId)?.name}</dd>
              <dt className="text-ink-muted">Weather</dt>
              <dd className="text-ink">
                {ev.data.weather.condition.replace("_", " ")}, {ev.data.weather.rainfallMm} mm on 29 Oct
              </dd>
              <dt className="text-ink-muted">Tasks</dt>
              <dd className="text-ink">
                {ev.data.context.tasks.map((t) => (
                  <span key={t.taskId} className="block">
                    {t.title} <span className="text-ink-muted">· {fmtRange(t.start, t.end)}</span>
                  </span>
                ))}
              </dd>
            </dl>
          </Panel>

          <Panel title="Path taken" description={path.length ? `${path.length} nodes, worked out from n8n's reply.` : "Each node appears here as the run is shown."}>
            {path.length ? (
              <ol className="space-y-0.5 text-sm">
                {path.slice(0, phase === "replaying" ? revealed + 1 : revealed).map((s, i) => (
                  <li key={s.node}>
                    <button
                      type="button"
                      onClick={() => setSelected(s.node)}
                      className={cx("flex w-full items-center gap-2 rounded-control px-2 py-1 text-left hover:bg-sunken", selected === s.node && "bg-sunken")}
                    >
                      <span aria-hidden className={cx("size-2 shrink-0 rounded-full", i >= revealed ? "bg-gold" : s.status === "success" ? "bg-forest" : "bg-terracotta-ink")} />
                      <span className="min-w-0 flex-1 truncate text-ink-strong">{s.node}</span>
                      {s.status === "error" && <span className="text-xs font-semibold text-terracotta-ink">error</span>}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-muted">No run yet.</p>
            )}
          </Panel>
        </div>
        <Panel
          title={selectedStep ? selectedStep.node : "Node data"}
          description={selectedStep ? (selectedStep.from === "reply" ? "From the reply n8n sent back for this run." : "From the event Urvara sent to the webhook.") : "Click a lit node in the workflow or the path list."}
        >
          {selectedStep ? (
            <pre className="max-h-[28rem] overflow-auto rounded-control bg-sunken p-3 text-xs leading-relaxed text-ink-strong">{JSON.stringify(selectedStep.data, null, 2) ?? "(nothing)"}</pre>
          ) : (
            <p className="text-sm text-ink-muted">Nothing selected yet.</p>
          )}
        </Panel>
      </div>

      <section aria-label="What changed on the farm" className="mt-5 space-y-3">
        {review?.source === "preset" && phase === "done" && (
          <p className="rounded-panel border border-gold bg-gold-tint/50 px-4 py-3 text-sm text-ink">
            The live answer was not used: {review.fallbackReason}. The schedule change below comes from the pre-set demo answer.
          </p>
        )}
        {message && (
          <p role="alert" className="text-sm text-terracotta-ink">
            {message}
          </p>
        )}
        {proposal ? (
          <>
            <ProposalReview proposal={proposal} />
            {proposal.status === "approved" && (
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink">
                Applied. See it on the farm:
                <Link className="inline-flex items-center gap-1 font-semibold text-forest" href="/owner/operations?task=tsk-001">
                  Fungicide spray <ExternalLink aria-hidden className="size-3.5" />
                </Link>
                <Link className="inline-flex items-center gap-1 font-semibold text-forest" href="/owner/operations?task=tsk-011">
                  Drip irrigation <ExternalLink aria-hidden className="size-3.5" />
                </Link>
                <Link className="inline-flex items-center gap-1 font-semibold text-forest" href="/owner/settings">
                  <RotateCcw aria-hidden className="size-3.5" /> Reset to replay
                </Link>
              </p>
            )}
          </>
        ) : (
          phase === "idle" && <p className="text-sm text-ink-muted">After the run, n8n&apos;s plan appears here as a schedule change you can approve.</p>
        )}
      </section>
    </>
  );
}
