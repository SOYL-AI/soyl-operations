"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function markAllRead() {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("user_id", profile.id).eq("read", false);
  revalidatePath("/activity");
  revalidatePath("/", "layout");
  return { ok: true };
}
