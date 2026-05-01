"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTaskComment } from "@/lib/actions/tasks";
import { Send, Loader2 } from "lucide-react";

export function CommentForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          await addTaskComment(fd);
          formRef.current?.reset();
          router.refresh();
        })
      }
      className="flex items-end gap-2"
    >
      <input type="hidden" name="task_id" value={taskId} />
      <textarea
        name="body"
        required
        rows={2}
        className="textarea"
        placeholder="Add a comment, tag a teammate, share a link…"
      />
      <button className="btn btn-primary" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Post
      </button>
    </form>
  );
}
