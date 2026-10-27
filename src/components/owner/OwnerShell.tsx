"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  CloudSun,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  MapPin,
  Menu,
  Settings,
  Sprout,
  Tractor,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useUrvara } from "@/components/providers/UrvaraProvider";
import { ContentSkeleton, PortalGate } from "@/components/PortalGate";
import { DataSourceBadge, Logo, Wordmark } from "@/components/ui/domain";
import { cx } from "@/components/ui/primitives";
import { fmtDayTime } from "@/lib/time";
import { ownerAlerts } from "@/services/alerts";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "approvals" | "risk";
  future?: boolean;
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Understand",
    items: [
      { href: "/owner", label: "Overview", icon: LayoutDashboard },
      { href: "/owner/farms", label: "Farms & Fields", icon: MapIcon },
      { href: "/owner/crop-health", label: "Crop Health", icon: Sprout, badge: "risk" },
      { href: "/owner/weather", label: "Weather & Sensors", icon: CloudSun },
      { href: "/owner/performance", label: "Performance & Rupee Score", icon: IndianRupee },
    ],
  },
  {
    title: "Coordinate",
    items: [
      { href: "/owner/operations", label: "Operations & Tasks", icon: CalendarClock, badge: "approvals" },
      { href: "/owner/farmers", label: "Farmers", icon: Users },
      { href: "/owner/resources", label: "Resources", icon: Tractor },
      { href: "/owner/scouting", label: "Scouting", icon: MapPin, future: true },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/owner" ? pathname === "/owner" : pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { state, user, signOut } = useUrvara();
  const pending = state?.proposals.filter((p) => p.status === "pending").length ?? 0;
  const unverified = state?.reports.filter((r) => r.kind === "problem" && r.status === "unverified").length ?? 0;
  return (
    <div className="flex h-full flex-col bg-forest text-ivory">
      <Link href="/owner" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pb-5 pt-5">
        <Logo size={34} />
        <Wordmark tone="light" />
      </Link>
      <nav aria-label="Owner Portal" className="flex-1 overflow-y-auto px-3">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-2 pb-1.5 text-xs font-semibold text-sage">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const count = item.badge === "approvals" ? pending : item.badge === "risk" ? unverified : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[0.9375rem] transition-colors",
                        active ? "bg-ivory font-semibold text-forest" : "text-ivory/85 hover:bg-white/8 hover:text-ivory",
                      )}
                    >
                      <item.icon aria-hidden className={cx("size-[1.125rem] shrink-0", active ? "text-forest" : "text-sage")} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {count > 0 && (
                        <span className={cx("tabular rounded px-1.5 text-xs font-bold", active ? "bg-gold-tint text-gold-ink" : "bg-gold text-ink-strong")}>
                          {count}
                          <span className="sr-only">{item.badge === "approvals" ? " pending approvals" : " unverified reports"}</span>
                        </span>
                      )}
                      {item.future && <span className={cx("text-xs", active ? "text-ink-muted" : "text-ivory/60")}>Soon</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-3 py-3">
        <Link
          href="/owner/settings"
          onClick={onNavigate}
          aria-current={isActive(pathname, "/owner/settings") ? "page" : undefined}
          className={cx(
            "flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[0.9375rem]",
            isActive(pathname, "/owner/settings") ? "bg-ivory font-semibold text-forest" : "text-ivory/85 hover:bg-white/8",
          )}
        >
          <Settings aria-hidden className="size-[1.125rem] text-sage" />
          Settings & demo
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2 px-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-ivory/65">Owner · {user?.loginId}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-control p-2 text-ivory/75 hover:bg-white/10 hover:text-ivory"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { state } = useUrvara();
  const alerts = state ? ownerAlerts(state).filter((a) => a.level === "urgent").length : 0;
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur-sm md:px-6">
      <button type="button" onClick={onMenu} className="-ml-1 rounded-control p-2 text-ink-strong hover:bg-sunken lg:hidden" aria-label="Open navigation">
        <Menu className="size-5" />
      </button>
      <Link href="/owner" className="flex items-center gap-2 lg:hidden">
        <Logo size={30} ground="light" />
        <span className="font-semibold text-forest">Urvara</span>
      </Link>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {state && (
          <p className="hidden text-sm text-ink sm:block" title="All times and readings follow this fixed demo clock so the scenario is repeatable">
            <span className="text-ink-muted">Demo clock</span> <time className="tabular font-semibold text-ink-strong" dateTime={state.now}>{fmtDayTime(state.now)}</time>
          </p>
        )}
        <DataSourceBadge />
        <Link
          href="/owner#attention"
          className="relative rounded-control p-2 text-ink-strong hover:bg-sunken"
          aria-label={alerts ? `${alerts} urgent items need attention` : "No urgent items"}
        >
          <Bell className="size-5" />
          {alerts > 0 && (
            <span className="tabular absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-terracotta-ink px-1 text-xs font-bold leading-5 text-ivory">{alerts}</span>
          )}
        </Link>
      </div>
    </header>
  );
}

export function OwnerShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-ink-strong/45" onClick={() => setOpen(false)} aria-label="Close navigation" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-rise shadow-raised">
            <Sidebar onNavigate={() => setOpen(false)} />
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-5 rounded-control p-1.5 text-ivory hover:bg-white/10" aria-label="Close navigation">
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
      <TopBar onMenu={() => setOpen(true)} />
      <main id="main" className="mx-auto max-w-[1360px] px-4 pb-16 pt-6 md:px-6">
        <PortalGate role="owner" fallback={<ContentSkeleton />}>
          {children}
        </PortalGate>
      </main>
    </div>
  );
}
