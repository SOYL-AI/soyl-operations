"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/lib/actions/notifications";
import { CheckCheck } from "lucide-react";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-ghost border-white/10 text-xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllRead();
          router.refresh();
        })
      }
    >
      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
    </button>
  );
}
