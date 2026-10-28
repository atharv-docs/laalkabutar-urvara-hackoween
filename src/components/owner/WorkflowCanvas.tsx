"use client";

import type { N8nGraph } from "@/types";
import { cx } from "@/components/ui/primitives";

export type NodeState = "idle" | "waiting" | "running" | "success" | "error";

const W = 180;
const H = 64;
/** n8n positions are the top-left of a 100×100 node; centre our wider box on that. */
const centre = (n: { x: number; y: number }) => ({ cx: n.x + 50, cy: n.y + 50 });

const TYPE_LABEL: Record<string, string> = {
  webhook: "Webhook",
  set: "Edit fields",
  code: "Code",
  switch: "Switch",
  if: "IF",
  agent: "AI agent",
  lmChatOllama: "Ollama model",
  outputParserStructured: "Output parser",
  dataTable: "Data table",
  respondToWebhook: "Respond",
};

function lines(name: string): string[] {
  if (name.length <= 21) return [name];
  const words = name.split(" ");
  let first = "";
  while (words.length && `${first} ${words[0]}`.trim().length <= 21) first = `${first} ${words.shift()}`.trim();
  const rest = words.join(" ");
  return [first || name.slice(0, 21), rest.length > 21 ? `${rest.slice(0, 20)}…` : rest].filter(Boolean);
}

/**
 * The coordinator workflow drawn as a graph. Node colours follow
 * the execution: waiting (the webhook call is in flight), running, success, error.
 */
export function WorkflowCanvas({
  graph,
  states,
  selected,
  onSelect,
}: {
  graph: N8nGraph;
  states: Record<string, NodeState>;
  selected?: string;
  onSelect: (node: string) => void;
}) {
  const byName = new Map(graph.nodes.map((n) => [n.name, n]));
  const xs = graph.nodes.map((n) => centre(n).cx);
  const ys = graph.nodes.map((n) => centre(n).cy);
  const pad = 90;
  const minX = Math.min(...xs) - W / 2 - pad;
  const minY = Math.min(...ys) - H / 2 - pad;
  const width = Math.max(...xs) - Math.min(...xs) + W + pad * 2;
  const height = Math.max(...ys) - Math.min(...ys) + H + pad * 2;
  const done = (name: string) => states[name] === "success" || states[name] === "error";

  return (
    <svg viewBox={`${minX} ${minY} ${width} ${height}`} className="h-auto w-full min-w-[56rem]" role="group" aria-label={`n8n workflow ${graph.name}`}>
      <defs>
        <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {graph.edges.map((e, i) => {
        const a = byName.get(e.from);
        const b = byName.get(e.to);
        if (!a || !b) return null;
        const main = e.kind === "main";
        const pa = centre(a);
        const pb = centre(b);
        // Main edges run left to right; AI sub-nodes hang below their agent and point up into it.
        const [x1, y1, x2, y2] = main ? [pa.cx + W / 2, pa.cy, pb.cx - W / 2, pb.cy] : [pa.cx, pa.cy - H / 2, pb.cx, pb.cy + H / 2];
        const ym = (y1 + y2) / 2;
        // A target behind its source (the second row, a branch below) loops back along the gap between rows.
        const d = !main
          ? `M${x1} ${y1} C${x1} ${y1 - 40}, ${x2} ${y2 + 40}, ${x2} ${y2}`
          : x2 < x1 + 20
            ? `M${x1} ${y1} C${x1 + 70} ${y1}, ${x1 + 70} ${ym}, ${x1} ${ym} L${x2} ${ym} C${x2 - 70} ${ym}, ${x2 - 70} ${y2}, ${x2} ${y2}`
            : `M${x1} ${y1} C${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`;
        const taken = done(e.from) && done(e.to);
        return (
          <path
            key={i}
            d={d}
            fill="none"
            markerEnd="url(#wf-arrow)"
            strokeWidth={taken ? 3 : 1.5}
            strokeDasharray={main ? undefined : "5 4"}
            className={cx("transition-[stroke,color] duration-300", taken ? "stroke-forest text-forest" : "stroke-line-strong text-line-strong")}
          />
        );
      })}
      {graph.nodes.map((n) => {
        const { cx: x, cy: y } = centre(n);
        const state = states[n.name] ?? "idle";
        const label = lines(n.name);
        return (
          <g
            key={n.name}
            role="button"
            tabIndex={0}
            aria-label={`${n.name}: ${state}`}
            aria-pressed={selected === n.name}
            onClick={() => onSelect(n.name)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(n.name);
              }
            }}
            className={cx("cursor-pointer outline-none [&:focus-visible>rect]:stroke-gold", (state === "running" || state === "waiting") && "animate-pulse motion-reduce:animate-none")}
          >
            <rect
              x={x - W / 2}
              y={y - H / 2}
              width={W}
              height={H}
              rx={10}
              strokeWidth={selected === n.name ? 3 : 1.5}
              className={cx(
                "transition-[fill,stroke] duration-300",
                state === "success" && "fill-forest-tint stroke-forest",
                state === "error" && "fill-terracotta-tint stroke-terracotta-ink",
                (state === "running" || state === "waiting") && "fill-gold-tint stroke-gold-ink",
                state === "idle" && "fill-surface stroke-line-strong",
                n.disabled && "opacity-50",
                selected === n.name && "stroke-ink-strong",
              )}
            />
            <text x={x - W / 2 + 12} y={y - (label.length > 1 ? 10 : 2)} className="fill-ink-strong text-[15px] font-semibold">
              {label.map((l, i) => (
                <tspan key={i} x={x - W / 2 + 12} dy={i ? 16 : 0}>
                  {l}
                </tspan>
              ))}
            </text>
            <text x={x - W / 2 + 12} y={y + H / 2 - 9} className="fill-ink-muted text-[12.5px]">
              {TYPE_LABEL[n.type] ?? n.type}
            </text>
            {(state === "success" || state === "error") && (
              <circle cx={x + W / 2 - 12} cy={y - H / 2 + 12} r={5} className={state === "success" ? "fill-forest" : "fill-terracotta-ink"} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
