import { format, formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { MarkAllRead } from "./MarkAllRead";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const me = await requireProfile();
  const supabase = await createClient();

  const [{ data: log }, { data: people }, { data: notifications }] = await Promise.all([
    supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, full_name, avatar_url"),
    supabase.from("notifications").select("*").eq("user_id", me.id).order("created_at", { ascending: false }).limit(40),
  ]);

  const peopleById = new Map((people ?? []).map((p) => [p.id, p]));

  return (
    <>
      <PageHeader title="Activity" subtitle="Full transparency on every change in the system." />

      <section id="notifications" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-bone text-xl">Your notifications</h2>
          <MarkAllRead />
        </div>
        <div className="card overflow-hidden">
          <ul className="divide-y divide-white/5">
            {(notifications ?? []).length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-bone-300/50">All caught up — no notifications.</li>
            )}
            {(notifications ?? []).map((n) => (
              <li key={n.id} className="px-4 py-3 flex items-start gap-3">
                <span className={"mt-1 h-2 w-2 rounded-full " + (n.read ? "bg-bone-300/30" : "bg-mint")} />
                <div className="flex-1">
                  <div className="text-sm text-bone">{n.title}</div>
                  {n.body && <div className="text-xs text-bone-300/70 mt-0.5">{n.body}</div>}
                </div>
                {n.link && <a href={n.link} className="text-xs text-mint">Open →</a>}
                <span className="text-[11px] text-bone-300/50 whitespace-nowrap">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <h2 className="font-display text-bone text-xl mb-3">Company activity</h2>
      <div className="card overflow-hidden">
        <ul className="divide-y divide-white/5">
          {(log ?? []).length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-bone-300/50">No activity yet.</li>
          )}
          {(log ?? []).map((a) => {
            const actor = a.actor_id ? peopleById.get(a.actor_id) : null;
            return (
              <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                {actor ? <Avatar name={actor.full_name} size={28} /> : <div className="h-7 w-7 rounded-lg bg-ink-700" />}
                <div className="flex-1 text-sm">
                  <span className="text-bone">{actor?.full_name ?? "System"}</span>{" "}
                  <span className="text-bone-300/70">{prettyAction(a.action)}</span>{" "}
                  <span className="text-bone-300/50 text-xs">· {a.entity_type}</span>
                </div>
                <span className="text-[11px] text-bone-300/50 whitespace-nowrap">
                  {format(new Date(a.created_at), "MMM d, HH:mm")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function prettyAction(a: string) {
  return a.replaceAll(".", " ").replaceAll("_", " ");
}
