import Link from "next/link";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  startOfWeek, endOfWeek, isSameDay, isSameMonth, addDays, isAfter,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { TaskStatusChip } from "@/components/StatusChip";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  await requireProfile();
  const params = await searchParams;
  const supabase = await createClient();

  const today = new Date();
  const month = params.m ? new Date(params.m + "-01") : new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date, status")
      .not("due_date", "is", null)
      .gte("due_date", format(gridStart, "yyyy-MM-dd"))
      .lte("due_date", format(gridEnd, "yyyy-MM-dd")),
    supabase
      .from("projects")
      .select("id, name, due_date, status")
      .not("due_date", "is", null)
      .gte("due_date", format(gridStart, "yyyy-MM-dd"))
      .lte("due_date", format(gridEnd, "yyyy-MM-dd")),
  ]);

  const itemsByDay = new Map<string, { kind: "task" | "project"; id: string; title: string; status: string }[]>();
  (tasks ?? []).forEach((t) => {
    if (!t.due_date) return;
    const key = t.due_date;
    const arr = itemsByDay.get(key) ?? [];
    arr.push({ kind: "task", id: t.id, title: t.title, status: t.status });
    itemsByDay.set(key, arr);
  });
  (projects ?? []).forEach((p) => {
    if (!p.due_date) return;
    const arr = itemsByDay.get(p.due_date) ?? [];
    arr.push({ kind: "project", id: p.id, title: `Project: ${p.name}`, status: p.status });
    itemsByDay.set(p.due_date, arr);
  });

  const upcoming = (tasks ?? [])
    .filter((t) => t.due_date && isAfter(new Date(t.due_date), addDays(today, -1)) && t.status !== "done")
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 8);

  const prevMonth = format(addDays(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addDays(monthEnd, 1), "yyyy-MM");

  return (
    <>
      <PageHeader
        title="Timeline"
        subtitle="Deadlines and milestones across the company."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/timeline?m=${prevMonth}`} className="btn btn-ghost border-white/10">←</Link>
            <span className="font-display text-bone">{format(month, "MMMM yyyy")}</span>
            <Link href={`/timeline?m=${nextMonth}`} className="btn btn-ghost border-white/10">→</Link>
          </div>
        }
      />

      <section className="card overflow-hidden">
        <div className="grid grid-cols-7 text-[11px] uppercase tracking-wider text-bone-300/60 border-b border-white/5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-3 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const items = itemsByDay.get(key) ?? [];
            const muted = !isSameMonth(d, monthStart);
            const isToday = isSameDay(d, today);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[100px] border-b border-r border-white/5 p-2 align-top",
                  muted && "bg-ink-900/40",
                  isToday && "ring-1 ring-mint/40 bg-mint/5",
                )}
              >
                <div className={cn("text-xs", muted ? "text-bone-300/30" : "text-bone-300/70")}>
                  {format(d, "d")}
                </div>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((it) => (
                    <Link
                      key={it.id}
                      href={it.kind === "task" ? `/tasks/${it.id}` : `/projects/${it.id}`}
                      className={cn(
                        "block rounded-md px-1.5 py-1 text-[11px] truncate border",
                        it.kind === "task"
                          ? "bg-mint/10 border-mint/20 text-mint"
                          : "bg-violet-500/10 border-violet-500/20 text-violet-200",
                      )}
                    >
                      {it.title}
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <div className="text-[10px] text-bone-300/60 px-1">+{items.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-bone text-xl mb-3">Upcoming deadlines</h2>
        <div className="card overflow-hidden">
          <ul className="divide-y divide-white/5">
            {upcoming.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-bone-300/50">Nothing on the horizon. ✨</li>
            )}
            {upcoming.map((t) => (
              <li key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <Link href={`/tasks/${t.id}`} className="text-bone hover:text-mint">{t.title}</Link>
                <div className="flex items-center gap-2">
                  <TaskStatusChip status={t.status as any} />
                  <span className="chip">{format(new Date(t.due_date!), "MMM d")}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
