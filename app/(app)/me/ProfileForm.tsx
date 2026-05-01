"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile } from "@/lib/actions/team";
import { Loader2, Check } from "lucide-react";

export function ProfileForm({ fullName, title }: { fullName: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  return (
    <form
      action={(fd) =>
        start(async () => {
          await updateMyProfile(fd);
          setSaved(true);
          router.refresh();
          setTimeout(() => setSaved(false), 2000);
        })
      }
      className="space-y-3"
    >
      <div>
        <label className="label">Full name</label>
        <input name="full_name" defaultValue={fullName} className="input" />
      </div>
      <div>
        <label className="label">Title</label>
        <input name="title" defaultValue={title} className="input" placeholder="ML Intern, Founder, Designer…" />
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> :
          saved ? <><Check className="h-4 w-4" /> Saved</> : "Save profile"}
      </button>
    </form>
  );
}
