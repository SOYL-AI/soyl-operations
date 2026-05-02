import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isSuperAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

const SECURITY_ACTIONS = [
  "profile.role_changed",
  "transaction.created",
  "transaction.deleted",
  "task.deleted",
  "project.created",
];

const ACTION_LABEL: Record<string, string> = {
  "profile.role_changed":  "Role changed",
  "transaction.created":   "Transaction created",
  "transaction.deleted":   "Transaction deleted",
  "task.deleted":          "Task deleted",
  "project.created":       "Project created",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const me = await requireProfile();
  if (!isSuperAdmin(me.role)) redirect("/overview");

  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: log }, { data: people }, { data: profiles }] = await Promise.all([
    supabase
      .from("activity_log")
      .select("*")
      .in("action", params.kind && SECURITY_ACTIONS.includes(params.kind) ? [params.kind] : SECURITY_ACTIONS)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("id, full_name, email, role"),
    supabase.from("profiles").select("id, full_name, email, role"),
  ]);

  const peopleById = new Map((people ?? []).map((p) => [p.id, p]));

  const counts = SECURITY_ACTIONS.reduce(
    (acc, k) => {
      acc[k] = (log ?? []).filter((a) => a.action === k).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const ceoCount = (profiles ?? []).filter((p) => p.role === "ceo").length;
  const adminCount = (profiles ?? []).filter((p) => p.role === "super_admin").length;

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-violet-300" />
            System administrator view — sensitive actions only.
          </span>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Role changes (200 rows)" value={counts["profile.role_changed"] ?? 0} />
        <Stat label="Transactions created" value={counts["transaction.created"] ?? 0} />
        <Stat label="Transactions deleted" value={counts["transaction.deleted"] ?? 0} accent="amber" />
        <Stat label="Tasks deleted" value={counts["task.deleted"] ?? 0} accent="amber" />
      </section>

      {(ceoCount === 0 || adminCount === 0) && (
        <div className="card card-pad mb-6 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-300 mt-0.5" />
            <div>
              <div className="font-display text-amber-200">Configuration warning</div>
              <ul className="mt-1 text-sm text-amber-100/80 list-disc pl-4 space-y-1">
                {adminCount === 0 && (
                  <li>No system admin exists. Confirm <code className="text-amber-200">app.super_admin_email</code> is set in your database and that user has signed up.</li>
                )}
                {ceoCount === 0 && (
                  <li>No CEO is assigned. Promote a manager to CEO from the Team page.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <section className="card card-pad mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <FilterLink current={params.kind} value={undefined} label="All security events" />
          {SECURITY_ACTIONS.map((a) => (
            <FilterLink key={a} current={params.kind} value={a} label={ACTION_LABEL[a]} />
          ))}
        </div>
      </section>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">When</th>
              <th className="th">Actor</th>
              <th className="th">Action</th>
              <th className="th">Target</th>
              <th className="th">Details</th>
            </tr>
          </thead>
          <tbody>
            {(log ?? []).length === 0 && (
              <tr><td colSpan={5} className="td text-center text-bone-300/50">No security events yet.</td></tr>
            )}
            {(log ?? []).map((a) => {
              const actor = a.actor_id ? peopleById.get(a.actor_id) : null;
              const target = a.entity_id ? peopleById.get(a.entity_id) : null;
              const meta = a.metadata as Record<string, any> | null;
              return (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="td text-xs text-bone-300/70 whitespace-nowrap">
                    {format(new Date(a.created_at), "MMM d, HH:mm")}
                  </td>
                  <td className="td">
                    {actor ? (
                      <span className="inline-flex items-center gap-2">
                        <Avatar name={actor.full_name} size={22} />
                        <span className="text-bone-300/80 text-xs">{actor.full_name ?? actor.email}</span>
                      </span>
                    ) : (
                      <span className="text-bone-300/50 text-xs">—</span>
                    )}
                  </td>
                  <td className="td">
                    <span className={"chip " + actionChipClass(a.action)}>
                      {ACTION_LABEL[a.action] ?? a.action}
                    </span>
                  </td>
                  <td className="td text-bone-300/80 text-xs">
                    {a.entity_type === "profile" && target
                      ? target.full_name ?? target.email ?? a.entity_id
                      : a.entity_type}
                  </td>
                  <td className="td text-xs text-bone-300/70 max-w-md">
                    {a.action === "profile.role_changed" && meta && (
                      <span>
                        <span className="text-bone-300/60">{meta.from ?? "—"}</span>
                        {" → "}
                        <span className="text-bone">{meta.to ?? "—"}</span>
                      </span>
                    )}
                    {a.action === "transaction.created" && meta && (
                      <span>
                        {meta.type} · {meta.category ?? "—"} · {meta.amount}
                      </span>
                    )}
                    {a.action === "project.created" && meta && (
                      <span>{meta.name}</span>
                    )}
                    {a.action === "task.deleted" && (
                      <span className="text-bone-300/50">Task removed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[11px] text-bone-300/50">
        Showing the last 200 security-relevant events. The full activity feed (including comments,
        status changes, and routine updates) is on the <a href="/activity" className="text-mint">Activity log</a> page.
      </p>
    </>
  );
}

function actionChipClass(action: string) {
  if (action.startsWith("profile.role")) return "chip-violet";
  if (action.endsWith(".deleted")) return "chip-red";
  if (action.endsWith(".created")) return "chip-mint";
  return "chip-slate";
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber";
}) {
  return (
    <div className="card card-pad">
      <div className="stat-label">{label}</div>
      <div className={"stat-num mt-2 " + (accent === "amber" && value > 0 ? "text-amber-300" : "")}>
        {value}
      </div>
    </div>
  );
}

function FilterLink({
  current,
  value,
  label,
}: {
  current: string | undefined;
  value: string | undefined;
  label: string;
}) {
  const active = current === value || (!current && !value);
  const href = value ? `/audit?kind=${value}` : "/audit";
  return (
    <a
      href={href}
      className={
        "rounded-lg border px-3 py-1 text-xs " +
        (active
          ? "border-mint/40 bg-mint/10 text-mint"
          : "border-white/10 text-bone-300/70 hover:bg-white/5")
      }
    >
      {label}
    </a>
  );
}
