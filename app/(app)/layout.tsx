import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { AppShell } from "@/components/AppShell";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata as any)?.full_name ?? user.email?.split("@")[0],
      role: "employee",
    });

    redirect("/overview");
  }

  return (
    <AppShell role={profile.role} topbar={<Topbar profile={profile} />}>
      {children}
    </AppShell>
  );
}
