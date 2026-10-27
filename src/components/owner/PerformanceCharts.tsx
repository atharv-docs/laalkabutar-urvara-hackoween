"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RupeeScoreRecord } from "@/types";
import { cropLabel } from "@/data/crops";
import type { CropComparisonRow } from "@/services/analytics";
import { fmtDay } from "@/lib/time";

const AXIS = { fill: "#66513e", fontSize: 12 };
const TOOLTIP = { background: "#fdfbf5", border: "1px solid #ddd4c1", borderRadius: 6, color: "#3a2e22" };

export function YieldChart({ rows }: { rows: CropComparisonRow[] }) {
  const data = rows.map((r) => ({ crop: cropLabel(r.crop), expected: r.expectedQ, actual: r.actualQ }));
  return (
    <figure className="m-0">
      <div className="h-64 w-full" role="img" aria-label={`Expected versus actual harvest in quintals for ${data.map((d) => d.crop).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }} barGap={2}>
            <CartesianGrid stroke="#ddd4c1" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="crop" tick={AXIS} tickLine={false} axisLine={{ stroke: "#c9bda5" }} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} label={{ value: "quintals (q)", angle: -90, position: "insideLeft", fill: "#66513e", fontSize: 12, dx: 2, dy: 36 }} />
            <Tooltip formatter={(v, n) => [`${Number(v).toLocaleString("en-IN")} q`, n]} contentStyle={TOOLTIP} cursor={{ fill: "rgba(143,175,138,0.15)" }} />
            <Legend wrapperStyle={{ fontSize: 13, color: "#66513e" }} />
            <Bar dataKey="expected" name="Expected" fill="#8faf8a" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="actual" name="Actual" fill="#234735" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 text-xs text-ink-muted">Harvest per crop, all farms combined, in quintals (1 q = 100 kg). Synthetic demo records.</figcaption>
    </figure>
  );
}

export function ScoreHistoryChart({ history }: { history: RupeeScoreRecord[] }) {
  const data = history.map((h) => ({ label: `${fmtDay(h.at)} (${h.season})`, short: fmtDay(h.at), score: h.score }));
  return (
    <figure className="m-0">
      <div className="h-52 w-full" role="img" aria-label={`Rupee Score history: ${data.map((d) => `${d.short} ${d.score ?? "not enough data"}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#ddd4c1" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="short" tick={AXIS} tickLine={false} axisLine={{ stroke: "#c9bda5" }} />
            <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              labelFormatter={(_, payload) => (payload?.[0]?.payload as { label?: string } | undefined)?.label ?? ""}
              formatter={(v) => [v == null ? "Not enough data" : `${v} / 100`, "Rupee Score"]}
              contentStyle={TOOLTIP}
            />
            <Line type="monotone" dataKey="score" name="Rupee Score" stroke="#d5a84b" strokeWidth={2.5} dot={{ r: 4, fill: "#d5a84b", stroke: "#74560f" }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 text-xs text-ink-muted">Every score version for this farmer and crop across seasons (index 0–100, not rupees).</figcaption>
    </figure>
  );
}
