import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage, isCEO, isSuperAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { TaskStatusChip } from "@/components/StatusChip";
import { RoleSelect } from "./RoleSelect";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

function roleLabel(role: string) {
  if (role === "super_admin") return "System admin";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function TeamPage() {
  const me = await requireProfile();
  const isManager = canManage(me.role);
  const canAssignCeo = isCEO(me.role) || isSuperAdmin(me.role);
  const supabase = await createClient();

  const [{ data: people }, { data: tasks }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("tasks").select("id,title,status,priority,due_date,assignee_id"),
  ]);

  const tasksByUser = new Map<string, any[]>();
  (tasks ?? []).forEach((t) => {
    if (!t.assignee_id) return;
    if (!tasksByUser.has(t.assignee_id)) tasksByUser.set(t.assignee_id, []);
    tasksByUser.get(t.assignee_id)!.push(t);
  });

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Who's doing what — at a glance."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {(people ?? []).map((p) => {
          const list = tasksByUser.get(p.id) ?? [];
          const open = list.filter((t) => t.status !== "done").length;
          const done = list.filter((t) => t.status === "done").length;
          const isAdmin = p.role === "super_admin";
          // Super admin row is never role-editable from the UI.
          const showRoleSelect = isManager && p.id !== me.id && !isAdmin;
          return (
            <div key={p.id} className="card card-pad">
              <div className="flex items-start gap-3">
                <Avatar name={p.full_name} size={44} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display text-bone flex items-center gap-2 truncate">
                        {p.full_name ?? "—"}
                        {isAdmin && (
                          <span
                            className="chip chip-violet inline-flex items-center gap-1"
                            title="Seeded system administrator — role cannot be changed via the UI"
                          >
                            <ShieldCheck className="h-3 w-3" /> System admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-bone-300/60 truncate">{p.title || p.email}</div>
                    </div>
                    {showRoleSelect ? (
                      <RoleSelect id={p.id} role={p.role} canAssignCeo={canAssignCeo} />
                    ) : (
                      <span className="chip chip-mint capitalize">{roleLabel(p.role)}</span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2 text-xs">
                    <span className="chip">{open} open</span>
                    <span className="chip chip-mint">{done} done</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="stat-label">Active work</div>
                <ul className="mt-2 space-y-1.5">
                  {list.filter((t) => t.status !== "done").slice(0, 4).map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-bone-200 truncate">{t.title}</span>
                      <TaskStatusChip status={t.status} />
                    </li>
                  ))}
                  {list.filter((t) => t.status !== "done").length === 0 && (
                    <li className="text-sm text-bone-300/50">No active tasks.</li>
                  )}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
