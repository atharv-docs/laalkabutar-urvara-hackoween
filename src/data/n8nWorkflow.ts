/**
 * The n8n "Autonomous Farm Coordinator" workflow, drawn from its documented
 * structure (workflow wVLDZXQPezeB328W). Without n8n API access the page cannot
 * read the live graph or per-node execution data, so the path a run took is
 * worked out from the webhook's reply, and each node shows the part of that
 * reply (or of the event Urvara sent) that it is responsible for.
 */
import type { N8nGraph } from "@/types";
import type { FarmEvent } from "@/services/farmEvents";

export const WORKFLOW_ID = "wVLDZXQPezeB328W";

export const N = {
  webhook: "Webhook",
  normalize: "Edit Fields (Normalize)",
  validateEvent: "Code — Validate Event",
  invalid: "Respond — Invalid Event",
  route: "Switch — Route Event",
  weather: "Weather analysis prompt",
  irrigation: "Irrigation planning prompt",
  cropRisk: "Crop-risk assessment prompt",
  reallocation: "Resource reallocation prompt",
  verification: "Verification & learning prompt",
  agent: "AI Agent — Farm Decision Analyst",
  model: "Ollama Chat Model",
  parser: "Structured Plan Parser",
  fallback: "Set — AI Failure Fallback",
  validatePlan: "Code — Validate Proposed Plan",
  approvalIf: "IF — Owner Approval Needed?",
  approval: "Owner Approval — PLACEHOLDER",
  notRequired: "Set — Approval Not Required",
  record: "Code — Record Decision",
  row: "Code — Prepare Table Row",
  save: "Data Table — Save Decision",
  respond: "Respond to Webhook — Decision",
  persistFailed: "Respond — Persistence Failed",
} as const;

const node = (name: string, type: string, x: number, y: number) => ({ name, type, x, y });
const main = (from: string, to: string, output = 0) => ({ from, to, kind: "main", output });

/** Two rows: intake and AI on top, validation, approval and saving below. */
export const COORDINATOR_GRAPH: N8nGraph = {
  id: WORKFLOW_ID,
  name: "Urvara AI — Autonomous Farm Coordinator",
  active: true,
  nodes: [
    node(N.webhook, "webhook", 0, 0),
    node(N.normalize, "set", 220, 0),
    node(N.validateEvent, "code", 440, 0),
    node(N.invalid, "respondToWebhook", 440, 190),
    node(N.route, "switch", 660, 0),
    node(N.weather, "set", 880, -240),
    node(N.irrigation, "set", 880, -120),
    node(N.cropRisk, "set", 880, 0),
    node(N.reallocation, "set", 880, 120),
    node(N.verification, "set", 880, 240),
    node(N.agent, "agent", 1100, 0),
    node(N.model, "lmChatOllama", 1010, 190),
    node(N.parser, "outputParserStructured", 1200, 190),
    node(N.fallback, "set", 220, 470),
    node(N.validatePlan, "code", 0, 620),
    node(N.approvalIf, "if", 220, 620),
    node(N.approval, "set", 440, 540),
    node(N.notRequired, "set", 440, 700),
    node(N.record, "code", 660, 620),
    node(N.row, "code", 880, 620),
    node(N.save, "dataTable", 1100, 620),
    node(N.respond, "respondToWebhook", 1320, 540),
    node(N.persistFailed, "respondToWebhook", 1320, 700),
  ],
  edges: [
    main(N.webhook, N.normalize),
    main(N.normalize, N.validateEvent),
    main(N.validateEvent, N.route, 0),
    main(N.validateEvent, N.invalid, 1),
    main(N.route, N.weather, 0),
    main(N.route, N.irrigation, 1),
    main(N.route, N.cropRisk, 2),
    main(N.route, N.reallocation, 3),
    main(N.route, N.verification, 4),
    main(N.weather, N.agent),
    main(N.irrigation, N.agent),
    main(N.cropRisk, N.agent),
    main(N.reallocation, N.agent),
    main(N.verification, N.agent),
    { from: N.model, to: N.agent, kind: "ai_languageModel", output: 0 },
    { from: N.parser, to: N.agent, kind: "ai_outputParser", output: 0 },
    main(N.agent, N.validatePlan, 0),
    main(N.agent, N.fallback, 1),
    main(N.fallback, N.record),
    main(N.validatePlan, N.approvalIf),
    main(N.approvalIf, N.approval, 0),
    main(N.approvalIf, N.notRequired, 1),
    main(N.approval, N.record),
    main(N.notRequired, N.record),
    main(N.record, N.row),
    main(N.row, N.save),
    main(N.save, N.respond, 0),
    main(N.save, N.persistFailed, 1),
  ],
};

