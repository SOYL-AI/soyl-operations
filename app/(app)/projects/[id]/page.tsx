import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ProjectStatusChip, TaskStatusChip } from "@/components/StatusChip";
import { Avatar } from "@/components/Avatar";
import { ProgressEditor } from "./ProgressEditor";
import { formatCurrency, pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireProfile();
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) notFound();

  const [{ data: tasks }, { data: people }] = await Promise.all([
    supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, avatar_url"),
  ]);

  let revenue = 0, expense = 0;
  if (canManage(me.role)) {
    const { data: tx } = await supabase.from("transactions").select("type,amount").eq("project_id", id);
    (tx ?? []).forEach((t) => {
      if (t.type === "revenue") revenue += Number(t.amount);
      else expense += Number(t.amount);
    });
  }

  const peopleById = new Map((people ?? []).map((p) => [p.id, p]));
  const owner = project.owner_id ? peopleById.get(project.owner_id) : undefined;
  const tDone = (tasks ?? []).filter((t) => t.status === "done").length;
  const tTotal = (tasks ?? []).length;

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={project.client_name ?? "Internal"}
        actions={
          <div className="flex items-center gap-2">
            <ProjectStatusChip status={project.status as any} />
            <Link href="/projects" className="btn btn-ghost border-white/10">← All projects</Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="card card-pad">
            {project.description ? (
              <p className="text-sm text-bone-200 whitespace-pre-wrap">{project.description}</p>
            ) : (
              <p className="text-sm text-bone-300/50">No description.</p>
            )}
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <Stat label="Progress" value={`${project.progress}%`} />
              <Stat label="Tasks" value={`${tDone}/${tTotal}`} />
              <Stat label="Completion" value={`${pct(tDone, tTotal)}%`} />
            </div>

            {canManage(me.role) && (
              <div className="mt-4">
                <ProgressEditor id={project.id} progress={project.progress} />
              </div>
            )}
          </div>

          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-bone">Tasks in this project</h3>
              <Link href={`/tasks/new`} className="btn btn-ghost border-white/10 text-xs">Add task</Link>
            </div>
            <div className="mt-3 divide-y divide-white/5">
              {(tasks ?? []).map((t) => {
                const owner = t.assignee_id ? peopleById.get(t.assignee_id) : undefined;
                return (
                  <div key={t.id} className="flex items-center justify-between py-3 gap-3">
                    <Link href={`/tasks/${t.id}`} className="text-sm text-bone hover:text-mint truncate">
                      {t.title}
                    </Link>
                    <div className="flex items-center gap-2">
                      <TaskStatusChip status={t.status as any} />
                      {owner && <Avatar name={owner.full_name} size={22} />}
                    </div>
                  </div>
                );
              })}
              {(tasks ?? []).length === 0 && (
                <p className="text-sm text-bone-300/50 py-4">No tasks. Create one to start tracking.</p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <div className="stat-label">Owner</div>
            {owner ? (
              <div className="mt-2 flex items-center gap-2">
                <Avatar name={owner.full_name} size={28} />
                <span className="text-bone text-sm">{owner.full_name}</span>
              </div>
            ) : <div className="mt-2 text-sm text-bone-300/60">No owner</div>}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="stat-label">Start</div>
                <div className="text-bone-200 mt-1">
                  {project.start_date ? format(new Date(project.start_date), "MMM d, yyyy") : "—"}
                </div>
              </div>
              <div>
                <div className="stat-label">Due</div>
                <div className="text-bone-200 mt-1">
                  {project.due_date ? format(new Date(project.due_date), "MMM d, yyyy") : "—"}
                </div>
              </div>
            </div>
            {project.budget && (
              <div className="mt-4">
                <div className="stat-label">Budget</div>
                <div className="text-bone-200 mt-1">{formatCurrency(Number(project.budget))}</div>
              </div>
            )}
          </div>

          {canManage(me.role) && (
            <div className="card card-pad">
              <div className="stat-label">Finance</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-bone-300/60">Revenue</div>
                  <div className="text-bone text-base mt-0.5">{formatCurrency(revenue)}</div>
                </div>
                <div>
                  <div className="text-bone-300/60">Expense</div>
                  <div className="text-bone text-base mt-0.5">{formatCurrency(expense)}</div>
                </div>
              </div>
              <div className="mt-3 stat-label">Profit</div>
              <div className={`mt-1 ${revenue - expense >= 0 ? "text-mint" : "text-red-300"} text-lg font-display`}>
                {formatCurrency(revenue - expense)}
              </div>

              {project.budget && Number(project.budget) > 0 && (() => {
                const budget = Number(project.budget);
                const used = expense;
                const usedPct = Math.min(100, Math.round((used / budget) * 100));
                const overBudget = used > budget;
                const barCls = overBudget ? "bg-red-400" : usedPct > 80 ? "bg-amber-300" : "bg-mint";
                return (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="stat-label">Budget burn</span>
                      <span className={overBudget ? "text-red-300" : "text-bone-300/70"}>
                        {usedPct}% {overBudget && "· over"}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full ${barCls}`} style={{ width: `${usedPct}%` }} />
                    </div>
                    <div className="mt-1.5 text-[11px] text-bone-300/60">
                      {formatCurrency(used)} of {formatCurrency(budget)}
                      {overBudget && <span className="text-red-300"> · {formatCurrency(used - budget)} over</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 px-3 py-3">
      <div className="stat-label">{label}</div>
      <div className="text-bone text-lg mt-1 font-display">{value}</div>
    </div>
  );
}
