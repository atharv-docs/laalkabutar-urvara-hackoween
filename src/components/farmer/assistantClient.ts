/**
 * Asks /api/assistant (Ollama Cloud) for a short spoken reply. Returns null
 * when the assistant is not configured or fails, so the caller can use the
 * rule-based answer instead.
 */
import type { ReplyRequest } from "@/services/replyContext";

export async function askAssistant(req: ReplyRequest): Promise<string | null> {
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { text?: string };
    return body.text?.trim() || null;
  } catch {
    return null;
  }
}
