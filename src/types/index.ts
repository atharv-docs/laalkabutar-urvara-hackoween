/**
 * Shared domain types for both portals. Every timestamp is an ISO-8601 string
 * with an explicit offset; every measured value carries its unit and source.
 */

export type Role = "owner" | "farmer";
export type Language = "en" | "hi";

/** Where a value came from. Never render `simulated` or `seeded` values as live. */
export type DataProvenance = "live" | "manual" | "simulated" | "seeded";

export type CropType =
  | "tomato"
  | "chilli"
  | "grapes"
  | "onion"
  | "soybean"
  | "wheat"
  | "sugarcane"
  | "paddy";

export type Season = "Kharif 2025" | "Rabi 2025-26" | "Kharif 2026" | "Rabi 2026-27";

export interface User {
  id: string;
  name: string;
  role: Role;
  /** Unique login identifier shown to the farmer, e.g. URV-F-0003. */
  loginId: string;
  status: "active" | "invited" | "deactivated";
  farmIds: string[];
  fieldIds: string[];
  language: Language;
  village?: string;
  /** Salted SHA-256 of a demo temporary credential. Never plaintext. */
  credentialHash?: string;
  credentialIssuedAt?: string;
  createdAt: string;
}

export interface Farm {
  id: string;
  name: string;
  village: string;
  district: string;
  lat: number;
  lng: number;
  areaAcres: number;
  /** Which seeded forecast cluster applies to this farm. */
  weatherZone: string;
}

export type CropStage =
  | "nursery"
  | "vegetative"
  | "flowering"
  | "fruiting"
  | "bulbing"
  | "pruning"
  | "maturity"
  | "harvest"
  | "sowing";

export interface Field {
  id: string;
  farmId: string;
  name: string;
  crop: CropType;
  stage: CropStage;
  areaAcres: number;
  plantedOn: string;
  soilType: string;
}

export type TaskType =
  | "irrigation"
  | "spraying"
  | "fertiliser"
  | "harvest"
  | "scouting"
  | "sowing"
  | "pruning";

export type TaskStatus =
  | "suggested"
  | "scheduled"
  | "in_progress"
  | "done"
  | "blocked"
  | "cancelled";

export type Priority = "high" | "medium" | "low";

export interface TaskHistoryEntry {
  at: string;
  actor: string;
  text: string;
}

export interface Task {
  id: string;
  title: string;
  /** Hindi title for the Farmer Portal; falls back to `title` when absent. */
  titleHi?: string;
  type: TaskType;
  farmId: string;
  fieldId: string;
  crop: CropType;
  assigneeId: string;
  start: string;
  end: string;
  /** Latest acceptable finish. The scheduler never plans past it. */
  due: string;
  priority: Priority;
  status: TaskStatus;
  machineIds: string[];
  inputs: { resourceId: string; quantity: number }[];
  rationale: string;
  history: TaskHistoryEntry[];
  blockerReason?: string;
  completionNote?: string;
  completedAt?: string;
  /** Set when a replan moved this task and the farmer has not opened it yet. */
  changeNotice?: string;
  needsAttention?: string;
}

export type ResourceKind = "machine" | "input" | "water" | "labour";

export interface Resource {
  id: string;
  kind: ResourceKind;
  name: string;
  /** For machines: sprayer | tractor | harvester. For inputs: fungicide, fertiliser, seed... */
  category: string;
  unit: string;
  quantity: number;
  /** Minimum stock before a shortage is flagged (inputs and water). */
  reorderAt?: number;
  status: "available" | "broken" | "maintenance";
  homeFarmId?: string;
  costPerUnitINR?: number;
  statusNote?: string;
}

export type ReportKind = "problem" | "completion" | "resource_request" | "question" | "condition";
export type Severity = "low" | "medium" | "high";

export interface Report {
  id: string;
  kind: ReportKind;
  /** voice = browser speech transcript; typed = keyboard; demo_sample = seeded sample phrase. */
  inputMode: "voice" | "typed" | "demo_sample";
  reporterId: string;
  farmId: string;
  fieldId: string;
  crop: CropType;
  transcript: string;
  symptom?: string;
  severity: Severity;
  requestedResource?: string;
  createdAt: string;
  observedAt: string;
  status: "unverified" | "reviewed" | "dismissed";
  language: Language;
  answer?: string;
  reviewNote?: string;
  /** Set once the crop-risk module has scored nearby fields for this report. */
  riskAssessedAt?: string;
}

