import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeedState } from "@/data/seed";
import { simulateMachineBreakdown, simulateWeatherChange } from "@/services/scenario";
import { approveProposal } from "@/services/replanner";
import { detectConflicts } from "@/services/resources";
import { overlaps } from "@/lib/time";
import { ACTIVE_STATUSES } from "@/services/scheduler";
import type { UrvaraState } from "@/types";

function assertNoMachineDoubleBooking(state: UrvaraState) {
  const double = detectConflicts(state).filter((c) => c.kind === "machine_double_booked");
  assert.deepEqual(double, [], "no machine may be in two places at once");
}

test("seed is internally consistent", () => {
  const s = createSeedState();
  assertNoMachineDoubleBooking(s);
  assert.equal(detectConflicts(s).filter((c) => c.kind === "farmer_double_booked").length, 0);
  for (const t of s.tasks) {
    assert.ok(s.fields.some((f) => f.id === t.fieldId && f.farmId === t.farmId), `${t.id} field/farm mismatch`);
    assert.ok(s.users.some((u) => u.id === t.assigneeId), `${t.id} has unknown assignee`);
    const assignee = s.users.find((u) => u.id === t.assigneeId)!;
    assert.ok(assignee.fieldIds.includes(t.fieldId), `${t.id} assignee not assigned to field`);
    for (const m of t.machineIds) assert.ok(s.resources.some((r) => r.id === m), `${t.id} unknown machine`);
  }
  assert.equal(s.farms.length, 6);
  assert.equal(s.fields.length, 12);
  assert.ok(s.scoutingSuggestions.length >= 2, "seeded report produces scouting suggestions");
});

test("seed is deterministic", () => {
  assert.deepEqual(createSeedState(), createSeedState());
});

test("weather change produces an explainable replan that respects constraints", () => {
  const { state, proposalId } = simulateWeatherChange(createSeedState(), "usr-o-001");
  const proposal = state.proposals.find((p) => p.id === proposalId)!;
  assert.ok(proposal, "a proposal is created");
  assert.equal(proposal.status, "pending");
  const changed = proposal.changes.map((c) => c.taskId).sort();
  assert.deepEqual(changed, ["tsk-001", "tsk-004", "tsk-006", "tsk-010", "tsk-017"]);
  for (const c of proposal.changes) assert.ok(c.reason.length > 20 && c.after, `${c.taskId} should be resolved with a reason`);
  assert.ok(proposal.unchangedTaskIds.includes("tsk-007"), "Sinnar wheat sowing is unaffected");
  // Nothing moves until approval.
  assert.equal(state.tasks.find((t) => t.id === "tsk-001")!.start, createSeedState().tasks.find((t) => t.id === "tsk-001")!.start);
  const approved = approveProposal(state, proposal.id, "usr-o-001");
  assertNoMachineDoubleBooking(approved);
  const moved = approved.tasks.find((t) => t.id === "tsk-010")!;
  assert.ok(moved.changeNotice, "farmer sees a change notice");
  assert.ok(moved.history.at(-1)!.text.includes("Reason"));
});

test("sprayer breakdown reassigns where possible and flags the rest", () => {
  const { state: afterWeather, proposalId: wx } = simulateWeatherChange(createSeedState(), "usr-o-001");
  const approved = approveProposal(afterWeather, wx!, "usr-o-001");
  const { state, proposalId } = simulateMachineBreakdown(approved, "usr-o-001");
  const proposal = state.proposals.find((p) => p.id === proposalId)!;
  assert.equal(proposal.trigger, "machine");
  const unresolved = proposal.changes.filter((c) => !c.after);
  const resolved = proposal.changes.filter((c) => c.after);
  assert.ok(resolved.length >= 1, "at least one booking moves to the other sprayer");
  assert.ok(unresolved.length >= 1, "at least one booking needs a human decision");
  for (const c of resolved) assert.ok(!c.after!.machineIds.includes("res-m01"));
  const final = approveProposal(state, proposal.id, "usr-o-001");
  assertNoMachineDoubleBooking(final);
  const flagged = final.tasks.filter((t) => t.needsAttention);
  assert.ok(flagged.length >= 1);
  const s2 = final.tasks.filter((t) => t.machineIds.includes("res-m02") && ACTIVE_STATUSES.includes(t.status));
  for (let i = 0; i < s2.length; i += 1) for (let j = i + 1; j < s2.length; j += 1) assert.ok(!overlaps(s2[i].start, s2[i].end, s2[j].start, s2[j].end));
});
