/**
 * Sends one farm event to the n8n "Autonomous Farm Coordinator" workflow and
 * returns its decision in Urvara's shape. The webhook URL (N8N_FARM_EVENT_URL)
 * stays on the server. The decision is advisory; this route changes nothing.
 */
import { NextResponse } from "next/server";
import { FARM_EVENT_TYPES, checkDeadlines, parseCoordinatorResponse, type FarmEvent } from "@/services/farmEvents";

export const runtime = "nodejs";

/** The AI step takes several seconds per event. */
const TIMEOUT_MS = 60_000;
const MAX_BODY_CHARS = 20_000;
const TYPES = new Set<string>(FARM_EVENT_TYPES);

/** n8n's own reply, trimmed, so the page can show what each stage produced. */
function trimmed(value: unknown): unknown {
  const text = JSON.stringify(value ?? null, (_k, v: unknown) => (typeof v === "string" && v.length > 800 ? `${v.slice(0, 800)}…` : v));
  return text.length > 30_000 ? null : JSON.parse(text);
}

export function GET() {
  return NextResponse.json({ available: Boolean(process.env.N8N_FARM_EVENT_URL) });
}

export async function POST(request: Request) {
  const url = process.env.N8N_FARM_EVENT_URL;
  if (!url) return NextResponse.json({ error: "The farm coordinator is not configured on the server." }, { status: 501 });

  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY_CHARS) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const event = (() => {
    try {
      return JSON.parse(raw) as Partial<FarmEvent>;
    } catch {
      return null;
    }
  })();
  if (
    !event ||
    typeof event.eventId !== "string" ||
    typeof event.farmId !== "string" ||
    typeof event.timestamp !== "string" ||
    !TYPES.has(String(event.eventType)) ||
    !event.data ||
    typeof event.data !== "object"
  ) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ error: "The farm coordinator did not respond." }, { status: 504 });
  }
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    console.error(`n8n farm coordinator failed: ${res.status} ${JSON.stringify(body)}`.slice(0, 500));
    return NextResponse.json(
      { error: res.status === 400 ? "The coordinator rejected the event." : "The coordinator could not finish.", n8nStatus: res.status, raw: trimmed(body) },
      { status: 502 },
    );
  }
  const review = parseCoordinatorResponse(body, event.farmId, event.timestamp);
  if (!review) {
    console.error(`n8n farm coordinator returned an unexpected body: ${JSON.stringify(body)}`.slice(0, 500));
    return NextResponse.json({ error: "The coordinator returned an unexpected answer.", n8nStatus: res.status, raw: trimmed(body) }, { status: 502 });
  }
  const tasks = (event.data as Partial<FarmEvent["data"]>).context?.tasks;
  return NextResponse.json({ review: Array.isArray(tasks) ? checkDeadlines(review, event as FarmEvent) : review, n8nStatus: res.status, raw: trimmed(body) });
}