export type SensorKind = "moisture" | "ph" | "nitrogen" | "phosphorus" | "potassium" | "ec";

export interface SensorReading {
  id: string;
  fieldId: string;
  kind: SensorKind;
  value: number;
  unit: string;
  at: string;
  source: DataProvenance;
}

/** One forecast block (e.g. 06:00–12:00) for a weather zone. */
export interface ForecastBlock {
  start: string;
  end: string;
  tempC: number;
  humidity: number;
  rainProb: number;
  rainMm: number;
  windKmh: number;
  windDir: string;
}

export interface WeatherSnapshot {
  id: string;
  zone: string;
  zoneLabel: string;
  issuedAt: string;
  provider: string;
  source: DataProvenance;
  blocks: ForecastBlock[];
  /** Local station reading, kept apart from the regional forecast. */
  local: { at: string; tempC: number; humidity: number; windKmh: number; source: DataProvenance };
}

export interface CropSeasonRecord {
  id: string;
  farmerId: string;
  fieldId: string;
  farmId: string;
  crop: CropType;
  season: Season;
  areaAcres: number;
  expectedYieldQ: number | null;
  actualYieldQ: number | null;
  qualityGrade: "A" | "B" | "C" | null;
  inputCostINR: number | null;
  pricePerQINR: number | null;
  taskLog: TaskLogEntry[];
  incidents: { id: string; label: string; reportedWithinHours: number; resolved: boolean }[];
  annotations: { at: string; by: string; text: string }[];
}

export interface TaskLogEntry {
  id: string;
  label: string;
  onTime: boolean;
  verified: boolean;
  /** Late for reasons outside the farmer's control (weather, machine, input). Not counted against them. */
  excusedReason?: string;
}

export interface ScoreComponent {
  key: "timeliness" | "yield" | "quality" | "health" | "efficiency";
  label: string;
  weight: number;
  /** 0–100, or null when there is not enough data. */
  value: number | null;
  detail: string;
  /** Hindi rendering of `detail` for the Farmer Portal. */
  detailHi?: string;
  sources: string[];
}

export interface RupeeScoreRecord {
  id: string;
  farmerId: string;
  crop: CropType;
  season: Season;
  /** 0–100 index. Not a rupee amount. Null when not enough data. */
  score: number | null;
  components: ScoreComponent[];
  at: string;
  reason: string;
  /** Hindi rendering of `reason` for system-written notes; owner-typed notes stay as written. */
  reasonHi?: string;
}

export interface ScheduleChange {
  taskId: string;
  before: { start: string; end: string; machineIds: string[] };
  after: { start: string; end: string; machineIds: string[] } | null;
  reason: string;
  resourcesAffected: string[];
  /** Set when no safe slot exists before the deadline. */
  unresolved?: string;
}

export interface ReplanProposal {
  id: string;
  trigger: "weather" | "machine" | "manual";
  title: string;
  summary: string;
  createdAt: string;
  changes: ScheduleChange[];
  unchangedTaskIds: string[];
  requiresApproval: boolean;
  status: "pending" | "approved" | "rejected" | "revision_requested";
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
}

export interface ScoutingSuggestion {
  id: string;
  sourceReportId: string;
  farmId: string;
  fieldId: string;
  score: number;
  category: "high" | "medium" | "low";
  reasons: string[];
  createdAt: string;
  status: "suggested" | "task_created" | "dismissed";
  taskId?: string;
  alertedAt?: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  action: string;
  entity: string;
  summary: string;
}

export interface ScenarioFlags {
  weatherChanged: boolean;
  brokenMachineIds: string[];
}

export interface UrvaraState {
  schemaVersion: number;
  /** The demo clock. All "now" logic reads this so the story is repeatable. */
  now: string;
  users: User[];
  farms: Farm[];
  fields: Field[];
  tasks: Task[];
  resources: Resource[];
  reports: Report[];
  sensorReadings: SensorReading[];
  weather: WeatherSnapshot[];
  cropSeasons: CropSeasonRecord[];
  rupeeScoreRecords: RupeeScoreRecord[];
  proposals: ReplanProposal[];
  scoutingSuggestions: ScoutingSuggestion[];
  auditEvents: AuditEvent[];
  scenario: ScenarioFlags;
}

export type CollectionName = Exclude<keyof UrvaraState, "schemaVersion" | "now" | "scenario">;
