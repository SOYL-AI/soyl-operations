"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatus, reassignTask, deleteTask } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "blocked", "done"];

export function TaskActions({
  taskId,
  status,
  assigneeId,
  people,
  isManager,
}: {
  taskId: string;
  status: TaskStatus;
  assigneeId: string | null;
  people: { id: string; full_name: string | null; role: string }[];
  isManager: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label className="label">Status</label>
        <select
          className="select"
          value={status}
          disabled={pending}
          onChange={(e) =>
            start(async () => {
              await updateTaskStatus(taskId, e.target.value as TaskStatus);
              router.refresh();
            })
          }
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {isManager && (
        <div>
          <label className="label">Assignee</label>
          <select
            className="select"
            value={assigneeId ?? ""}
            disabled={pending}
            onChange={(e) =>
              start(async () => {
                await reassignTask(taskId, e.target.value || null);
                router.refresh();
              })
            }
          >
            <option value="">— Unassigned —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      )}

      {isManager && (
        <button
          type="button"
          className="btn btn-danger w-full"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this task?")) return;
            start(async () => {
              await deleteTask(taskId);
              router.push("/tasks");
            });
          }}
        >
          Delete task
        </button>
      )}
    </div>
  );
}
