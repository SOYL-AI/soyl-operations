import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";
import { Kpi } from "@/components/Kpi";
import { TrendChart } from "@/components/charts/TrendChart";
import { StatusDonut } from "@/components/charts/StatusDonut";
import { ProfitBars } from "@/components/charts/ProfitBars";
import { PageHeader } from "@/components/PageHeader";
import { TaskStatusChip, ProjectStatusChip } from "@/components/StatusChip";
import { Avatar } from "@/components/Avatar";
import { formatCurrency, pct } from "@/lib/utils";
import { format, subDays, startOfDay } from "date-fns";
import { Sparkles, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: projects }, { data: tasks }, { data: members }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*"),
  ]);

  const allTasks = tasks ?? [];
  const allProjects = projects ?? [];
  const team = members ?? [];

  const total = allTasks.length;
  const done = allTasks.filter((t) => t.status === "done").length;
  const overdue = allTasks.filter(
    (t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date(),
  ).length;
  const activeProjects = allProjects.filter((p) => p.status === "active").length;
  const completionRate = pct(done, total);

  // 14-day completion trend
  const days = Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), 13 - i)));
  const trend = days.map((d) => {
    const label = format(d, "MMM d");
    const value = allTasks.filter(
      (t) =>
        t.completed_at &&
        startOfDay(new Date(t.completed_at)).getTime() === d.getTime(),
    ).length;
    return { label, value };
  });

  // Status donut
  const donut = [
    { name: "Done",        value: allTasks.filter((t) => t.status === "done").length },
    { name: "In progress", value: allTasks.filter((t) => t.status === "in_progress").length },
    { name: "Review",      value: allTasks.filter((t) => t.status === "review").length },
    { name: "To do",       value: allTasks.filter((t) => t.status === "todo").length },
    { name: "Blocked",     value: allTasks.filter((t) => t.status === "blocked").length },
  ].filter((d) => d.value > 0);

  // Finance (manager+ only)
  let revenue = 0, expense = 0, profitData: { label: string; revenue: number; expense: number }[] = [];
  if (canManage(profile.role)) {
    const since = subDays(new Date(), 30).toISOString().slice(0, 10);
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .gte("occurred_on", since);
    const txs = tx ?? [];
    revenue = txs.filter((t) => t.type === "revenue").reduce((s, t) => s + Number(t.amount), 0);
    expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

    const buckets: Record<string, { revenue: number; expense: number }> = {};
    Array.from({ length: 6 }).forEach((_, i) => {
      const d = subDays(new Date(), (5 - i) * 5);
      const key = format(d, "MMM d");
      buckets[key] = { revenue: 0, expense: 0 };
    });
    txs.forEach((t) => {
      const k = format(new Date(t.occurred_on), "MMM d");
      if (!buckets[k]) buckets[k] = { revenue: 0, expense: 0 };
      buckets[k][t.type as "revenue" | "expense"] += Number(t.amount);
    });
    profitData = Object.entries(buckets).map(([label, v]) => ({ label, ...v }));
  }

  const recentTasks = allTasks.slice(0, 6);
  const userById = new Map(team.map((u) => [u.id, u]));

  return (
    <>
      <PageHeader
        title="Company overview"
        subtitle="Story of your life — at a glance."
        actions={
          <Link href="/tasks/new" className="btn btn-primary">
            <Sparkles className="h-4 w-4" /> New task
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active projects" value={activeProjects} hint={`${allProjects.length} total`} />
        <Kpi label="Tasks" value={total} hint={`${done} done · ${overdue} overdue`} />
        <Kpi label="Completion rate" value={`${completionRate}%`} hint="All tasks lifetime" />
        <Kpi label="People" value={team.length} hint={`${team.filter((u) => u.role === "intern").length} interns`} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-bone">Daily completions</h3>
            <span className="text-xs text-bone-300/60">last 14 days</span>
          </div>
          <div className="mt-4">
            <TrendChart data={trend} />
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="font-display text-bone">Task mix</h3>
          {donut.length ? (
            <div className="mt-4">
              <StatusDonut data={donut} />
              <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-bone-300/70">
                {donut.map((d) => (
                  <li key={d.name} className="flex items-center justify-between rounded-lg border border-white/5 px-2 py-1">
                    <span>{d.name}</span>
                    <span className="text-bone">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-6 text-sm text-bone-300/50">No tasks yet. Create one to populate the chart.</p>
          )}
        </div>
      </section>

      {canManage(profile.role) && (
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="card card-pad">
            <div className="stat-label">Revenue (30d)</div>
            <div className="stat-num mt-2">{formatCurrency(revenue)}</div>
          </div>
          <div className="card card-pad">
            <div className="stat-label">Expenses (30d)</div>
            <div className="stat-num mt-2">{formatCurrency(expense)}</div>
          </div>
          <div className="card card-pad">
            <div className="stat-label">Profit (30d)</div>
            <div className={`stat-num mt-2 ${revenue - expense >= 0 ? "text-mint" : "text-red-300"}`}>
              {formatCurrency(revenue - expense)}
            </div>
          </div>
          <div className="card card-pad lg:col-span-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-bone">Revenue vs expenses</h3>
              <Link href="/finance" className="text-xs text-mint inline-flex items-center gap-1">
                Open finance <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4">
              <ProfitBars data={profitData} />
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-bone">Recent tasks</h3>
            <Link href="/tasks" className="text-xs text-mint inline-flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 divide-y divide-white/5">
            {recentTasks.length === 0 && (
              <p className="text-sm text-bone-300/50 py-4">No tasks yet.</p>
            )}
            {recentTasks.map((t) => {
              const owner = t.assignee_id ? userById.get(t.assignee_id) : undefined;
              return (
                <div key={t.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <Link href={`/tasks/${t.id}`} className="text-sm text-bone hover:text-mint truncate block">
                      {t.title}
                    </Link>
                    <div className="text-xs text-bone-300/50 mt-0.5">
                      {t.due_date ? `Due ${format(new Date(t.due_date), "MMM d")}` : "No due date"}
                    </div>
                  </div>
                  <TaskStatusChip status={t.status as any} />
                  {owner ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={owner.full_name} size={24} />
                      <span className="hidden sm:inline text-xs text-bone-300/70 truncate">
                        {owner.full_name}
                      </span>
                    </div>
                  ) : (
                    <span className="chip">Unassigned</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-bone">Active projects</h3>
            <Link href="/projects" className="text-xs text-mint inline-flex items-center gap-1">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {allProjects.slice(0, 5).map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-xl border border-white/5 p-3 hover:bg-white/[0.03]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-bone truncate">{p.name}</span>
                  <ProjectStatusChip status={p.status as any} />
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full bg-mint" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-bone-300/50">{p.progress}% complete</div>
              </Link>
            ))}
            {allProjects.length === 0 && (
              <p className="text-sm text-bone-300/50">No projects yet.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
