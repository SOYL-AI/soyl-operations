import { LogOut } from "lucide-react";
import { initialsOf } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { MobileMenuButton } from "./AppShell";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { Avatar } from "./Avatar";

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
      <MobileMenuButton />
      <div className="min-w-0 flex-1 lg:flex-none">
        <div className="text-[11px] uppercase tracking-[0.22em] text-bone-300/50">{greeting}</div>
        <div className="font-display text-bone text-lg leading-tight truncate">
          {profile.full_name || "Welcome"} <span className="text-bone-300/50">·</span>{" "}
          <span className="text-mint">{prettyRole(profile.role)}</span>
        </div>
      </div>

      <div className="hidden lg:block flex-1 max-w-md mx-auto">
        <GlobalSearch />
      </div>

      <NotificationBell userId={profile.id} initialUnread={unread ?? 0} />

      <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-ink-700/60 px-2 py-1.5">
        <Avatar name={profile.full_name} src={profile.avatar_url} size={28} />
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

function prettyRole(role: string) {
  if (role === "super_admin") return "System admin";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 5)  return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
