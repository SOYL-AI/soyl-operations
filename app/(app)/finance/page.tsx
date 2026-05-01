import { redirect } from "next/navigation";
import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManage } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Kpi } from "@/components/Kpi";
import { ProfitBars } from "@/components/charts/ProfitBars";
import { formatCurrency } from "@/lib/utils";
import { NewTransaction } from "./NewTransaction";
import { DeleteTxButton } from "./DeleteTxButton";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const me = await requireProfile();
  if (!canManage(me.role)) redirect("/overview");

  const supabase = await createClient();
  const { data: txs } = await supabase
    .from("transactions")
    .select("*")
    .order("occurred_on", { ascending: false });
  const { data: projects } = await supabase.from("projects").select("id, name");
  const projById = new Map((projects ?? []).map((p) => [p.id, p]));

  const all = txs ?? [];
  const totalRev = all.filter((t) => t.type === "revenue").reduce((s, t) => s + Number(t.amount), 0);
  const totalExp = all.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  // 6-bucket trend over last 30 days
  const buckets: Record<string, { revenue: number; expense: number }> = {};
  Array.from({ length: 6 }).forEach((_, i) => {
    const d = subDays(new Date(), (5 - i) * 5);
    buckets[format(d, "MMM d")] = { revenue: 0, expense: 0 };
  });
  all.forEach((t) => {
    const k = format(new Date(t.occurred_on), "MMM d");
    if (!buckets[k]) buckets[k] = { revenue: 0, expense: 0 };
    buckets[k][t.type as "revenue" | "expense"] += Number(t.amount);
  });
  const chartData = Object.entries(buckets).map(([label, v]) => ({ label, ...v }));

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle="Revenue, expenses, profit — connect execution with money."
        actions={<NewTransaction projects={projects ?? []} />}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Revenue (all time)" value={formatCurrency(totalRev)} />
        <Kpi label="Expenses (all time)" value={formatCurrency(totalExp)} />
        <Kpi label="Profit" value={
          <span className={totalRev - totalExp >= 0 ? "text-mint" : "text-red-300"}>
            {formatCurrency(totalRev - totalExp)}
          </span>
        } />
      </section>

      <section className="mt-6 card card-pad">
        <h3 className="font-display text-bone">Revenue vs expenses</h3>
        <div className="mt-4"><ProfitBars data={chartData} /></div>
      </section>

      <section className="mt-6 table-shell">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Date</th>
              <th className="th">Type</th>
              <th className="th">Category</th>
              <th className="th">Project</th>
              <th className="th text-right">Amount</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {all.length === 0 && (
              <tr><td colSpan={6} className="td text-center text-bone-300/50">No transactions yet.</td></tr>
            )}
            {all.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="td">{format(new Date(t.occurred_on), "MMM d, yyyy")}</td>
                <td className="td">
                  <span className={"chip " + (t.type === "revenue" ? "chip-mint" : "chip-amber")}>
                    {t.type}
                  </span>
                </td>
                <td className="td text-bone-300/80">{t.category ?? "—"}</td>
                <td className="td text-bone-300/80">
                  {t.project_id ? projById.get(t.project_id)?.name ?? "—" : "—"}
                </td>
                <td className="td text-right text-bone">{formatCurrency(Number(t.amount), t.currency)}</td>
                <td className="td text-right"><DeleteTxButton id={t.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