const PROMPT_FOR: Record<FarmEvent["eventType"], string> = {
  WEATHER_CHANGED: N.weather,
  IRRIGATION_NEEDED: N.irrigation,
  CROP_RISK: N.cropRisk,
  RESOURCE_CHANGED: N.reallocation,
  TASK_VERIFICATION: N.verification,
};

export interface PathStep {
  node: string;
  status: "success" | "error";
  /** What this node handled, from the reply or the event. */
  data: unknown;
  /** Where `data` comes from. */
  from: "event" | "reply";
}

type Reply = Record<string, unknown>;

/**
 * The nodes a run went through, in order, worked out from the HTTP status and
 * body the webhook answered with. Null when there is no n8n reply to read.
 */
export function inferPath(event: FarmEvent, n8nStatus: number | undefined, raw: unknown): PathStep[] | null {
  if (!n8nStatus || !raw || typeof raw !== "object") return null;
  const r = raw as Reply;
  const ok = (node: string, data: unknown, from: PathStep["from"] = "reply"): PathStep => ({ node, status: "success", data, from });
  const steps: PathStep[] = [
    ok(N.webhook, event, "event"),
    ok(N.normalize, { ...event, timestamp: event.timestamp, source: event.source }, "event"),
  ];
  if (n8nStatus === 400) {
    steps.push({ node: N.validateEvent, status: "error", data: r, from: "reply" }, ok(N.invalid, r));
    return steps;
  }
  steps.push(ok(N.validateEvent, { valid: true, eventType: event.eventType }, "event"), ok(N.route, { route: event.eventType }, "event"));
  steps.push(ok(PROMPT_FOR[event.eventType], { weather: event.data.weather, tasks: event.data.context.tasks.length, resources: event.data.context.resources.length }, "event"));

  const record = (r.decisionRecord && typeof r.decisionRecord === "object" ? r.decisionRecord : r) as Reply;
  const validation = (record.validationResults ?? {}) as { globalIssues?: unknown[] };
  const aiFailed = (validation.globalIssues ?? []).some((i) => /AI (analysis|agent) failed/i.test(typeof i === "string" ? i : JSON.stringify(i)));
  const plan = { summary: record.summary, riskLevel: record.riskLevel, proposedActions: record.proposedActions };
  if (aiFailed) {
    steps.push(ok(N.model, { note: "Called by the AI agent" }), { node: N.agent, status: "error", data: validation.globalIssues, from: "reply" }, ok(N.fallback, { status: record.status, summary: record.summary }));
  } else {
    steps.push(ok(N.model, { note: "Called by the AI agent" }), ok(N.parser, plan), ok(N.agent, plan), ok(N.validatePlan, record.validationResults));
    const needsApproval = record.status === "pending_approval";
    steps.push(ok(N.approvalIf, { requiresOwnerApproval: needsApproval }));
    steps.push(needsApproval ? ok(N.approval, { approvalStatus: record.approvalStatus, approvalNote: record.approvalNote }) : ok(N.notRequired, { status: record.status }));
  }
  steps.push(ok(N.record, { runId: record.runId, status: record.status, summary: record.summary }));
  steps.push(ok(N.row, { run_id: record.runId, event_id: event.eventId, farm_id: event.farmId, event_type: event.eventType, status: record.status }));
  const persistence = (r.persistence ?? record.persistence) as { saved?: boolean } | undefined;
  if (n8nStatus === 502 || persistence?.saved === false) {
    steps.push({ node: N.save, status: "error", data: persistence ?? r, from: "reply" }, ok(N.persistFailed, r));
  } else {
    steps.push(ok(N.save, persistence), ok(N.respond, r));
  }
  return steps;
}
