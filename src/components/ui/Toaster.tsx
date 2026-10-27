"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

export interface ToastInput {
  tone: "success" | "error" | "info";
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
}

export interface ToastItem extends ToastInput {
  id: string;
}

const ICON = { success: CheckCircle2, error: TriangleAlert, info: Info };
const TONE = {
  success: "text-sage-ink",
  error: "text-terracotta-ink",
  info: "text-forest",
};

export function Toaster({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6">
      {items.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-panel border border-line bg-surface p-3.5 shadow-raised"
          >
            <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${TONE[t.tone]}`} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-strong">{t.title}</p>
              {t.body && <p className="mt-0.5 text-sm text-ink">{t.body}</p>}
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick();
                    onDismiss(t.id);
                  }}
                  className="mt-1.5 text-sm font-semibold text-forest underline decoration-forest/40 hover:decoration-forest"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss notification" className="rounded p-0.5 text-ink-muted hover:text-ink-strong">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
