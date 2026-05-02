"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { addTaskUpdate } from "@/lib/actions/tasks";
import { Loader2, Send } from "lucide-react";

export function UpdateForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await addTaskUpdate(fd);
          if (res?.error) {
            setError(res.error);
            return;
          }
          formRef.current?.reset();
          router.refresh();
        })
      }
      className="flex items-end gap-2"
    >
      <input type="hidden" name="task_id" value={taskId} />
      <textarea
        name="note"
        required
        rows={2}
        className="textarea"
        placeholder="Post a daily update — what moved today, what's next, blockers…"
      />
      <button className="btn btn-primary" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Post
      </button>
      {error && <span className="text-xs text-red-300">{error}</span>}
    </form>
  );
}
