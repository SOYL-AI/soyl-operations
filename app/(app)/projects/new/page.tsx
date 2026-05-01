import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { createProject } from "@/lib/actions/projects";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const me = await requireProfile();
  if (!canManage(me.role)) redirect("/projects");

  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("id, full_name").order("full_name");

  return (
    <>
      <PageHeader title="New project" subtitle="Define scope, owner, budget and timeline." />
      <form action={createProject} className="card card-pad max-w-2xl space-y-4">
        <div>
          <label className="label">Name</label>
          <input name="name" required className="input" placeholder="PMS Product Launch" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea name="description" rows={3} className="textarea" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select name="status" className="select" defaultValue="planning">
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label">Client</label>
            <input name="client_name" className="input" placeholder="Internal R&D, Acme Corp…" />
          </div>
          <div>
            <label className="label">Owner</label>
            <select name="owner_id" className="select" defaultValue={me.id}>
              {(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Budget (₹)</label>
            <input name="budget" type="number" min={0} step={1000} className="input" />
          </div>
          <div>
            <label className="label">Start date</label>
            <input type="date" name="start_date" className="input" />
          </div>
          <div>
            <label className="label">Due date</label>
            <input type="date" name="due_date" className="input" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn btn-primary">Create project</button>
        </div>
      </form>
    </>
  );
}
