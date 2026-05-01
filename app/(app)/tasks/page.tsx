import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { TaskStatusChip, PriorityChip } from "@/components/StatusChip";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/Empty";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "todo", "in_progress", "review", "blocked", "done"] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; assignee?: string; q?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });

  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  if (params.assignee === "me") query = query.eq("assignee_id", profile.id);
  if (params.q) query = query.ilike("title", `%${params.q}%`);

  const [{ data: tasks }, { data: people }, { data: projects }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name, avatar_url, role"),
    supabase.from("projects").select("id, name"),
  ]);

  const peopleById = new Map((people ?? []).map((p) => [p.id, p]));
  const projectsById = new Map((projects ?? []).map((p) => [p.id, p]));

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Create, assign, and track work across the company."
        actions={
          <Link href="/tasks/new" className="btn btn-primary">
            <Plus className="h-4 w-4" /> New task
          </Link>
        }
      />

      <form className="card card-pad mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search tasks…"
          className="input"
        />
        <select name="status" defaultValue={params.status ?? "all"} className="select sm:w-44">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</option>
          ))}
        </select>
        <select name="assignee" defaultValue={params.assignee ?? "all"} className="select sm:w-44">
          <option value="all">All assignees</option>
          <option value="me">Assigned to me</option>
        </select>
        <button className="btn btn-ghost border-white/10">Filter</button>
      </form>

      {(tasks ?? []).length === 0 ? (
        <EmptyState
          title="No tasks match"
          body="Try clearing filters, or create a new task."
          action={<Link href="/tasks/new" className="btn btn-primary"><Plus className="h-4 w-4" />New task</Link>}
        />
      ) : (
        <div className="table-shell">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Title</th>
                <th className="th">Project</th>
                <th className="th">Assignee</th>
                <th className="th">Status</th>
                <th className="th">Priority</th>
                <th className="th">Due</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((t) => {
                const owner = t.assignee_id ? peopleById.get(t.assignee_id) : undefined;
                const proj = t.project_id ? projectsById.get(t.project_id) : undefined;
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="td">
                      <Link href={`/tasks/${t.id}`} className="text-bone hover:text-mint">{t.title}</Link>
                    </td>
                    <td className="td text-bone-300/70">{proj?.name ?? "—"}</td>
                    <td className="td">
                      {owner ? (
                        <span className="inline-flex items-center gap-2">
                          <Avatar name={owner.full_name} size={22} />
                          <span className="text-bone-300/80 text-xs">{owner.full_name}</span>
                        </span>
                      ) : <span className="chip">Unassigned</span>}
                    </td>
                    <td className="td"><TaskStatusChip status={t.status as any} /></td>
                    <td className="td"><PriorityChip priority={t.priority as any} /></td>
                    <td className="td text-bone-300/70 text-xs">
                      {t.due_date ? format(new Date(t.due_date), "MMM d, yyyy") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
