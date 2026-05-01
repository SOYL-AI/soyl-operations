"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";

export async function createTransaction(formData: FormData) {
  const profile = await requireProfile();
  if (!canManage(profile.role)) return { error: "Forbidden." };

  const supabase = await createClient();
  const insert = {
    type: String(formData.get("type") ?? "expense") as "revenue" | "expense",
    category: (formData.get("category") as string | null) || null,
    amount: Number(formData.get("amount") ?? 0),
    currency: String(formData.get("currency") ?? "INR"),
    project_id: (formData.get("project_id") as string | null) || null,
    description: (formData.get("description") as string | null) || null,
    occurred_on: String(formData.get("occurred_on") ?? new Date().toISOString().slice(0, 10)),
    created_by: profile.id,
  };
  if (!insert.amount || insert.amount <= 0) return { error: "Amount must be > 0." };

  const { error } = await supabase.from("transactions").insert(insert);
  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    actor_id: profile.id,
    action: "transaction.created",
    entity_type: "transaction",
    metadata: { type: insert.type, amount: insert.amount, category: insert.category },
  });
  revalidatePath("/finance");
  revalidatePath("/overview");
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const profile = await requireProfile();
  if (!canManage(profile.role)) return { error: "Forbidden." };
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finance");
  return { ok: true };
}
