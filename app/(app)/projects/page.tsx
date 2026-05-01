import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ProjectStatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/Empty";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const me = await requireProfile();
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: people } = await supabase.from("profiles").select("id, full_name, avatar_url");

  const peopleById = new Map((people ?? []).map((p) => [p.id, p]));

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Big bets, client engagements, and ongoing initiatives."
        actions={canManage(me.role) && (
          <Link href="/projects/new" className="btn btn-primary"><Plus className="h-4 w-4" />New project</Link>
        )}
      />

      {(projects ?? []).length === 0 ? (
        <EmptyState
          title="No projects yet"
          body={canManage(me.role) ? "Create your first project to start tracking." : "Ask a manager to create a project."}
          action={canManage(me.role) ? <Link href="/projects/new" className="btn btn-primary"><Plus className="h-4 w-4"/>New project</Link> : null}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(projects ?? []).map((p) => {
            const owner = p.owner_id ? peopleById.get(p.owner_id) : undefined;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="card card-pad block hover:bg-white/[0.03] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-bone truncate">{p.name}</h3>
                    {p.client_name && <div className="text-xs text-bone-300/60">{p.client_name}</div>}
                  </div>
                  <ProjectStatusChip status={p.status as any} />
                </div>
                {p.description && <p className="mt-2 text-sm text-bone-300/70 line-clamp-2">{p.description}</p>}
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full bg-mint" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-bone-300/60">
                  <span>{p.progress}% complete</span>
                  {p.due_date && <span>Due {format(new Date(p.due_date), "MMM d")}</span>}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {owner ? <Avatar name={owner.full_name} size={22} /> : null}
                  <span className="text-xs text-bone-300/70">{owner?.full_name ?? "No owner"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
