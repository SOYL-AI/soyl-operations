"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Hit =
  | { kind: "task"; id: string; title: string; subtitle?: string | null }
  | { kind: "project"; id: string; title: string; subtitle?: string | null }
  | { kind: "person"; id: string; title: string; subtitle?: string | null };

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!q || q.length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const like = `%${q.replace(/[%_]/g, "")}%`;
      const [tasks, projects, people] = await Promise.all([
        supabase.from("tasks").select("id, title, status").ilike("title", like).limit(5),
        supabase.from("projects").select("id, name, status").ilike("name", like).limit(5),
        supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .or(`full_name.ilike.${like},email.ilike.${like}`)
          .limit(5),
      ]);
      const result: Hit[] = [
        ...(tasks.data ?? []).map((t) => ({
          kind: "task" as const,
          id: t.id,
          title: t.title,
          subtitle: t.status,
        })),
        ...(projects.data ?? []).map((p) => ({
          kind: "project" as const,
          id: p.id,
          title: p.name,
          subtitle: p.status,
        })),
        ...(people.data ?? []).map((p) => ({
          kind: "person" as const,
          id: p.id,
          title: p.full_name ?? p.email ?? "—",
          subtitle: p.role,
        })),
      ];
      setHits(result);
      setLoading(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  function go(h: Hit) {
    if (h.kind === "task") router.push(`/tasks/${h.id}`);
    else if (h.kind === "project") router.push(`/projects/${h.id}`);
    else router.push(`/team`);
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={wrap} className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-700/60 px-3 py-1.5">
        {loading ? (
          <Loader2 className="h-4 w-4 text-bone-300/60 animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-bone-300/60" />
        )}
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search tasks, projects, people…"
          className="bg-transparent flex-1 text-sm placeholder:text-bone-300/40 focus:outline-none"
        />
      </div>
      {open && q.length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 card overflow-hidden">
          {hits.length === 0 && !loading && (
            <div className="px-4 py-3 text-sm text-bone-300/60">No matches.</div>
          )}
          <ul className="divide-y divide-white/5 max-h-96 overflow-y-auto">
            {hits.map((h, i) => (
              <li key={`${h.kind}-${h.id}-${i}`}>
                <button
                  type="button"
                  onClick={() => go(h)}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/[0.04] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-bone truncate">{h.title}</div>
                    <div className="text-[11px] text-bone-300/60 capitalize">
                      {h.kind} · {h.subtitle ?? "—"}
                    </div>
                  </div>
                  <span className="chip text-[10px] capitalize">{h.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
