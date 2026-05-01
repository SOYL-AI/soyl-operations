"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export function TrendChart({
  data,
  dataKey = "value",
  height = 220,
}: {
  data: { label: string; value: number }[];
  dataKey?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mintFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#AFD0CC" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#AFD0CC" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" stroke="rgba(245,245,253,0.4)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(245,245,253,0.4)" fontSize={11} tickLine={false} axisLine={false} width={36} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="#AFD0CC"
            strokeWidth={2}
            fill="url(#mintFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
