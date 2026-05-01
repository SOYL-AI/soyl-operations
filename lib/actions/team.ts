"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function updateMemberRole(targetId: string, role: Role) {
  const me = await requireProfile();
  if (!canManage(me.role)) return { error: "Forbidden" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", targetId);
  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    actor_id: me.id,
    action: "profile.role_changed",
    entity_type: "profile",
    entity_id: targetId,
    metadata: { role },
  });
  revalidatePath("/team");
  return { ok: true };
}

export async function updateMyProfile(formData: FormData) {
  const me = await requireProfile();
  const supabase = await createClient();
  const full_name = (formData.get("full_name") as string | null) || null;
  const title = (formData.get("title") as string | null) || null;
  const { error } = await supabase
    .from("profiles")
    .update({ full_name, title })
    .eq("id", me.id);
  if (error) return { error: error.message };
  revalidatePath("/me");
  return { ok: true };
}
