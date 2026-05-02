"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, FolderKanban, Users, Wallet,
  Activity, Calendar, Star, UserCircle2, X, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoLockup } from "./Logo";
import type { Role } from "@/lib/types";

const NAV: { href: string; label: string; icon: any; roles?: Role[] }[] = [
  { href: "/overview",    label: "Overview",     icon: LayoutDashboard },
  { href: "/tasks",       label: "Tasks",        icon: CheckSquare },
  { href: "/projects",    label: "Projects",     icon: FolderKanban },
  { href: "/team",        label: "Team",         icon: Users },
  { href: "/timeline",    label: "Timeline",     icon: Calendar },
  { href: "/finance",     label: "Finance",      icon: Wallet,    roles: ["super_admin", "ceo", "manager"] },
  { href: "/performance", label: "Performance",  icon: Star,      roles: ["super_admin", "ceo", "manager"] },
  { href: "/activity",    label: "Activity log", icon: Activity },
  { href: "/audit",       label: "Audit log",    icon: ShieldCheck, roles: ["super_admin"] },
  { href: "/me",          label: "My work",      icon: UserCircle2 },
];

export function Sidebar({
  role,
  mobileOpen = false,
  onCloseMobile,
}: {
  role: Role;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onCloseMobile?.();
  }, [pathname, onCloseMobile]);

  const items = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-white/5 bg-ink-900/60 backdrop-blur sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-white/5">
          <Link href="/overview"><LogoLockup /></Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn("nav-item", active && "nav-item-active")}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5 text-[11px] text-bone-300/50">
          <div className="uppercase tracking-[0.2em]">Role</div>
          <div className="mt-1 text-bone-200">{role === "super_admin" ? "System admin" : role.charAt(0).toUpperCase() + role.slice(1)}</div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-ink-900 border-r border-white/5 flex flex-col">
            <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
              <Link href="/overview" onClick={onCloseMobile}><LogoLockup /></Link>
              <button
                type="button"
                onClick={onCloseMobile}
                className="btn btn-ghost border-white/10 px-2 py-2"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {items.map((n) => {
                const Icon = n.icon;
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={onCloseMobile}
                    className={cn("nav-item", active && "nav-item-active")}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/5 text-[11px] text-bone-300/50">
              <div className="uppercase tracking-[0.2em]">Role</div>
              <div className="mt-1 text-bone-200">{role === "super_admin" ? "System admin" : role.charAt(0).toUpperCase() + role.slice(1)}</div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
