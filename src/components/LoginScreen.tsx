"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, KeyRound, LayoutDashboard, Mic } from "lucide-react";
import type { Role } from "@/types";
import { useUrvara } from "@/components/providers/UrvaraProvider";
import { DataSourceBadge, Logo, Wordmark } from "@/components/ui/domain";
import { Button, FieldError, Label, TextInput } from "@/components/ui/primitives";

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

const COPY: Record<Role, { title: string; hint: string; placeholder: string; switchLabel: string; switchHref: string }> = {
  farmer: {
    title: "Farmer sign in",
    hint: "Use the login ID and password from the farm owner. Farmers added later use their one-time code as the password.",
    placeholder: "URV-F-0001",
    switchLabel: "Farm owner? Sign in to the Owner Portal",
    switchHref: "/login/owner",
  },
  owner: {
    title: "Owner sign in",
    hint: "Sign in to the Owner Portal with your owner login ID and password.",
    placeholder: "URV-O-0001",
    switchLabel: "Back to farmer sign in",
    switchHref: "/login",
  },
};

export function LoginScreen({ role }: { role: Role }) {
  const { session, user, sessionReady, signInWithCredential } = useUrvara();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = COPY[role];

  useEffect(() => {
    if (sessionReady && session && user) router.replace(user.role === "owner" ? "/owner" : "/farmer");
  }, [sessionReady, session, user, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!loginId.trim() || !secret.trim()) {
      setError("Enter both the login ID and the password.");
      return;
    }
    setBusy(true);
    const result = await signInWithCredential(loginId, secret, role);
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
        <div className="mx-auto w-full max-w-md">
          <form onSubmit={submit} className="rounded-panel border border-line bg-surface p-5 shadow-panel" noValidate>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {role === "owner" ? <LayoutDashboard aria-hidden className="size-5 text-forest" /> : <KeyRound aria-hidden className="size-5 text-forest" />}
                <h2 className="text-xl font-semibold">{copy.title}</h2>
              </div>
              <DataSourceBadge />
            </div>
            <p className="mt-1 text-sm text-ink">{copy.hint}</p>
            <div className="mt-4 grid gap-3">
              <div>
                <Label htmlFor="login-id">Login ID</Label>
                <TextInput id="login-id" autoComplete="username" placeholder={copy.placeholder} value={loginId} onChange={(e) => setLoginId(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} />
              </div>
              <div>
                <Label htmlFor="login-secret">Password</Label>
                <TextInput
                  id="login-secret"
                  type="password"
                  autoComplete="current-password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>
            </div>
            <FieldError id="login-error">{error}</FieldError>
            <Button type="submit" className="mt-4 w-full" loading={busy} icon={ArrowRight}>
              Sign in
            </Button>
          </form>
          <p className="mt-3 text-center text-sm">
            <Link href={copy.switchHref} className="inline-flex items-center gap-1 text-ink-muted underline-offset-4 hover:text-forest hover:underline">
              {role === "owner" && <ArrowLeft aria-hidden className="size-3.5" />}
              {copy.switchLabel}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
