"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { RevenuePoint } from "@/lib/analytics";

function formatMonthLabel(label: string): string {
  const [year, month] = label.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return <p className="admin-empty">No completed sessions in this period yet.</p>;
  }

  const chartData = data.map((d) => ({ label: formatMonthLabel(d.label), revenue: d.revenueCents / 100 }));

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(23, 61, 53, 0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#687970" }}
            axisLine={{ stroke: "rgba(23, 61, 53, 0.2)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#687970" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `€${value}`}
            width={56}
          />
          <Tooltip
            formatter={(value) => [`€${Number(value).toLocaleString("en-BE")}`, "Revenue"]}
            contentStyle={{
              background: "#fffdf8",
              border: "1px solid rgba(23, 61, 53, 0.14)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Bar dataKey="revenue" fill="#0e4b42" radius={[4, 4, 0, 0]} name="Revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

