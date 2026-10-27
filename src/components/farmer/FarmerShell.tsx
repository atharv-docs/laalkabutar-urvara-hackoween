"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ClipboardList, House, Mic, Settings, Sprout, type LucideIcon } from "lucide-react";
import type { Language } from "@/types";
import { useUrvara } from "@/components/providers/UrvaraProvider";
import { PortalGate } from "@/components/PortalGate";
import { DataSourceBadge, Logo, Wordmark } from "@/components/ui/domain";
import { Skeleton, cx } from "@/components/ui/primitives";
import { tr, type I18nKey } from "@/lib/i18n";
import { tx } from "@/lib/i18n-farmer-extra";
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
            "min-h-10 min-w-11 rounded-[4px] px-2.5 text-[0.9375rem] font-semibold",
            user.language === lang ? "bg-surface text-forest shadow-panel" : "text-ink",
          )}
        >
          {lang === "en" ? "EN" : "हिंदी"}
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

function isActive(href: string, pathname: string) {
  return href === "/farmer" ? pathname === "/farmer" || pathname.startsWith("/farmer/tasks") : pathname.startsWith(href);
}

/** Furrow lines rising out of the sidebar's lower corner, echoing the Urvara mark. */
function SidebarFurrows() {
  return (
    <svg aria-hidden viewBox="0 0 240 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full overflow-visible">
      <g fill="none" stroke="#8faf8a" strokeWidth={1.25} opacity={0.45}>
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M -10 ${110 + i * 13} C 70 ${96 + i * 13}, 150 ${58 + i * 15}, 250 ${8 + i * 17}`} />
        ))}
      </g>
    </svg>
  );
}

/** Desktop navigation. Speak stays a distinct, always-visible action here too. */
function SideNav({ lang }: { lang: Language }) {
  const pathname = usePathname();
  return (
    <aside className="relative hidden w-60 shrink-0 border-r border-line bg-sunken/45 lg:block">
      <nav aria-label="Farmer Portal" className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col overflow-hidden px-4 pt-8">
        <ul className="space-y-1.5">
          {NAV.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex min-h-12 items-center gap-3 rounded-control px-3.5 font-medium transition-colors",
                    active ? "bg-forest text-ivory" : item.primary ? "border border-forest/25 bg-forest-tint/70 text-forest hover:bg-forest-tint" : "text-ink-strong hover:bg-sunken",
                  )}
                >
                  <item.icon aria-hidden className={cx("size-5", active ? "text-ivory" : item.primary ? "text-forest" : "text-ink-muted")} />
                  {tr(lang, item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="relative z-10 mt-auto pb-52 text-xl leading-snug text-ink">
          Every Farm.
          <br />
          Every Resource.
          <br />
          In Sync.
        </p>
        <SidebarFurrows />
      </nav>
    </aside>
  );
}

function BottomNav({ lang }: { lang: Language }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Farmer Portal" className="fixed inset-x-0 bottom-0 z-30 lg:hidden border-t border-line bg-surface/97 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      <ul className="mx-auto grid max-w-[30rem] grid-cols-4">
        {NAV.map((item) => {
          const active = isActive(item.href, pathname);
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
  const pathname = usePathname();
  const lang: Language = user?.language ?? "en";
  const firstName = user?.name.split(" ")[0];
  const isFarmer = user?.role === "farmer";
  // Today has a two-column desktop layout; the other screens stay a readable single column.
  const wide = pathname === "/farmer";
  return (
    <div lang={lang} className="min-h-dvh text-[1.0625rem] leading-relaxed">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[30rem] items-center gap-2 px-4 lg:max-w-none lg:px-8">
          <Link href="/farmer" className="flex min-w-0 items-center gap-2 lg:gap-3" aria-label="Urvara: today">
            <Logo size={34} ground="light" />
            {firstName && <span className="truncate font-semibold text-ink-strong lg:hidden">{firstName}</span>}
            <span className="hidden lg:inline-flex">
              <Wordmark />
            </span>
          </Link>
          <span className="ml-2 hidden border-l border-line-strong pl-4 text-[0.9375rem] text-ink lg:block">{tx(lang, "farmerPortal")}</span>
          <div className="ml-auto flex items-center gap-1.5 lg:gap-3">
            <span className="lg:hidden">
              <DataSourceBadge shortLabel={lang === "hi" ? { demo: "डेमो", live: "लाइव" } : { demo: "DEMO", live: "LIVE" }} />
            </span>
            <span className="hidden lg:inline-flex">
              <DataSourceBadge />
            </span>
            <LanguageToggle />
            <Link href="/farmer/settings" className="grid size-11 place-items-center rounded-control text-ink-strong hover:bg-sunken" aria-label={tr(lang, "settings")}>
              <Settings aria-hidden className="size-5" />
            </Link>
          </div>
        </div>
      </header>
      <div className="lg:flex">
        {isFarmer && <SideNav lang={lang} />}
        <main id="main" className={cx("mx-auto w-full max-w-[30rem] px-4 pb-32 pt-4 lg:pb-12 lg:pt-8", wide ? "lg:max-w-[76rem] lg:px-10" : "lg:max-w-[40rem]")}>
          <PortalGate role="farmer" fallback={<FarmerSkeleton />}>
            {children}
          </PortalGate>
        </main>
      </div>
      {isFarmer && <BottomNav lang={lang} />}
    </div>
  );
}
