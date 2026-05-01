"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData): Promise<void> {
  const profile = await requireProfile();
  if (!canManage(profile.role)) throw new Error("Only managers can create projects.");

  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");

  const insert = {
    name,
    description: (formData.get("description") as string | null) || null,
    status: (formData.get("status") as string | null) || "planning",
    client_name: (formData.get("client_name") as string | null) || null,
    owner_id: (formData.get("owner_id") as string | null) || profile.id,
    budget: formData.get("budget") ? Number(formData.get("budget")) : null,
    start_date: (formData.get("start_date") as string | null) || null,
    due_date: (formData.get("due_date") as string | null) || null,
    progress: formData.get("progress") ? Number(formData.get("progress")) : 0,
  };

  const { data, error } = await supabase.from("projects").insert(insert).select("id").single();
  if (error) throw new Error(error.message);

  await supabase.from("activity_log").insert({
    actor_id: profile.id, action: "project.created", entity_type: "project",
    entity_id: data!.id, metadata: { name },
  });

  revalidatePath("/projects");
  revalidatePath("/overview");
  redirect(`/projects/${data!.id}`);
}

export async function updateProjectProgress(id: string, progress: number) {
  const profile = await requireProfile();
  if (!canManage(profile.role)) return { error: "Forbidden" };
  const supabase = await createClient();
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  const { error } = await supabase.from("projects").update({ progress: p }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/overview");
  return { ok: true };
}
