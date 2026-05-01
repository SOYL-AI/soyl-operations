"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProjectProgress } from "@/lib/actions/projects";
import { Loader2 } from "lucide-react";

export function ProgressEditor({ id, progress }: { id: string; progress: number }) {
  const router = useRouter();
  const [val, setVal] = useState(progress);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-xl border border-white/5 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-bone-300/70">Update progress</span>
        <span className="text-bone text-sm">{val}%</span>
      </div>
      <input
        type="range"
        min={0} max={100} step={1}
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        className="mt-2 w-full accent-[#AFD0CC]"
      />
      <button
        className="btn btn-primary mt-3"
        disabled={pending || val === progress}
        onClick={() =>
          start(async () => {
            await updateProjectProgress(id, val);
            router.refresh();
          })
        }
      >
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save progress"}
      </button>
    </div>
  );
}
