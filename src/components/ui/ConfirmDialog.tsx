"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./primitives";

/**
 * Confirmation for consequential actions only (reassigning shared machinery,
 * committing a schedule change, deactivating an account). Built on <dialog>
 * for native focus trapping and Escape handling.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-panel border border-line bg-surface p-0 text-ink shadow-raised backdrop:bg-ink-strong/40"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-ink-muted hover:text-ink-strong">
          <X className="size-5" />
        </button>
      </div>
      <div className="px-5 py-4 text-[0.9375rem]">{children}</div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} loading={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
