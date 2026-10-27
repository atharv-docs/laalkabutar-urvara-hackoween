import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeedState } from "@/data/seed";
import { parseUtterance } from "@/services/intent";
import { answerQuestion } from "@/services/assistant";
import { assessUnscoredReports } from "@/services/risk";
import { matchCompletionTask, submitReport } from "@/services/reports";
import { computeScore, correctRecord, latestScore, leaderboard, scoreComponents } from "@/services/rupeeScore";
import { createFarmer, setAssignments } from "@/services/farmers";
import { createTask, validateTaskDraft } from "@/services/tasks";
import { hashCredential } from "@/lib/credentials";

const seed = createSeedState();
const ramesh = seed.users.find((u) => u.id === "usr-f-001")!;
const rameshFields = seed.fields.filter((f) => ramesh.fieldIds.includes(f.id));

test("intent: English examples from the brief", () => {
  assert.equal(parseUtterance("My tomato leaves have yellow spots.", rameshFields).kind, "problem");
  const done = parseUtterance("I finished irrigation in Field 2.", rameshFields);
  assert.equal(done.kind, "completion");
  assert.equal(done.fieldId, "fld-02");
  assert.equal(done.taskType, "irrigation");
  const req = parseUtterance("We need another sprayer tomorrow.", rameshFields);
  assert.equal(req.kind, "resource_request");
  assert.equal(req.requestedResource, "Sprayer");
  assert.equal(parseUtterance("When will the tractor reach my farm?", rameshFields).kind, "question");
  assert.equal(parseUtterance("Should we irrigate today?", rameshFields).taskType, "irrigation");
});

test("intent: Hindi phrasing", () => {
  const p = parseUtterance("खेत 2 में टमाटर की पत्तियों पर पीले धब्बे हैं, बहुत फैल रहे हैं", rameshFields);
  assert.equal(p.kind, "problem");
  assert.equal(p.crop, "tomato");
  assert.equal(p.fieldId, "fld-02");
  assert.equal(p.severity, "high");
  assert.equal(parseUtterance("क्या आज सिंचाई करनी चाहिए?", rameshFields).kind, "question");
});

test("assistant answers irrigation question from data with sources", () => {
  const parsed = parseUtterance("Should we irrigate Field 2 today?", rameshFields);
  const a = answerQuestion(seed, ramesh, parsed, "en");
  assert.equal(a.forwarded, false);
  assert.match(a.text, /19%/);
  assert.ok(a.sources.some((s) => s.provenance === "simulated"));
});

test("journey A: problem report is scored by the risk module on the owner side", () => {
  const { state, reportId } = submitReport(
    seed,
    { kind: "problem", inputMode: "typed", fieldId: "fld-02", crop: "tomato", transcript: "yellow spots on tomato leaves", symptom: "Yellow spots on leaves", severity: "medium", language: "en" },
    ramesh.id,
  );
  assert.equal(state.reports.find((r) => r.id === reportId)!.status, "unverified");
  const scored = assessUnscoredReports(state);
  const suggestions = scored.scoutingSuggestions.filter((s) => s.sourceReportId === reportId);
  assert.ok(suggestions.length > 0);
  const top = suggestions[0];
  assert.equal(scored.fields.find((f) => f.id === top.fieldId)!.crop, "tomato");
  assert.equal(top.category, "high");
  assert.ok(top.reasons.some((r) => r.includes("Same crop")));
  // Never ranked against itself, and onion is low.
  assert.ok(!suggestions.some((s) => s.fieldId === "fld-02"));
  assert.ok((suggestions.find((s) => s.fieldId === "fld-03")?.category ?? "low") !== "high");
  assert.equal(assessUnscoredReports(scored), scored, "assessment is idempotent");
});

test("completion report closes the matching task", () => {
  const task = matchCompletionTask(seed, ramesh.id, "fld-02", "irrigation")!;
  assert.equal(task.id, "tsk-011");
  const { state } = submitReport(
    seed,
    { kind: "completion", inputMode: "typed", fieldId: "fld-02", crop: "tomato", transcript: "I finished irrigation in Field 2", severity: "low", language: "en", completesTaskId: task.id },
    ramesh.id,
  );
  assert.equal(state.tasks.find((t) => t.id === "tsk-011")!.status, "done");
});

test("rupee score: not enough data, crop-only leaderboard, corrections append history", () => {
  const paddy = seed.cropSeasons.find((r) => r.crop === "paddy")!;
  assert.equal(computeScore(scoreComponents(paddy)), null);
  const board = leaderboard(seed, "tomato", "Kharif 2026");
  assert.ok(board.every((r) => r.record.crop === "tomato"));
  const cs02 = seed.cropSeasons.find((r) => r.id === "cs-02")!;
  const before = latestScore(seed, cs02.farmerId, "tomato", "Kharif 2026")!;
  const late = cs02.taskLog.find((t) => !t.onTime)!;
  const after = correctRecord(seed, "cs-02", { type: "excuse", taskLogId: late.id, reason: "Sprayer breakdown" }, "Verified with repair log", "usr-o-001");
  const latest = latestScore(after, cs02.farmerId, "tomato", "Kharif 2026")!;
  assert.ok(latest.score! > before.score!, "excusing a late task outside the farmer's control raises the score");
  assert.equal(after.rupeeScoreRecords.length, seed.rupeeScoreRecords.length + 1);
  assert.ok(after.auditEvents[0].summary.includes("→"));
});

test("journey E: farmer creation stores only a hash and scoping follows assignments", async () => {
  const hash = await hashCredential("URV-F-0009", "ABCD-EFGH");
  const { state, user } = createFarmer(seed, { name: "Meera Patil", village: "Ozar", language: "hi", fieldIds: ["fld-05"] }, hash, "usr-o-001");
  assert.equal(user.loginId, "URV-F-0009");
  assert.ok(!JSON.stringify(user).includes("ABCD-EFGH"));
  assert.equal(await hashCredential("urv-f-0009", "abcd-efgh"), hash, "codes are case-insensitive");
  const assigned = setAssignments(state, user.id, ["fld-05", "fld-08"], "usr-o-001");
  assert.deepEqual(assigned.users.find((u) => u.id === user.id)!.farmIds.sort(), ["farm-02", "farm-04"]);
});

test("task validation blocks machine double-booking", () => {
  const busy = seed.tasks.find((t) => t.id === "tsk-004")!;
  const issues = validateTaskDraft(seed, {
    title: "Extra spray",
    type: "spraying",
    fieldId: "fld-05",
    assigneeId: "usr-f-004",
    start: busy.start,
    end: busy.end,
    due: busy.due,
    priority: "low",
    machineIds: ["res-m02"],
    inputs: [],
    rationale: "",
  });
  assert.ok(issues.some((i) => i.level === "error" && i.message.includes("booked")));
  const { state } = createTask(seed, { title: "Weeding", type: "pruning", fieldId: "fld-05", assigneeId: "usr-f-004", start: "2026-10-31T07:00:00+05:30", end: "2026-10-31T09:00:00+05:30", due: "2026-10-31T12:00:00+05:30", priority: "low", machineIds: [], inputs: [], rationale: "" }, "usr-o-001");
  assert.equal(state.tasks.length, seed.tasks.length + 1);
});
