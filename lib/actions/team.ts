"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage, isCEO, isSuperAdmin } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function updateMemberRole(targetId: string, role: Role) {
  const me = await requireProfile();
  if (!canManage(me.role)) return { error: "Forbidden" };

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) return { error: "User not found" };

  // super_admin can never be assigned or revoked via the UI — only via the
  // seeded email and DB trigger.
  if (target.role === "super_admin" || role === "super_admin") {
    return { error: "The system admin role can only be set via the seeded email." };
  }

  // Only the CEO or super_admin may change a CEO's role.
  if (target.role === "ceo" && !isCEO(me.role) && !isSuperAdmin(me.role)) {
    return { error: "Only the CEO or system admin can change another CEO's role." };
  }

  // Only the CEO or super_admin may promote someone to CEO.
  if (role === "ceo" && !isCEO(me.role) && !isSuperAdmin(me.role)) {
    return { error: "Only the CEO or system admin can promote someone to CEO." };
  }

  // Don't allow demoting the last remaining CEO.
  if (target.role === "ceo" && role !== "ceo") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("role", "ceo");
    if ((count ?? 0) <= 1) {
      return { error: "Cannot demote the last remaining CEO." };
    }
  }

  // Don't allow self-demotion of the last CEO either.
  if (target.id === me.id && me.role === "ceo" && role !== "ceo") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("role", "ceo");
    if ((count ?? 0) <= 1) {
      return { error: "You're the only CEO — promote someone else first." };
    }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", targetId);
  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    actor_id: me.id,
    action: "profile.role_changed",
    entity_type: "profile",
    entity_id: targetId,
    metadata: { from: target.role, to: role },
  });
  revalidatePath("/team");
  revalidatePath("/audit");
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
