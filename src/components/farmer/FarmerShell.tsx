"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ClipboardList, House, Mic, Settings, Sprout, type LucideIcon } from "lucide-react";
import type { Language } from "@/types";
import { useUrvara } from "@/components/providers/UrvaraProvider";
import { PortalGate } from "@/components/PortalGate";
import { DataSourceBadge, Logo } from "@/components/ui/domain";
import { Skeleton, cx } from "@/components/ui/primitives";
import { tr, type I18nKey } from "@/lib/i18n";
import { setLanguage } from "@/services/farmers";

function LanguageToggle() {
  const { user, run } = useUrvara();
  if (!user) return null;
  const choose = (lang: Language) => {
    if (lang !== user.language) void run((s) => setLanguage(s, user.id, lang));
  };
  return (
    <div role="radiogroup" aria-label="Language / भाषा" className="flex rounded-control border border-line-strong bg-sunken p-0.5">
      {(["en", "hi"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          role="radio"
          aria-checked={user.language === lang}
          lang={lang}
          onClick={() => choose(lang)}
          className={cx(
            "min-h-10 min-w-11 rounded-[4px] px-2 text-[0.9375rem] font-semibold",
            user.language === lang ? "bg-surface text-forest shadow-panel" : "text-ink",
          )}
        >
          {lang === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}

const NAV: { href: string; key: I18nKey; icon: LucideIcon; primary?: boolean }[] = [
  { href: "/farmer", key: "today", icon: House },
  { href: "/farmer/fields", key: "fields", icon: Sprout },
  { href: "/farmer/report", key: "report", icon: Mic, primary: true },
  { href: "/farmer/record", key: "score", icon: ClipboardList },
];

function BottomNav({ lang }: { lang: Language }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Farmer Portal" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/97 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      <ul className="mx-auto grid max-w-[30rem] grid-cols-4">
        {NAV.map((item) => {
          const active = item.href === "/farmer" ? pathname === "/farmer" || pathname.startsWith("/farmer/tasks") : pathname.startsWith(item.href);
          if (item.primary) {
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="-mt-5 flex flex-col items-center gap-0.5 pb-1.5 text-sm font-semibold text-forest"
                >
                  <span className={cx("grid size-14 place-items-center rounded-full bg-forest text-ivory shadow-raised ring-4 ring-canvas", active && "bg-forest-hover")}>
                    <item.icon aria-hidden className="size-7" />
                  </span>
                  {tr(lang, item.key)}
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx("flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm", active ? "font-semibold text-forest" : "text-ink")}
              >
                <item.icon aria-hidden className={cx("size-6", active ? "text-forest" : "text-ink-muted")} />
                {tr(lang, item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function FarmerSkeleton() {
  return (
    <div className="space-y-4 pt-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
  );
}

export function FarmerShell({ children }: { children: ReactNode }) {
  const { user } = useUrvara();
  const lang: Language = user?.language ?? "en";
  const firstName = user?.name.split(" ")[0];
  return (
    <div lang={lang} className="min-h-dvh text-[1.0625rem] leading-relaxed">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[30rem] items-center gap-2 px-4">
          <Link href="/farmer" className="flex min-w-0 items-center gap-2" aria-label="Urvara: today">
            <Logo size={34} ground="light" />
            {firstName && <span className="truncate font-semibold text-ink-strong">{firstName}</span>}
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <DataSourceBadge shortLabel={lang === "hi" ? { demo: "डेमो", live: "लाइव" } : { demo: "DEMO", live: "LIVE" }} />
            <LanguageToggle />
            <Link href="/farmer/settings" className="grid size-11 place-items-center rounded-control text-ink-strong hover:bg-sunken" aria-label={tr(lang, "settings")}>
              <Settings aria-hidden className="size-5" />
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[30rem] px-4 pb-32 pt-4">
        <PortalGate role="farmer" fallback={<FarmerSkeleton />}>
          {children}
        </PortalGate>
      </main>
      {user?.role === "farmer" && <BottomNav lang={lang} />}
    </div>
  );
}
