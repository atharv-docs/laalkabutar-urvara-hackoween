/**
 * Pre-decided n8n coordinator demo. The event is fixed so judges always see
 * the same story: the weather service reports heavy rain on Sahyadri Farm
 * tomorrow. Its tasks and machines match the seed. The preset answer is what
 * Urvara uses (labelled as such) when the live webhook call fails.
 */
import type { FarmEvent } from "@/services/farmEvents";

export const DEMO_COORDINATOR_FARM = "farm-01";

export const DEMO_COORDINATOR_EVENT: FarmEvent = {
  eventId: "evt-demo-sahyadri-rain",
  eventType: "WEATHER_CHANGED",
  farmId: DEMO_COORDINATOR_FARM,
  timestamp: "2026-10-28T08:00:00+05:30",
  source: "weather-service",
  data: {
    weather: { condition: "heavy_rain", rainfallMm: 40, from: "2026-10-29", to: "2026-10-29", maxWindKmh: 22, maxRainProb: 90 },
    context: {
      tasks: [
        {
          taskId: "tsk-001",
          farmId: DEMO_COORDINATOR_FARM,
          type: "spraying",
          title: "Fungicide spray – early blight protection",
          date: "2026-10-29",
          start: "2026-10-29T14:00:00+05:30",
          end: "2026-10-29T17:00:00+05:30",
          due: "2026-10-30T18:00:00+05:30",
          priority: "high",
          resourceId: "res-m01",
        },
        {
          taskId: "tsk-011",
          farmId: DEMO_COORDINATOR_FARM,
          type: "irrigation",
          title: "Drip irrigation",
          date: "2026-10-28",
          start: "2026-10-28T17:00:00+05:30",
          end: "2026-10-28T19:00:00+05:30",
          due: "2026-10-28T20:00:00+05:30",
          priority: "medium",
          resourceId: "res-w01",
        },
      ],
      resources: [
        { resourceId: "res-m01", kind: "machine", type: "sprayer", name: "Boom sprayer S-1", status: "available" },
        { resourceId: "res-w01", kind: "water", type: "canal", name: "Kadwa canal allocation", status: "available" },
      ],
      rules: [
        "A new date must be on or before the task's due date.",
        "Rain is expected only on 2026-10-29; 2026-10-30 is dry.",
        "Use only RESCHEDULE_TASK (with newScheduledDate) or CANCEL_TASK. Cancel irrigation that the rain makes unnecessary.",
      ],
    },
  },
};

/** The pre-decided answer, in the webhook's own response shape. */
export const DEMO_COORDINATOR_PRESET = {
  runId: "preset_evt-demo-sahyadri-rain",
  status: "pending_approval",
  summary: "40 mm of rain on 29 Oct: move the fungicide spray to the dry day after, and skip tonight's irrigation because the rain will wet the soil.",
  riskLevel: "medium",
  proposedActions: [
    {
      type: "RESCHEDULE_TASK",
      taskId: "tsk-001",
      newScheduledDate: "2026-10-30",
      resourceId: "res-m01",
      magnitude: "medium",
      description: "Spraying before heavy rain washes the fungicide off. 30 Oct is dry and still before the deadline.",
    },
    {
      type: "CANCEL_TASK",
      taskId: "tsk-011",
      resourceId: "res-w01",
      magnitude: "minor",
      description: "40 mm of rain tomorrow covers the crop's water need; save the canal allocation.",
    },
  ],
  validationResults: { globalIssues: [], actions: [{ valid: true, issues: [] }, { valid: true, issues: [] }] },
  persistence: { saved: false },
};
