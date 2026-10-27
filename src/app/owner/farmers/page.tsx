"use client";

import { useState, type FormEvent } from "react";
import { Check, ChevronDown, Copy, KeyRound, Save, UserPlus, UserRoundCheck, UserRoundX } from "lucide-react";
import type { Language, User } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, Chip, FieldError, Label, PageHeader, Panel, Select, TextInput, cx } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cropLabel } from "@/data/crops";
import { generateTempCredential, hashCredential } from "@/lib/credentials";
import { LANGUAGE_NAME } from "@/lib/i18n";
import { ageLabel, fmtDayTime, ms } from "@/lib/time";
import { createFarmer, nextLoginId, reissueCredential, setAssignments, setFarmerStatus, validateFarmerDraft, type FarmerDraft } from "@/services/farmers";

function FieldPicker({ value, onChange, idPrefix }: { value: string[]; onChange: (ids: string[]) => void; idPrefix: string }) {
  const { state } = useReadyState();
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {state.farms.map((farm) => (
        <fieldset key={farm.id}>
          <legend className="text-sm font-semibold text-ink-strong">{farm.name}</legend>
          <ul className="mt-1 space-y-1">
            {state.fields
              .filter((f) => f.farmId === farm.id)
              .map((f) => {
                const id = `${idPrefix}-${f.id}`;
                return (
                  <li key={f.id}>
                    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm text-ink">
                      <input
                        id={id}
                        type="checkbox"
                        className="mt-1 size-4 accent-[var(--color-forest)]"
                        checked={value.includes(f.id)}
                        onChange={(e) => onChange(e.target.checked ? [...value, f.id] : value.filter((x) => x !== f.id))}
                      />
                      <span>
                        {f.name} <span className="text-ink-muted">({cropLabel(f.crop)})</span>
                      </span>
                    </label>
                  </li>
                );
              })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}

function AddFarmer({ onDone }: { onDone: () => void }) {
  const { state, user, run, repo, toast } = useReadyState();
  const [draft, setDraft] = useState<FarmerDraft>({ name: "", village: "", language: "hi", fieldIds: [] });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ name: string; loginId: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const errors = validateFarmerDraft(state, draft);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    setBusy(true);
    const loginId = nextLoginId(state);
    const code = generateTempCredential();
    if (repo.source === "live") {
      // Live mode: the Auth account is created server-side with the Admin SDK; the browser never sets roles.
      const { getFirebase } = await import("@/lib/firebase");
      const token = await getFirebase().auth.currentUser?.getIdToken();
      const res = await fetch("/api/farmers", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ ...draft, loginId, password: code }) });
      setBusy(false);
      if (!res.ok) {
        toast({ tone: "error", title: "Farmer not created", body: (await res.json().catch(() => null))?.error ?? "The server could not create the account." });
        return;
      }
      setIssued({ name: draft.name.trim(), loginId, code });
      return;
    }
    const hash = await hashCredential(loginId, code);
    const ok = await run((s) => createFarmer(s, draft, hash, user.id, loginId).state, { success: `${draft.name.trim()} added` });
    setBusy(false);
    if (ok) setIssued({ name: draft.name.trim(), loginId, code });
  }

  if (issued) {
    return (
      <div className="max-w-xl">
        <p className="font-semibold text-ink-strong">Give these details to {issued.name}. The code is shown only once.</p>
        <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-2 rounded-panel border border-gold bg-gold-tint/50 p-4">
          <dt className="text-ink">Login ID</dt>
          <dd className="tabular text-lg font-semibold text-ink-strong">{issued.loginId}</dd>
          <dt className="text-ink">{repo.source === "live" ? "Temporary password" : "One-time code"}</dt>
          <dd className="tabular text-lg font-semibold tracking-wider text-ink-strong">{issued.code}</dd>
        </dl>
        <p className="mt-2 text-sm text-ink">Only a salted hash of the code is stored. If it is lost, issue a new one from the farmer list.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={copied ? Check : Copy}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`Urvara login ID: ${issued.loginId}\nCode: ${issued.code}`);
                setCopied(true);
              } catch {
                toast({ tone: "error", title: "Copy failed", body: "Select and copy the details manually." });
              }
            }}
          >
            {copied ? "Copied" : "Copy details"}
          </Button>
          <Button icon={Check} onClick={onDone}>
            I have shared it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="af-name">Full name</Label>
          <TextInput id="af-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-invalid={touched && !!errors.name} aria-describedby="af-name-err" placeholder="e.g. Meera Patil" />
          <FieldError id="af-name-err">{touched && errors.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="af-village">Village</Label>
          <TextInput id="af-village" value={draft.village} onChange={(e) => setDraft({ ...draft, village: e.target.value })} aria-invalid={touched && !!errors.village} aria-describedby="af-village-err" placeholder="e.g. Ozar" />
          <FieldError id="af-village-err">{touched && errors.village}</FieldError>
        </div>
        <div>
          <Label htmlFor="af-lang">App language</Label>
          <Select id="af-lang" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as Language })}>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
            <option value="en">English</option>
          </Select>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-strong">
          Assign fields <span className="font-normal text-ink-muted">· they will only see these fields and their tasks</span>
        </p>
        <FieldPicker idPrefix="af" value={draft.fieldIds} onChange={(fieldIds) => setDraft({ ...draft, fieldIds })} />
      </div>
      <p className="text-sm text-ink">
        Login ID will be <strong className="tabular font-semibold text-ink-strong">{nextLoginId(state)}</strong>. A one-time code is generated when you save.
      </p>
      <div className="flex gap-2">
        <Button type="submit" icon={UserPlus} loading={busy}>
          Create farmer and issue code
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FarmerRow({ farmer }: { farmer: User }) {
  const { state, user, run, toast } = useReadyState();
  const [open, setOpen] = useState(false);
  const [fieldIds, setFieldIds] = useState(farmer.fieldIds);
  const [confirm, setConfirm] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const fields = state.fields.filter((f) => farmer.fieldIds.includes(f.id));
  const openTasks = state.tasks.filter((t) => t.assigneeId === farmer.id && ["scheduled", "in_progress", "blocked"].includes(t.status));
  const activity = state.auditEvents.filter((e) => e.actorId === farmer.id || e.entity === farmer.id).slice(0, 5);
  const dirty = fieldIds.slice().sort().join() !== farmer.fieldIds.slice().sort().join();
  const deactivated = farmer.status === "deactivated";

  return (
    <li className={cx("border-b border-line/70 last:border-0", deactivated && "bg-sunken/50")}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto_auto]">
        <div className="min-w-0">
          <p className="font-semibold text-ink-strong">
            {farmer.name}
            {farmer.status === "invited" && <Chip tone="gold" className="ml-2 align-[1px]">Invited</Chip>}
            {deactivated && <Chip tone="neutral" className="ml-2 align-[1px]">Deactivated</Chip>}
          </p>
          <p className="tabular text-sm text-ink-muted">
            {farmer.loginId} · {farmer.village} · {LANGUAGE_NAME[farmer.language]}
          </p>
        </div>
        <p className="col-span-2 text-sm text-ink md:col-span-1">
          {fields.length ? fields.map((f) => `${state.farms.find((x) => x.id === f.farmId)?.name.replace(/ Farm$/, "")} · ${f.name.split(" – ")[0]} (${cropLabel(f.crop)})`).join("; ") : <span className="font-semibold text-terracotta-ink">No fields assigned</span>}
        </p>
        <p className="tabular hidden text-sm text-ink md:block">{openTasks.length} open tasks</p>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="row-start-1 md:row-auto" icon={ChevronDown}>
          Manage
        </Button>
      </div>
      {open && (
        <div className="space-y-4 border-t border-line bg-canvas/50 px-4 py-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-strong">Assigned fields</p>
            <FieldPicker idPrefix={`fp-${farmer.id}`} value={fieldIds} onChange={setFieldIds} />
            <Button
              className="mt-3"
              size="sm"
              icon={Save}
              disabled={!dirty}
              onClick={() => void run((s) => setAssignments(s, farmer.id, fieldIds, user.id), { success: `Assignments saved for ${farmer.name}`, undoable: true })}
            >
              Save assignments
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={KeyRound}
              disabled={deactivated}
              onClick={async () => {
                const next = generateTempCredential();
                const hash = await hashCredential(farmer.loginId, next);
                const ok = await run((s) => reissueCredential(s, farmer.id, hash, user.id));
                if (ok) {
                  setCode(next);
                  toast({ tone: "success", title: "New code issued", body: "The previous code no longer works." });
                }
              }}
            >
              Issue new code
            </Button>
            {deactivated ? (
              <Button size="sm" variant="secondary" icon={UserRoundCheck} onClick={() => void run((s) => setFarmerStatus(s, farmer.id, "active", user.id), { success: `${farmer.name} reactivated` })}>
                Reactivate
              </Button>
            ) : (
              <Button size="sm" variant="ghost" icon={UserRoundX} onClick={() => setConfirm(true)}>
                Deactivate
              </Button>
            )}
          </div>
          {code && (
            <p className="rounded-control border border-gold bg-gold-tint/50 px-3 py-2 text-sm text-ink-strong">
              New one-time code for {farmer.loginId}: <strong className="tabular tracking-wider">{code}</strong> (shown once)
            </p>
          )}
          <div>
            <p className="text-sm font-semibold text-ink-strong">Recent activity</p>
            {activity.length === 0 ? (
              <p className="text-sm text-ink">No activity recorded yet.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm text-ink">
                {activity.map((a) => (
                  <li key={a.id}>
                    <span className="tabular text-ink-muted">{ageLabel(a.at, state.now)}</span> · {a.summary}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title={`Deactivate ${farmer.name}?`}
        confirmLabel="Deactivate"
        tone="danger"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          void run((s) => setFarmerStatus(s, farmer.id, "deactivated", user.id), { success: `${farmer.name} deactivated`, undoable: true });
        }}
      >
        They will not be able to sign in. Their {openTasks.length} open task{openTasks.length === 1 ? "" : "s"} stay assigned until you reassign them in Operations. Their records and Rupee Score history are kept.
      </ConfirmDialog>
    </li>
  );
}

export default function FarmersPage() {
  const { state } = useReadyState();
  const [adding, setAdding] = useState(false);
  const farmers = state.users.filter((u) => u.role === "farmer").sort((a, b) => Number(a.status === "deactivated") - Number(b.status === "deactivated") || ms(b.createdAt) - ms(a.createdAt) || a.name.localeCompare(b.name));
  const latest = state.users.filter((u) => u.role === "farmer").sort((a, b) => ms(b.createdAt) - ms(a.createdAt))[0];

  return (
    <>
      <PageHeader
        title="Farmers"
        description="Accounts, field assignments and access. A farmer only sees the fields assigned here, and their own tasks and records."
        actions={
          <Button icon={UserPlus} onClick={() => setAdding(true)} disabled={adding}>
            Add farmer
          </Button>
        }
      />
      {adding && (
        <Panel className="mb-5" title="Add a farmer" description="Creates a login ID and a one-time code. No password is ever stored in plain text.">
          <AddFarmer onDone={() => setAdding(false)} />
        </Panel>
      )}
      <Panel
        title={`${farmers.filter((f) => f.status !== "deactivated").length} active farmers`}
        description={latest ? `Most recent account created ${fmtDayTime(latest.createdAt)}` : undefined}
        bodyClassName="p-0"
      >
        <ul>
          {farmers.map((f) => (
            <FarmerRow key={`${f.id}-${f.fieldIds.join()}`} farmer={f} />
          ))}
        </ul>
      </Panel>
    </>
  );
}
