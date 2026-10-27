"use client";

/**
 * Schematic farm map: farms plotted by latitude/longitude on an equal-aspect
 * projection. Positions are to scale; there is no basemap.
 */
import type { Farm, ScoutingSuggestion } from "@/types";

const KM_PER_DEG_LAT = 110.57;

export interface MapRisk {
  farmId: string;
  category: ScoutingSuggestion["category"];
  score: number;
}

const RISK_FILL: Record<ScoutingSuggestion["category"], string> = {
  high: "#b96f4e",
  medium: "#d5a84b",
  low: "#8faf8a",
};

export function FarmMap({ farms, originFarmId, risks }: { farms: Farm[]; originFarmId?: string; risks: MapRisk[] }) {
  if (farms.length === 0) return null;
  const meanLat = farms.reduce((s, f) => s + f.lat, 0) / farms.length;
  const kmPerDegLng = KM_PER_DEG_LAT * Math.cos((meanLat * Math.PI) / 180);
  const pts = farms.map((f) => ({ farm: f, x: f.lng * kmPerDegLng, y: -f.lat * KM_PER_DEG_LAT }));
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const pad = 9;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad + 34; // room for labels to the right
  const vbH = maxY - minY + pad * 2;
  const origin = pts.find((p) => p.farm.id === originFarmId);
  // Risk per farm: the highest category among its fields.
  const byFarm = new Map<string, MapRisk>();
  for (const r of risks) {
    const prev = byFarm.get(r.farmId);
    if (!prev || r.score > prev.score) byFarm.set(r.farmId, r);
  }
  const unit = vbW / 100;

  return (
    <figure className="m-0">
      <svg
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        role="img"
        aria-label={`Schematic map of ${farms.length} farms${origin ? `, centred on the report from ${origin.farm.name}` : ""}`}
        className="h-auto w-full rounded-control border border-line bg-[#f1ede0]"
      >
        {origin &&
          [20, 10, 5].map((km) => (
            <g key={km}>
              <circle cx={origin.x} cy={origin.y} r={km} fill={km === 5 ? "rgba(185,111,78,0.08)" : "none"} stroke="#b96f4e" strokeOpacity={0.45} strokeWidth={unit * 0.25} strokeDasharray={`${unit * 1} ${unit * 0.8}`} />
              <text x={origin.x} y={origin.y + km + unit * 2.6} textAnchor="middle" fontSize={unit * 2.4} fill="#8c472b" fontWeight={600}>
                {km} km
              </text>
            </g>
          ))}
        {pts.map(({ farm, x, y }) => {
          // A farm within 6 km of one further north takes its label on the left, below, so labels never collide.
          const crowded = pts.some((o) => o.farm.id !== farm.id && o.y < y && Math.hypot(o.x - x, o.y - y) < 6);
          const lx = crowded ? x - unit * 3.6 : x + unit * 3.6;
          const ly = crowded ? y + unit * 3.2 : y - unit * 0.4;
          const anchor = crowded ? "end" : "start";
          const risk = byFarm.get(farm.id);
          const isOrigin = farm.id === originFarmId;
          const fill = isOrigin ? "#234735" : risk ? RISK_FILL[risk.category] : "#fdfbf5";
          const label = isOrigin ? "Report origin" : risk ? `${risk.category === "high" ? "High" : risk.category === "medium" ? "Medium" : "Low"} risk · ${risk.score}` : "No flag";
          return (
            <g key={farm.id}>
              {isOrigin && <circle cx={x} cy={y} r={unit * 3.2} fill="none" stroke="#234735" strokeWidth={unit * 0.45} />}
              <circle cx={x} cy={y} r={unit * 1.8} fill={fill} stroke="#3a2e22" strokeWidth={unit * 0.3} />
              <text x={lx} y={ly} textAnchor={anchor} fontSize={unit * 3} fontWeight={600} fill="#3a2e22">
                {farm.name}
              </text>
              <text x={lx} y={ly + unit * 3.4} textAnchor={anchor} fontSize={unit * 2.5} fill={isOrigin ? "#234735" : risk?.category === "high" ? "#8c472b" : "#66513e"}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1.5 text-xs text-ink-muted">Schematic map (demo): positions to scale, not a basemap.{origin ? " Rings show 5, 10 and 20 km from the reported field." : ""}</figcaption>
    </figure>
  );
}
