import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { NewTaskForm } from "./NewTaskForm";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  await requireProfile();
  const supabase = await createClient();
  const [{ data: people }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
    supabase.from("projects").select("id, name").order("name"),
  ]);

  return (
    <>
      <PageHeader title="New task" subtitle="Capture the work, assign it, set a deadline." />
      <NewTaskForm people={people ?? []} projects={projects ?? []} />
    </>
  );
}
