import { redirect } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { Star } from "lucide-react";
import { NewReview } from "./NewReview";
import { pct, prettyRole } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const me = await requireProfile();
  if (!canManage(me.role)) redirect("/me");

  const supabase = await createClient();
  const [{ data: people }, { data: tasks }, { data: reviews }] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("tasks").select("id, status, assignee_id, completed_at, due_date"),
    supabase.from("reviews").select("*").order("created_at", { ascending: false }),
  ]);

  const stats = (people ?? []).map((p) => {
    const list = (tasks ?? []).filter((t) => t.assignee_id === p.id);
    const done = list.filter((t) => t.status === "done").length;
    const ontime = list.filter(
      (t) => t.status === "done" && t.completed_at && (!t.due_date || new Date(t.completed_at) <= new Date(t.due_date)),
    ).length;
    const r = (reviews ?? []).filter((rv) => rv.reviewee_id === p.id);
    const avg = r.length ? r.reduce((s, v) => s + v.rating, 0) / r.length : 0;
    return { profile: p, total: list.length, done, ontime, avg };
  });

  return (
    <>
      <PageHeader title="Performance & reviews" subtitle="Calibrate, review, recognize." actions={<NewReview people={people ?? []} />} />

      <section className="grid gap-4 lg:grid-cols-2">
        {stats.map(({ profile, total, done, ontime, avg }) => (
          <div key={profile.id} className="card card-pad">
            <div className="flex items-center gap-3">
              <Avatar name={profile.full_name} size={42} />
              <div className="flex-1">
                <div className="font-display text-bone">{profile.full_name}</div>
                <div className="text-xs text-bone-300/60">{prettyRole(profile.role)} · {profile.title || profile.email}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-mint"><Star className="h-4 w-4 fill-mint" /> <span className="font-display text-lg">{avg ? avg.toFixed(1) : "—"}</span></div>
                <div className="text-[11px] text-bone-300/50">avg rating</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Cell label="Tasks" value={total} />
              <Cell label="Done" value={done} sub={`${pct(done, total)}%`} />
              <Cell label="On-time" value={ontime} sub={`${pct(ontime, done || 1)}%`} />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-bone text-xl mb-3">Latest reviews</h2>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr>
              <th className="th">Period</th>
              <th className="th">Reviewee</th>
              <th className="th">Rating</th>
              <th className="th">Feedback</th>
              <th className="th">Reviewer</th>
              <th className="th">Date</th>
            </tr></thead>
            <tbody>
              {(reviews ?? []).map((r) => {
                const ree = (people ?? []).find((p) => p.id === r.reviewee_id);
                const rer = (people ?? []).find((p) => p.id === r.reviewer_id);
                return (
                  <tr key={r.id}>
                    <td className="td">{r.period}</td>
                    <td className="td">{ree?.full_name ?? "—"}</td>
                    <td className="td"><span className="chip chip-mint">{r.rating}/5</span></td>
                    <td className="td text-bone-300/80 max-w-md truncate">{r.feedback ?? "—"}</td>
                    <td className="td text-bone-300/70">{rer?.full_name ?? "—"}</td>
                    <td className="td text-xs text-bone-300/60">{format(new Date(r.created_at), "MMM d, yyyy")}</td>
                  </tr>
                );
              })}
              {(reviews ?? []).length === 0 && (
                <tr><td colSpan={6} className="td text-center text-bone-300/50">No reviews yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Cell({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/5 px-2 py-2">
      <div className="text-[11px] uppercase tracking-wider text-bone-300/60">{label}</div>
      <div className="text-bone font-display text-lg">{value}</div>
      {sub && <div className="text-[10px] text-mint">{sub}</div>}
    </div>
  );
}
