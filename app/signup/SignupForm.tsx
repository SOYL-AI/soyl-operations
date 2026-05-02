"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${siteUrl}/auth/callback`,
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
        <input type="password" minLength={8} required className="input"
               value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <p className="text-[11px] text-bone-300/50">
        New accounts join as Employee. A manager or the CEO can adjust your role from the Team page after onboarding.
      </p>
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {info && <div className="rounded-lg border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{info}</div>}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create account"}
      </button>
    </form>
  );
}
