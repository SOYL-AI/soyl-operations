"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/lib/actions/tasks";
import { Loader2 } from "lucide-react";

export function NewTaskForm({
  people,
  projects,
}: {
  people: { id: string; full_name: string | null; role: string }[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card card-pad max-w-2xl space-y-4"
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await createTask(fd);
          if ("error" in res && res.error) setError(res.error);
          else if ("id" in res) router.push(`/tasks/${res.id}`);
        })
      }
    >
      <div>
        <label className="label">Title</label>
        <input name="title" required className="input" placeholder="Ship onboarding emails" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" rows={4} className="textarea" placeholder="Optional context, links, acceptance criteria…" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Project</label>
          <select name="project_id" className="select">
            <option value="">— None —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Assignee</label>
          <select name="assignee_id" className="select">
            <option value="">— Unassigned —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select name="priority" defaultValue="medium" className="select">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="label">Due date</label>
          <input type="date" name="due_date" className="input" />
        </div>
      </div>
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create task"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn btn-ghost border-white/10">Cancel</button>
      </div>
    </form>
  );
}
