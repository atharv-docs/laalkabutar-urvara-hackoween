import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeedState } from "@/data/seed";
import { simulateWeatherChange } from "@/services/scenario";
import { attachCoordinatorReviews, buildWeatherEvents, checkDeadlines, parseCoordinatorResponse } from "@/services/farmEvents";

test("forecast change becomes one valid event per affected farm", () => {
  const { state, proposalId } = simulateWeatherChange(createSeedState(), "usr-o-001");
  const proposal = state.proposals.find((p) => p.id === proposalId)!;
  const events = buildWeatherEvents(state, proposal);
  assert.ok(events.length > 0, "the storm affects at least one farm");
  for (const e of events) {
    assert.equal(e.eventType, "WEATHER_CHANGED");
    assert.ok(state.farms.some((f) => f.id === e.farmId));
    assert.ok(e.data.weather.rainfallMm > 0);
    const resourceIds = new Set(e.data.context.resources.map((r) => r.resourceId));
    for (const t of e.data.context.tasks) {
      assert.equal(state.tasks.find((x) => x.id === t.taskId)?.farmId, e.farmId, "no cross-farm tasks");
      if (t.resourceId) assert.ok(resourceIds.has(t.resourceId), "every task's machine is in the context");
    }
  }
  // Unchanged seed (no rain) sends nothing.
  assert.equal(buildWeatherEvents(createSeedState(), proposal).length, 0);
});

test("coordinator response is read defensively and attached as advice", () => {
  const body = {
    runId: "run_x_evt-1",
    status: "pending_approval",
    summary: "Rain on 29 Oct: move the spray.",
    proposedActions: [
      { type: "RESCHEDULE_TASK", taskId: "t1", newScheduledDate: "2026-10-31", resourceId: "m1", description: "Move it", validationIssues: [] },
      { type: "CANCEL_TASK", taskId: "nope", description: "Cancel", validationIssues: ["Unknown taskId"] },
    ],
    validationResults: { globalIssues: [], actions: [{ valid: true, issues: [] }, { valid: false, issues: ["Unknown taskId"] }] },
    persistence: { saved: true },
  };
  const r = parseCoordinatorResponse(body, "farm-1", "2026-10-28T08:00:00+05:30")!;
  assert.equal(r.status, "pending_approval");
  assert.equal(r.actions[0].valid, true);
  assert.deepEqual(r.actions[1].issues, ["Unknown taskId"]);
  assert.equal(r.actions[1].valid, false);
  assert.equal(r.saved, true);
  assert.equal(parseCoordinatorResponse({ decisionRecord: body }, "farm-1", "x")?.runId, "run_x_evt-1");
  assert.equal(parseCoordinatorResponse({ status: "done" }, "farm-1", "x"), null);
  assert.equal(parseCoordinatorResponse("oops", "farm-1", "x"), null);

  const { state, proposalId } = simulateWeatherChange(createSeedState(), "usr-o-001");
  const tasksBefore = JSON.stringify(state.tasks);
  const next = attachCoordinatorReviews(state, proposalId!, [r]);
  assert.equal(next.proposals.find((p) => p.id === proposalId)?.coordinator?.length, 1);
  assert.equal(JSON.stringify(next.tasks), tasksBefore, "advice never moves a task");
});

test("a move past the task's deadline is flagged even when the workflow passed it", () => {
  const { state, proposalId } = simulateWeatherChange(createSeedState(), "usr-o-001");
  const event = buildWeatherEvents(state, state.proposals.find((p) => p.id === proposalId)!)[0];
  const task = event.data.context.tasks[0];
  const review = parseCoordinatorResponse(
    { runId: "r", status: "proposed", proposedActions: [{ type: "RESCHEDULE_TASK", taskId: task.taskId, newScheduledDate: "2099-01-01" }, { type: "RESCHEDULE_TASK", taskId: task.taskId, newScheduledDate: task.date }], validationResults: { actions: [{ valid: true }, { valid: true }] } },
    event.farmId,
    event.timestamp,
  )!;
  const checked = checkDeadlines(review, event);
  assert.equal(checked.actions[0].valid, false);
  assert.match(checked.actions[0].issues[0], /deadline/);
  assert.equal(checked.actions[1].valid, true);
  assert.equal(checked.status, "pending_approval");
});

test("the pre-set coordinator answer becomes a replan that moves and cancels tasks on approval", async () => {
  const { DEMO_COORDINATOR_EVENT, DEMO_COORDINATOR_PRESET } = await import("@/data/coordinatorDemo");
  const { proposalFromCoordinator } = await import("@/services/farmEvents");
  const { approveProposal } = await import("@/services/replanner");
  const seed = createSeedState();
  // The fixed event must describe the seed as it is.
  for (const t of DEMO_COORDINATOR_EVENT.data.context.tasks) {
    const task = seed.tasks.find((x) => x.id === t.taskId)!;
    assert.equal(task.start, t.start);
    assert.equal(task.due, t.due);
    assert.equal(task.farmId, DEMO_COORDINATOR_EVENT.farmId);
  }
  const review = { ...checkDeadlines(parseCoordinatorResponse(DEMO_COORDINATOR_PRESET, "farm-01", seed.now)!, DEMO_COORDINATOR_EVENT), source: "preset" as const };
  const { state, proposalId, skipped } = proposalFromCoordinator(seed, review);
  assert.deepEqual(skipped, []);
  const approved = approveProposal(state, proposalId!, "usr-o-001");
  const spray = approved.tasks.find((t) => t.id === "tsk-001")!;
  assert.ok(spray.start.startsWith("2026-10-30"), `spray moved to 30 Oct, got ${spray.start}`);
  assert.ok(spray.end <= spray.due);
  assert.ok(spray.changeNotice);
  assert.equal(approved.tasks.find((t) => t.id === "tsk-011")!.status, "cancelled");
  assert.equal(approved.proposals.find((p) => p.id === proposalId)!.status, "approved");
});

test("the n8n path is worked out from the webhook's reply", async () => {
  const { DEMO_COORDINATOR_EVENT: e } = await import("@/data/coordinatorDemo");
  const { COORDINATOR_GRAPH, N, inferPath } = await import("@/data/n8nWorkflow");
  const names = new Set(COORDINATOR_GRAPH.nodes.map((n) => n.name));
  for (const edge of COORDINATOR_GRAPH.edges) assert.ok(names.has(edge.from) && names.has(edge.to), `${edge.from} → ${edge.to}`);

  const approval = inferPath(e, 200, { runId: "r", status: "pending_approval", proposedActions: [], validationResults: { globalIssues: [] }, persistence: { saved: true } })!;
  const nodes = approval.map((s) => s.node);
  assert.ok(nodes.includes(N.weather) && nodes.includes(N.approval) && nodes.includes(N.respond));
  assert.ok(!nodes.includes(N.notRequired) && !nodes.includes(N.fallback));
  for (const n of nodes) assert.ok(names.has(n), n);

  const aiFailed = inferPath(e, 200, { runId: "r", status: "rejected", validationResults: { globalIssues: ["AI analysis failed: AI agent failed or returned unusable output"] }, persistence: { saved: true } })!;
  assert.equal(aiFailed.find((s) => s.node === N.agent)?.status, "error");
  assert.ok(aiFailed.some((s) => s.node === N.fallback));

  assert.ok(inferPath(e, 400, { error: "bad" })!.some((s) => s.node === N.invalid));
  assert.ok(inferPath(e, 502, { status: "persistence_failed" })!.some((s) => s.node === N.persistFailed));
  assert.equal(inferPath(e, undefined, undefined), null);
});
