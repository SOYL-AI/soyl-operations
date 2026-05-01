import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority, ProjectStatus } from "@/lib/types";

export function TaskStatusChip({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, { label: string; cls: string }> = {
    todo:        { label: "To do",       cls: "chip-slate" },
    in_progress: { label: "In progress", cls: "chip-mint" },
    review:      { label: "In review",   cls: "chip-violet" },
    done:        { label: "Done",        cls: "chip-mint" },
    blocked:     { label: "Blocked",     cls: "chip-red" },
  };
  return <span className={cn("chip", map[status].cls)}>{map[status].label}</span>;
}

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  const map: Record<TaskPriority, string> = {
    low: "chip-slate",
    medium: "chip-violet",
    high: "chip-amber",
    urgent: "chip-red",
  };
  return <span className={cn("chip capitalize", map[priority])}>{priority}</span>;
}

export function ProjectStatusChip({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, { label: string; cls: string }> = {
    planning:  { label: "Planning",  cls: "chip-violet" },
    active:    { label: "Active",    cls: "chip-mint" },
    on_hold:   { label: "On hold",   cls: "chip-amber" },
    completed: { label: "Completed", cls: "chip-slate" },
    cancelled: { label: "Cancelled", cls: "chip-red" },
  };
  return <span className={cn("chip", map[status].cls)}>{map[status].label}</span>;
}
