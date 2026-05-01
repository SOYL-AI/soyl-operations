"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTransaction } from "@/lib/actions/finance";

export function DeleteTxButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-ghost border-white/10 px-2 py-1 text-xs"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this transaction?")) return;
        start(async () => {
          await deleteTransaction(id);
          router.refresh();
        });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
