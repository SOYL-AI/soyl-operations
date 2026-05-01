"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReview } from "@/lib/actions/reviews";
import { Loader2, Plus, X } from "lucide-react";

export function NewReview({ people }: { people: { id: string; full_name: string | null; role: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New review</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <form
            action={(fd) =>
              start(async () => {
                setError(null);
                const res = await createReview(fd);
                if (res?.error) setError(res.error);
                else { setOpen(false); router.refresh(); }
              })
            }
            className="card card-pad w-full max-w-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-bone">New review</h3>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost p-1.5"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Reviewee</label>
                <select name="reviewee_id" required className="select">
                  <option value="">— Select —</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Period</label>
                <input name="period" required className="input" defaultValue={new Date().toISOString().slice(0, 7)} placeholder="2026-04 or 2026-Q1" />
              </div>
              <div>
                <label className="label">Rating (1-5)</label>
                <input type="number" name="rating" min={1} max={5} required defaultValue={4} className="input" />
              </div>
              <div>
                <label className="label">Feedback</label>
                <textarea name="feedback" rows={3} className="textarea" />
              </div>
            </div>
            {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost border-white/10">Cancel</button>
              <button className="btn btn-primary" disabled={pending}>
                {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
