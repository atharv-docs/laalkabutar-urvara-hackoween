"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SensorReading } from "@/types";
import { fmtDay } from "@/lib/time";
import { MOISTURE_LOW } from "@/services/soil";

export function MoistureChart({ readings }: { readings: SensorReading[] }) {
  const data = readings.map((r) => ({ day: fmtDay(r.at), value: r.value }));
  return (
    <figure className="m-0">
      <div className="h-56 w-full" role="img" aria-label={`Soil moisture over ${data.length} readings, latest ${data.at(-1)?.value ?? "n/a"}% VWC; irrigation threshold ${MOISTURE_LOW}%`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#ddd4c1" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "#66513e", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#c9bda5" }} />
            <YAxis
              domain={[0, 50]}
              tick={{ fill: "#66513e", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={44}
              unit="%"
            />
            <Tooltip
              formatter={(v) => [`${v}% VWC`, "Soil moisture"]}
              contentStyle={{ background: "#fdfbf5", border: "1px solid #ddd4c1", borderRadius: 6, color: "#3a2e22" }}
            />
            <ReferenceLine
              y={MOISTURE_LOW}
              stroke="#b96f4e"
              strokeDasharray="6 4"
              label={{ value: `Irrigate below ${MOISTURE_LOW}%`, position: "insideTopRight", fill: "#8c472b", fontSize: 12 }}
            />
            <Line type="monotone" dataKey="value" name="Soil moisture" stroke="#234735" strokeWidth={2.5} dot={{ r: 3, fill: "#234735" }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 text-xs text-ink-muted">Soil moisture, % volumetric water content (VWC), one simulated probe reading per day.</figcaption>
    </figure>
  );
}
