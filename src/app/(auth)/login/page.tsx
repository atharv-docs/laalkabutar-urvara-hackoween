"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LayoutDashboard, Mic, Smartphone } from "lucide-react";
import { useUrvara } from "@/components/providers/UrvaraProvider";
import { DataSourceBadge, Logo, Wordmark } from "@/components/ui/domain";
import { Button, FieldError, Label, Skeleton, TextInput } from "@/components/ui/primitives";
import { cropLabel } from "@/data/crops";

/** The furrow lines from the Urvara mark, drawn as one quiet field across the brand panel. */
function Furrows() {
  return (
    <svg aria-hidden viewBox="0 0 600 260" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full opacity-[0.16]">
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M ${-40 + i * 70} 260 C ${80 + i * 60} ${150 - i * 4}, ${260 + i * 40} ${70 + i * 6}, ${640} ${40 + i * 26}`} fill="none" stroke="#f6f3e9" strokeWidth={14} strokeLinecap="round" />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const { state, status, repo, session, user, sessionReady, signInAs, signInWithCredential } = useUrvara();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const demo = repo.source === "demo";

  useEffect(() => {
    if (sessionReady && session && user) router.replace(user.role === "owner" ? "/owner" : "/farmer");
  }, [sessionReady, session, user, router]);

  const owner = state?.users.find((u) => u.role === "owner");
  const farmers = state?.users.filter((u) => u.role === "farmer" && u.status !== "deactivated") ?? [];

  async function enter(userId: string, role: "owner" | "farmer") {
    await signInAs(userId);
    router.push(role === "owner" ? "/owner" : "/farmer");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!loginId.trim() || !secret.trim()) {
      setError("Enter both the login ID and the code.");
      return;
    }
    setBusy(true);
    const result = await signInWithCredential(loginId, secret);
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Sign-in failed.");
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="relative overflow-hidden bg-forest px-5 pb-6 pt-6 text-ivory sm:pb-10 sm:pt-8 sm:px-10 lg:flex lg:flex-col lg:px-14 lg:pb-14 lg:pt-12">
        <div className="relative flex items-center gap-3">
          <Logo size={52} ground="dark" />
          <Wordmark tone="light" size="lg" />
        </div>
        <div className="relative mt-5 max-w-xl sm:mt-8 lg:mt-auto">
          <h1 className="text-[1.625rem] font-semibold leading-[1.1] tracking-[-0.02em] text-ivory sm:text-[2.5rem]">Every Farm. Every Resource. In Sync.</h1>
          <p className="mt-4 hidden max-w-lg text-lg leading-relaxed text-ivory/85 sm:block">
            Urvara watches weather, soil, crop reports, machines and people across all your farms, plans the work, and replans when something changes. It shows what changed, why, and what needs your approval.
          </p>
          <p className="mt-2 text-ivory/85 sm:hidden">Plans the work across your farms and replans when weather, machines or crops change.</p>
          <ul className="mt-6 hidden gap-2 text-ivory/90 sm:grid sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <LayoutDashboard aria-hidden className="mt-0.5 size-5 shrink-0 text-gold" />
              <span>
                <strong className="font-semibold text-ivory">Owner Portal</strong>: performance, approvals and coordination
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Mic aria-hidden className="mt-0.5 size-5 shrink-0 text-gold" />
              <span>
                <strong className="font-semibold text-ivory">Farmer Portal</strong>: voice-first, Hindi and English, on any phone
              </span>
            </li>
          </ul>
        </div>
        <p className="relative mt-4 text-sm text-ivory/60 sm:mt-8 lg:mt-12">Built by Laal Kabutar for Hackoween 2026</p>
        <Furrows />
      </section>

      <section className="flex flex-col px-5 py-8 sm:px-10 lg:justify-center lg:px-16">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <DataSourceBadge />
          </div>
          {demo && (
            <p className="mt-2 text-ink">
              Demo mode: choose a seeded account. Everything you see is synthetic data for Nashik district; no real farmers or farms.
            </p>
          )}

          {demo && (
            <>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ink-muted">Owner Portal</h3>
                {status === "loading" || !owner ? (
                  <Skeleton className="mt-2 h-16" />
                ) : (
                  <button
                    type="button"
                    onClick={() => void enter(owner.id, "owner")}
                    className="group mt-2 flex w-full items-center gap-4 rounded-panel border border-line bg-surface p-4 text-left shadow-panel transition-colors hover:border-forest/60"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-control bg-forest text-ivory">
                      <LayoutDashboard aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-strong">{owner.name}</span>
                      <span className="block text-sm text-ink">Farm owner · 6 farms · {owner.loginId}</span>
                    </span>
                    <ArrowRight aria-hidden className="size-5 text-forest transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ink-muted">Farmer Portal</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {status === "loading"
                    ? [0, 1, 2, 3].map((i) => (
                        <li key={i}>
                          <Skeleton className="h-[4.25rem]" />
                        </li>
                      ))
                    : farmers.map((f) => {
                        const crops = [...new Set(state!.fields.filter((x) => f.fieldIds.includes(x.id)).map((x) => cropLabel(x.crop)))];
                        return (
                          <li key={f.id}>
                            <button
                              type="button"
                              onClick={() => void enter(f.id, "farmer")}
                              className="flex w-full items-center gap-3 rounded-panel border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-forest/60"
                            >
                              <Smartphone aria-hidden className="size-5 shrink-0 text-sage-ink" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-ink-strong">{f.name}</span>
                                <span className="block truncate text-sm text-ink">
                                  {f.village} · {crops.join(", ") || "No fields yet"} · {f.language === "hi" ? "हिंदी" : "English"}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                </ul>
              </div>
            </>
          )}

          <form onSubmit={submit} className="mt-8 rounded-panel border border-line bg-surface p-4 shadow-panel" noValidate>
            <div className="flex items-center gap-2">
              <KeyRound aria-hidden className="size-5 text-forest" />
              <h3 className="font-semibold">{demo ? "Have a login ID from the owner?" : "Sign in with your login ID"}</h3>
            </div>
            <p className="mt-1 text-sm text-ink">
              {demo ? "Farmers added in the Owner Portal receive a login ID and a one-time code." : "Use the login ID and password issued by the farm owner."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="login-id">Login ID</Label>
                <TextInput id="login-id" autoComplete="username" placeholder="URV-F-0009" value={loginId} onChange={(e) => setLoginId(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} />
              </div>
              <div>
                <Label htmlFor="login-secret">{demo ? "One-time code" : "Password"}</Label>
                <TextInput
                  id="login-secret"
                  type={demo ? "text" : "password"}
                  autoComplete={demo ? "one-time-code" : "current-password"}
                  placeholder={demo ? "ABCD-EFGH" : ""}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>
            </div>
            <FieldError id="login-error">{error}</FieldError>
            <Button type="submit" className="mt-4" loading={busy} icon={ArrowRight}>
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
