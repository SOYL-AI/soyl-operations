"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, FolderKanban, Users, Wallet,
  Activity, Calendar, Star, UserCircle2,
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
  { href: "/finance",     label: "Finance",      icon: Wallet,    roles: ["ceo", "manager"] },
  { href: "/performance", label: "Performance",  icon: Star,      roles: ["ceo", "manager"] },
  { href: "/activity",    label: "Activity log", icon: Activity },
  { href: "/me",          label: "My work",      icon: UserCircle2 },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-white/5 bg-ink-900/60 backdrop-blur sticky top-0 h-screen">
      <div className="px-5 py-5 border-b border-white/5">
        <Link href="/overview"><LogoLockup /></Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.filter((n) => !n.roles || n.roles.includes(role)).map((n) => {
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
        <div className="mt-1 text-bone-200 capitalize">{role}</div>
      </div>
    </aside>
  );
}
