"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/lib/actions/finance";
import { Loader2, Plus, X } from "lucide-react";

export function NewTransaction({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New transaction
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <form
            action={(fd) =>
              start(async () => {
                setError(null);
                const res = await createTransaction(fd);
                if (res?.error) setError(res.error);
                else { setOpen(false); router.refresh(); }
              })
            }
            className="card card-pad w-full max-w-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-bone">New transaction</h3>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost p-1.5"><X className="h-4 w-4"/></button>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Type</label>
                <select name="type" className="select" defaultValue="expense">
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" name="occurred_on" defaultValue={new Date().toISOString().slice(0,10)} className="input" />
              </div>
              <div>
                <label className="label">Amount</label>
                <input type="number" min={0} step="0.01" name="amount" required className="input" />
              </div>
              <div>
                <label className="label">Currency</label>
                <select name="currency" className="select" defaultValue="INR">
                  <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <input name="category" className="input" placeholder="Salaries, Tools, Consulting…" />
              </div>
              <div>
                <label className="label">Project</label>
                <select name="project_id" className="select">
                  <option value="">— None —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea name="description" rows={2} className="textarea" />
              </div>
            </div>
            {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost border-white/10">Cancel</button>
              <button className="btn btn-primary" disabled={pending}>
                {pending ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving…</> : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
