import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { TaskStatusChip, PriorityChip } from "@/components/StatusChip";
import { TaskActions } from "./TaskActions";
import { CommentForm } from "./CommentForm";
import { UpdateForm } from "./UpdateForm";

export const dynamic = "force-dynamic";

export default async function TaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireProfile();
  const supabase = await createClient();

  const { data: task } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!task) notFound();

  const projectPromise = task.project_id
    ? supabase.from("projects").select("id, name").eq("id", task.project_id).maybeSingle()
    : Promise.resolve({ data: null as { id: string; name: string } | null });

  const [{ data: people }, { data: comments }, { data: updates }, projectRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, role"),
    supabase.from("task_comments").select("*").eq("task_id", id).order("created_at", { ascending: true }),
    supabase.from("task_updates").select("*").eq("task_id", id).order("created_at", { ascending: false }),
    projectPromise,
  ]);
  const project = projectRes.data;

  const peopleById = new Map((people ?? []).map((p) => [p.id, p]));
  const assignee = task.assignee_id ? peopleById.get(task.assignee_id) : undefined;
  const creator = task.created_by ? peopleById.get(task.created_by) : undefined;
  const editable = canManage(me.role) || task.assignee_id === me.id;

  return (
    <>
      <PageHeader
        title={task.title}
        subtitle={
          project ? (
            <>Project · <Link href={`/projects/${project.id}`} className="text-mint hover:underline">{project.name}</Link></>
          ) : "No project"
        }
        actions={<Link href="/tasks" className="btn btn-ghost border-white/10">← Back</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="card card-pad">
            <div className="flex flex-wrap items-center gap-2">
              <TaskStatusChip status={task.status as any} />
              <PriorityChip priority={task.priority as any} />
              {task.due_date && (
                <span className="chip">Due {format(new Date(task.due_date), "MMM d, yyyy")}</span>
              )}
            </div>
            {task.description && (
              <p className="mt-4 text-sm text-bone-200 whitespace-pre-wrap">{task.description}</p>
            )}
            {!task.description && <p className="mt-4 text-sm text-bone-300/50">No description.</p>}
          </div>

          <div className="card card-pad">
            <h3 className="font-display text-bone">Comments</h3>
            <div className="mt-4 space-y-4">
              {(comments ?? []).map((c) => {
                const u = peopleById.get(c.user_id);
                return (
                  <div key={c.id} className="flex gap-3">
                    <Avatar name={u?.full_name} size={28} />
                    <div className="flex-1">
                      <div className="text-xs text-bone-300/60">
                        <span className="text-bone">{u?.full_name ?? "Someone"}</span>{" · "}
                        {format(new Date(c.created_at), "MMM d, HH:mm")}
                      </div>
                      <div className="mt-1 text-sm text-bone-200 whitespace-pre-wrap">{c.body}</div>
                    </div>
                  </div>
                );
              })}
              {(comments ?? []).length === 0 && (
                <p className="text-sm text-bone-300/50">Be the first to comment.</p>
              )}
            </div>
            <div className="mt-4">
              <CommentForm taskId={task.id} />
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="font-display text-bone">Activity & updates</h3>
            {editable && (
              <div className="mt-3">
                <UpdateForm taskId={task.id} />
              </div>
            )}
            <ul className="mt-4 space-y-3 text-sm">
              {(updates ?? []).map((u) => {
                const p = peopleById.get(u.user_id);
                return (
                  <li key={u.id} className="rounded-xl border border-white/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-bone-300/80">
                        <span className="text-bone">{p?.full_name ?? "Someone"}</span>{" "}
                        {u.status_change ? (
                          <>changed status to <span className="text-mint">{u.status_change}</span></>
                        ) : "posted an update"}
                      </span>
                      <span className="text-xs text-bone-300/50 whitespace-nowrap">
                        {format(new Date(u.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                    {u.note && <p className="mt-1 text-sm text-bone-200 whitespace-pre-wrap">{u.note}</p>}
                  </li>
                );
              })}
              {(updates ?? []).length === 0 && (
                <li className="text-bone-300/50">No activity yet.</li>
              )}
            </ul>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <div className="stat-label">Assignee</div>
            {assignee ? (
              <div className="mt-2 flex items-center gap-2">
                <Avatar name={assignee.full_name} size={32} />
                <div>
                  <div className="text-bone text-sm">{assignee.full_name}</div>
                  <div className="text-xs text-bone-300/60">{assignee.role === "super_admin" ? "System admin" : assignee.role.charAt(0).toUpperCase() + assignee.role.slice(1)}</div>
                </div>
              </div>
            ) : <div className="mt-2 text-sm text-bone-300/60">Unassigned</div>}

            <div className="mt-4 stat-label">Created by</div>
            <div className="mt-1 text-sm text-bone-300/80">{creator?.full_name ?? "—"}</div>
            <div className="mt-1 text-xs text-bone-300/50">{format(new Date(task.created_at), "MMM d, yyyy")}</div>
          </div>

          <div className="card card-pad">
            <h3 className="font-display text-bone text-base">Actions</h3>
            {editable ? (
              <TaskActions
                taskId={task.id}
                status={task.status as any}
                assigneeId={task.assignee_id}
                people={people ?? []}
                isManager={canManage(me.role)}
              />
            ) : (
              <p className="mt-2 text-sm text-bone-300/60">
                Read-only. Reach out to a manager or the assignee to change status.
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
