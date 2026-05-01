"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type { Role } from "@/lib/types";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (data.session) {
      router.push("/overview");
      router.refresh();
    } else {
      setInfo("Check your email to confirm your account, then sign in.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Full name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="label">Email</label>
        <input type="email" autoComplete="email" required className="input"
               value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Password</label>
        <input type="password" minLength={6} required className="input"
               value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="label">Role</label>
        <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="intern">Intern</option>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="ceo">CEO</option>
        </select>
        <p className="mt-1 text-[11px] text-bone-300/50">CEO/Manager roles can be reassigned later from Team page.</p>
      </div>
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {info && <div className="rounded-lg border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{info}</div>}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create account"}
      </button>
    </form>
  );
}
