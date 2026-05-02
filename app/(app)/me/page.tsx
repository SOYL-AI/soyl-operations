import Link from "next/link";
import { format, subDays, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { Kpi } from "@/components/Kpi";
import { TrendChart } from "@/components/charts/TrendChart";
import { TaskStatusChip, PriorityChip } from "@/components/StatusChip";
import { ProfileForm } from "./ProfileForm";
import { Star } from "lucide-react";
import { pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const me = await requireProfile();
  const supabase = await createClient();

  const [{ data: tasks }, { data: reviews }] = await Promise.all([
    supabase.from("tasks").select("*").eq("assignee_id", me.id).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("reviews").select("*").eq("reviewee_id", me.id).order("created_at", { ascending: false }),
  ]);

  const open = (tasks ?? []).filter((t) => t.status !== "done");
  const done = (tasks ?? []).filter((t) => t.status === "done");
  const overdue = (tasks ?? []).filter(
    (t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date(),
  );
  const ontime = done.filter(
    (t) => t.completed_at && (!t.due_date || new Date(t.completed_at) <= new Date(t.due_date)),
  );
  const avg = (reviews ?? []).length
    ? (reviews ?? []).reduce((s, r) => s + r.rating, 0) / (reviews ?? []).length
    : 0;

  const days = Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), 13 - i)));
  const trend = days.map((d) => ({
    label: format(d, "MMM d"),
    value: done.filter(
      (t) => t.completed_at && startOfDay(new Date(t.completed_at)).getTime() === d.getTime(),
    ).length,
  }));

  // Personal performance score — 0-100. Three components:
  //   completion: % of assigned tasks done (0-40)
  //   on-time:    % of done tasks delivered by their due date (0-30)
  //   reviews:    avg rating mapped 1-5 -> 0-30
  // No assigned tasks → reviews-only proportional score.
  const totalAssigned = (tasks ?? []).length;
  const completionPct = totalAssigned ? done.length / totalAssigned : 0;
  const ontimePct = done.length ? ontime.length / done.length : 0;
  const reviewScore = avg ? (avg - 1) / 4 : 0;
  const score = Math.round(completionPct * 40 + ontimePct * 30 + reviewScore * 30);
  const scoreBand = score >= 80 ? "Excellent" : score >= 60 ? "On track" : score >= 40 ? "Needs focus" : "At risk";

  return (
    <>
      <PageHeader title="My work" subtitle="Your tasks, deadlines, and feedback — all in one place." />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Performance score"
          value={
            <span className={
              score >= 80 ? "text-mint" :
              score >= 60 ? "text-bone" :
              score >= 40 ? "text-amber-300" : "text-red-300"
            }>{score}</span>
          }
          hint={scoreBand}
          className="lg:col-span-1"
        />
        <Kpi label="Open tasks" value={open.length} hint={`${overdue.length} overdue`} />
        <Kpi label="Completed" value={done.length} hint={`${pct(ontime.length, done.length || 1)}% on-time`} />
        <Kpi label="Avg rating" value={avg ? `${avg.toFixed(1)}/5` : "—"} hint={`${(reviews ?? []).length} reviews`} />
        <Kpi label="Streak (14d)" value={trend.filter((d) => d.value > 0).length} hint="active days" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <h3 className="font-display text-bone">Daily completions</h3>
          <div className="mt-4"><TrendChart data={trend} /></div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center gap-3">
            <Avatar name={me.full_name} size={48} />
            <div>
              <div className="font-display text-bone">{me.full_name}</div>
              <div className="text-xs text-bone-300/60">{me.role === "super_admin" ? "System admin" : me.role.charAt(0).toUpperCase() + me.role.slice(1)}</div>
            </div>
          </div>
          <div className="mt-4">
            <ProfileForm fullName={me.full_name ?? ""} title={me.title ?? ""} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-bone">Today & upcoming</h3>
            <Link href="/tasks/new" className="text-xs text-mint">+ New task</Link>
          </div>
          <ul className="mt-3 divide-y divide-white/5">
            {open.length === 0 && <li className="py-4 text-sm text-bone-300/50">All clear. ✨</li>}
            {open.slice(0, 8).map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between gap-2">
                <Link href={`/tasks/${t.id}`} className="text-bone hover:text-mint truncate">{t.title}</Link>
                <div className="flex items-center gap-1.5">
                  <PriorityChip priority={t.priority as any} />
                  <TaskStatusChip status={t.status as any} />
                  {t.due_date && <span className="chip">{format(new Date(t.due_date), "MMM d")}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card card-pad">
          <h3 className="font-display text-bone">Recent feedback</h3>
          <ul className="mt-3 space-y-3">
            {(reviews ?? []).length === 0 && <li className="text-sm text-bone-300/50">No reviews yet.</li>}
            {(reviews ?? []).slice(0, 5).map((r) => (
              <li key={r.id} className="rounded-xl border border-white/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-bone-300/60">{r.period}</span>
                  <span className="inline-flex items-center gap-1 text-mint">
                    <Star className="h-3.5 w-3.5 fill-mint" /> {r.rating}/5
                  </span>
                </div>
                {r.feedback && <p className="mt-2 text-sm text-bone-200 whitespace-pre-wrap">{r.feedback}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
