import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile, Role } from "./types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export function canManage(role: Role) {
  return role === "super_admin" || role === "ceo" || role === "manager";
}

export function isCEO(role: Role) {
  return role === "ceo";
}

export function isSuperAdmin(role: Role) {
  return role === "super_admin";
}
