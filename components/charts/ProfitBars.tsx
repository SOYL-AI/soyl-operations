"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export function ProfitBars({
  data,
  height = 260,
}: {
  data: { label: string; revenue: number; expense: number }[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" stroke="rgba(245,245,253,0.4)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(245,245,253,0.4)" fontSize={11} tickLine={false} axisLine={false} width={56} />
          <Tooltip />
          <Legend wrapperStyle={{ color: "#F5F5FD", fontSize: 12 }} />
          <Bar dataKey="revenue" name="Revenue" fill="#AFD0CC" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#535467" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
