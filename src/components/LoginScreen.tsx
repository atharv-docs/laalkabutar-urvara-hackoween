"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import type { Role } from "@/types";
import { useUrvara } from "@/components/providers/UrvaraProvider";
import { DataSourceBadge, Logo, Wordmark } from "@/components/ui/domain";
import { Button, FieldError, Label, TextInput } from "@/components/ui/primitives";

/**
 * Contour lines of a low hill, as on a survey map of the farm. Each ring is the
 * same wobbled circle at a smaller radius, so the rings never cross.
 */
const CONTOURS = Array.from({ length: 9 }, (_, ring) => {
  const r = 90 + ring * 46;
  const points = Array.from({ length: 73 }, (_, i) => {
    const t = (i / 72) * Math.PI * 2;
    const k = r * (1 + 0.07 * Math.sin(3 * t + ring * 0.35) + 0.04 * Math.cos(5 * t - ring * 0.2));
    return `${(500 + k * Math.cos(t) * 1.25).toFixed(1)},${(470 + k * Math.sin(t)).toFixed(1)}`;
  });
  return `M${points.join("L")}Z`;
});

function Contours() {
  return (
    <svg aria-hidden viewBox="0 0 1000 900" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
      <g fill="none" stroke="#8faf8a" strokeWidth={1.25} opacity={0.22} transform="translate(260 120)">
        {CONTOURS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** The forest panel ends in a soft field boundary instead of a ruled edge. */
function FieldEdge() {
  return (
    <svg aria-hidden viewBox="0 0 40 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 left-full hidden h-full w-10 lg:block">
      <path d="M0 0 H6 C30 18, 34 40, 22 58 C12 74, 16 88, 10 100 H0 Z" fill="#234735" />
    </svg>
  );
}

interface Copy {
  title: string;
  /** Hindi line under the title; the Farmer Portal is bilingual. */
  titleHi?: string;
  hint: string;
  placeholder: string;
  idHint?: string;
  passwordHint?: string;
  submitHi?: string;
  switchLead: string;
  switchLabel: string;
  switchHref: string;
}

const COPY: Record<Role, Copy> = {
  farmer: {
    title: "Sign in to your farm",
    titleHi: "अपने खेत में लॉगिन करें",
    hint: "Use the login ID and password from your farm owner. New farmers use their one-time code as the password.",
    placeholder: "URV-F-0001",
    idHint: "लॉगिन आईडी",
    passwordHint: "पासवर्ड",
    submitHi: "लॉगिन करें",
    switchLead: "Farm owner?",
    switchLabel: "Sign in to the Owner Portal",
    switchHref: "/login/owner",
  },
  owner: {
    title: "Owner Portal",
    hint: "Review performance, approve replans and coordinate work across all your farms.",
    placeholder: "URV-O-0001",
    switchLead: "Working on a farm?",
    switchLabel: "Go to farmer sign in",
    switchHref: "/login",
  },
};

const HEADLINE = ["Every Farm.", "Every Resource.", "In Sync."];

export function LoginScreen({ role }: { role: Role }) {
  const { session, user, sessionReady, signInWithCredential } = useUrvara();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
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
    <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] bg-canvas lg:grid-cols-[58fr_42fr]">
      <section className="relative z-10 bg-forest text-ivory">
        <div className="absolute inset-0 overflow-hidden">
          <Contours />
        </div>
        <FieldEdge />

        <div className="relative flex h-full flex-col px-5 pb-7 pt-6 sm:px-12 sm:pt-10 lg:px-16 lg:pb-12 lg:pt-14 xl:px-24">
          <div className="flex items-center gap-3">
            <Logo size={44} ground="dark" />
            <Wordmark tone="light" size="lg" />
          </div>

          <h1 className="mt-8 font-semibold leading-[0.98] tracking-[-0.035em] text-ivory [font-size:clamp(2.5rem,5.4vw,5.5rem)] sm:mt-16 lg:mt-auto">
            {HEADLINE.map((line, i) => (
              <span key={line} className="block motion-safe:animate-terrace" style={{ paddingLeft: `${i * 0.7}em`, animationDelay: `${120 + i * 140}ms` }}>
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-6 hidden max-w-[34rem] text-lg leading-relaxed text-ivory/80 sm:block lg:mt-8" style={{ marginLeft: "clamp(0rem, 2.6vw, 2.5rem)" }}>
            Urvara watches weather, soil, crop reports, machines and people across your farms. It plans the work, replans when something changes, and shows you why.
          </p>

          <dl className="mt-10 hidden max-w-2xl grid-cols-2 gap-x-10 border-t border-ivory/15 pt-6 sm:grid lg:mt-16">
            <div>
              <dt className="font-semibold text-gold">Owner Portal</dt>
              <dd className="mt-1 text-[0.9375rem] leading-snug text-ivory/70">Performance, approvals and coordination across every farm.</dd>
            </div>
            <div>
              <dt className="font-semibold text-gold">Farmer Portal</dt>
              <dd className="mt-1 text-[0.9375rem] leading-snug text-ivory/70">Voice-first, in Hindi and English, on any phone.</dd>
            </div>
          </dl>
          <p className="mt-8 hidden text-sm text-ivory/50 sm:block">Built by Laal Kabutar for Hackoween 2026</p>
        </div>
      </section>

      <section className="flex flex-col px-5 pb-6 pt-8 sm:px-12 lg:pb-10 lg:pl-28 lg:pr-14 lg:pt-14 xl:pl-32">
        <div className="flex justify-end">
          <DataSourceBadge />
        </div>

        <div className="flex flex-1 flex-col justify-center py-6 sm:py-10 lg:py-16">
          <div className="w-full max-w-sm">
            <h2 className="text-[1.875rem] font-semibold leading-tight tracking-[-0.02em] text-ink-strong">{copy.title}</h2>
            {copy.titleHi && <p className="mt-1 text-lg text-sage-ink">{copy.titleHi}</p>}
            <p className="mt-3 leading-relaxed text-ink">{copy.hint}</p>

            <form onSubmit={submit} className="mt-8 grid gap-5" noValidate>
              <div>
                <Label htmlFor="login-id" hint={copy.idHint}>
                  Login ID
                </Label>
                <TextInput
                  id="login-id"
                  autoComplete="username"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder={copy.placeholder}
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                  className="h-[3.25rem] px-4 text-[1.0625rem] tracking-wide"
                />
              </div>
              <div>
                <Label htmlFor="login-secret" hint={copy.passwordHint}>
                  Password
                </Label>
                <div className="relative">
                  <TextInput
                    id="login-secret"
                    type={showSecret ? "text" : "password"}
                    autoComplete="current-password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                    className="h-[3.25rem] px-4 pr-14 text-[1.0625rem]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    aria-label={showSecret ? "Hide password" : "Show password"}
                    aria-pressed={showSecret}
                    className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-control text-ink-muted transition-colors hover:bg-forest-tint/70 hover:text-forest"
                  >
                    {showSecret ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
                  </button>
                </div>
                <FieldError id="login-error">{error}</FieldError>
              </div>
              <Button type="submit" size="lg" className="mt-1 h-[3.25rem] w-full text-[1.0625rem]" loading={busy}>
                Sign in
                {copy.submitHi && <span className="font-medium text-ivory/75">{copy.submitHi}</span>}
              </Button>
            </form>

            <p className="mt-8 border-t border-line pt-5 text-sm text-ink-muted">
              {copy.switchLead}{" "}
              <Link href={copy.switchHref} className="font-semibold text-forest underline decoration-line-strong underline-offset-4 hover:decoration-forest">
                {copy.switchLabel}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-ink-muted">Synthetic demo data for Nashik district. No real farmers or farms.</p>
      </section>
    </div>
  );
}
