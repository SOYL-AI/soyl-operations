import Link from "next/link";
import { Bell, LogOut, Menu } from "lucide-react";
import { avatarUrl, initialsOf } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export async function Topbar({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", profile.id)
    .eq("read", false);

  const greeting = greetingFor(new Date());

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-ink-900/70 backdrop-blur px-4 sm:px-8 py-3">
      <button className="md:hidden btn btn-ghost border-white/10 px-2 py-2" aria-label="menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-[0.22em] text-bone-300/50">{greeting}</div>
        <div className="font-display text-bone text-lg leading-tight">
          {profile.full_name || "Welcome"} <span className="text-bone-300/50">·</span>{" "}
          <span className="text-mint capitalize">{profile.role}</span>
        </div>
      </div>

      <Link
        href="/activity#notifications"
        className="relative btn btn-ghost border-white/10 px-2.5 py-2"
        aria-label="notifications"
      >
        <Bell className="h-4 w-4" />
        {unread ? (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-mint px-1 text-[10px] font-bold text-ink-900">
            {unread}
          </span>
        ) : null}
      </Link>

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-700/60 px-2 py-1.5">
        <img
          src={profile.avatar_url || avatarUrl(profile.id)}
          alt=""
          className="h-7 w-7 rounded-lg bg-ink-800 ring-1 ring-white/10"
        />
        <div className="text-xs leading-tight pr-1.5">
          <div className="text-bone">{profile.full_name || initialsOf(profile.full_name)}</div>
          <div className="text-bone-300/50">{profile.email}</div>
        </div>
      </div>

      <form action="/auth/signout" method="post">
        <button className="btn btn-ghost border-white/10 px-2.5 py-2" aria-label="sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </header>
  );
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 5)  return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
