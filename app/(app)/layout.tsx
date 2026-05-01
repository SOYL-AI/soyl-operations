import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) {
    // If user exists in auth but row missing in profiles (race on first signup), bootstrap it.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata as any)?.full_name ?? user.email?.split("@")[0],
      role: ((user.user_metadata as any)?.role as any) ?? "employee",
    });

    redirect("/overview");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
