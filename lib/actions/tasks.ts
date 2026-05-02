"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { TaskPriority, TaskStatus } from "@/lib/types";

async function logActivity(action: string, entity_id: string, metadata?: Record<string, unknown>) {
  const supabase = await createClient();
  const profile = await requireProfile();
  await supabase.from("activity_log").insert({
    actor_id: profile.id,
    action,
    entity_type: "task",
    entity_id,
    metadata: metadata ?? null,
  });
}

async function notify(target_id: string, title: string, body?: string | null, link?: string | null) {
  const supabase = await createClient();
  await supabase.rpc("notify", {
    target_id,
    ntitle: title,
    nbody: body ?? null,
    nlink: link ?? null,
  });
}

const MENTION_RE = /@([a-zA-Z0-9_.\-]{2,40})/g;

async function notifyMentions(body: string, taskId: string, taskTitle: string | null) {
  const handles = Array.from(new Set(Array.from(body.matchAll(MENTION_RE), (m) => m[1].toLowerCase())));
  if (!handles.length) return;
  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("id, full_name, email");
  const matches = (people ?? []).filter((p) => {
    const handle = (p.full_name ?? p.email ?? "").toLowerCase().replace(/\s+/g, "");
    const emailLocal = (p.email ?? "").split("@")[0]?.toLowerCase();
    return handles.some((h) => handle.includes(h) || emailLocal === h);
  });
  await Promise.all(
    matches.map((p) =>
      supabase.rpc("notify", {
        target_id: p.id,
        ntitle: "You were mentioned",
        nbody: taskTitle ?? "A teammate mentioned you in a comment.",
        nlink: `/tasks/${taskId}`,
      }),
    ),
  );
}

export async function createTask(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const description = (formData.get("description") as string | null) || null;
  const project_id = (formData.get("project_id") as string | null) || null;
  const assignee_id = (formData.get("assignee_id") as string | null) || null;
  const priority = (formData.get("priority") as TaskPriority) || "medium";
  const due_date = (formData.get("due_date") as string | null) || null;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      project_id: project_id || null,
      assignee_id: assignee_id || null,
      priority,
      due_date: due_date || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logActivity("task.created", data!.id, { title, assignee_id });

  if (assignee_id && assignee_id !== profile.id) {
    await notify(assignee_id, "New task assigned", title, `/tasks/${data!.id}`);
  }

  revalidatePath("/tasks");
  revalidatePath("/overview");
  revalidatePath("/me");
  return { ok: true, id: data!.id };
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient();
  const profile = await requireProfile();

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) return { error: error.message };

  await supabase.from("task_updates").insert({
    task_id: taskId,
    user_id: profile.id,
    status_change: status,
  });
  await logActivity("task.status_changed", taskId, { status });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/overview");
  revalidatePath("/me");
  return { ok: true };
}

export async function addTaskUpdate(formData: FormData) {
  const supabase = await createClient();
  const profile = await requireProfile();
  const task_id = String(formData.get("task_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!task_id || !note) return { error: "Empty update." };

  const { error } = await supabase.from("task_updates").insert({
    task_id,
    user_id: profile.id,
    note,
  });
  if (error) return { error: error.message };

  await logActivity("task.update_posted", task_id);
  revalidatePath(`/tasks/${task_id}`);
  return { ok: true };
}

export async function addTaskComment(formData: FormData) {
  const supabase = await createClient();
  const profile = await requireProfile();
  const task_id = String(formData.get("task_id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!task_id || !body) return { error: "Empty comment." };

  const { error } = await supabase
    .from("task_comments")
    .insert({ task_id, user_id: profile.id, body });
  if (error) return { error: error.message };

  await logActivity("task.commented", task_id);

  const { data: task } = await supabase
    .from("tasks")
    .select("title, assignee_id")
    .eq("id", task_id)
    .maybeSingle();

  if (task?.assignee_id && task.assignee_id !== profile.id) {
    await notify(
      task.assignee_id,
      "New comment on your task",
      task.title ?? "",
      `/tasks/${task_id}`,
    );
  }

  await notifyMentions(body, task_id, task?.title ?? null);

  revalidatePath(`/tasks/${task_id}`);
  return { ok: true };
}

export async function reassignTask(taskId: string, assignee_id: string | null) {
  const supabase = await createClient();
  const profile = await requireProfile();
  const { error } = await supabase.from("tasks").update({ assignee_id }).eq("id", taskId);
  if (error) return { error: error.message };

  await logActivity("task.reassigned", taskId, { assignee_id });
  if (assignee_id && assignee_id !== profile.id) {
    const { data: task } = await supabase.from("tasks").select("title").eq("id", taskId).single();
    await notify(assignee_id, "Task assigned to you", task?.title ?? "", `/tasks/${taskId}`);
  }
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/me");
  return { ok: true };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  await logActivity("task.deleted", taskId);
  revalidatePath("/tasks");
  return { ok: true };
}
