"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";

export async function createReview(formData: FormData) {
  const profile = await requireProfile();
  if (!canManage(profile.role)) return { error: "Forbidden." };
  const supabase = await createClient();

  const reviewee_id = String(formData.get("reviewee_id") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const feedback = (formData.get("feedback") as string | null) || null;
  const period = String(formData.get("period") ?? new Date().toISOString().slice(0, 7));

  if (!reviewee_id || rating < 1 || rating > 5) return { error: "Invalid review." };

  const { error } = await supabase.from("reviews").insert({
    reviewee_id, reviewer_id: profile.id, rating, feedback, period,
  });
  if (error) return { error: error.message };

  await supabase.from("notifications").insert({
    user_id: reviewee_id,
    title: "New review",
    body: `You received a ${rating}/5 rating for ${period}.`,
    link: "/me",
  });

  revalidatePath("/performance");
  revalidatePath("/me");
  return { ok: true };
}
