"use client";

import { ClipboardList, Info, MessageCircleWarning } from "lucide-react";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Chip, EmptyState, cx } from "@/components/ui/primitives";
import { cropLabel } from "@/data/crops";
import { tr } from "@/lib/i18n";
import { tx, type ExtraKey } from "@/lib/i18n-farmer-extra";
import { fmtDayLocalised, ms } from "@/lib/time";
import { latestScore, scoreComponents, scoreHistory } from "@/services/rupeeScore";

export default function FarmerRecord() {
  const { state, user } = useReadyState();
  const lang = user.language;
  const records = state.cropSeasons
    .filter((r) => r.farmerId === user.id)
    .map((r) => ({ record: r, latest: latestScore(state, user.id, r.crop, r.season) }))
    .sort((a, b) => ms(b.latest?.at ?? "1970-01-01T00:00:00+05:30") - ms(a.latest?.at ?? "1970-01-01T00:00:00+05:30"));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{tr(lang, "recordTitle")}</h1>
      <p className="flex gap-2 rounded-panel bg-gold-tint/70 p-3.5 text-ink-strong">
        <Info aria-hidden className="mt-1 size-5 shrink-0 text-gold-ink" />
        {tr(lang, "recordHint")}
      </p>

      {records.length === 0 ? (
        <EmptyState icon={ClipboardList} title={tx(lang, "noRecords")}>
          {tx(lang, "noRecordsBody")}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {records.map(({ record, latest }) => {
            const components = latest?.components ?? scoreComponents(record);
            const history = scoreHistory(state, user.id, record.crop, record.season);
            return (
              <li key={record.id} className="rounded-panel border border-line bg-surface p-4 shadow-panel">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{cropLabel(record.crop, lang)}</h2>
                    <p className="text-ink">
                      {tx(lang, "season")}: {record.season} · {state.fields.find((f) => f.id === record.fieldId)?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {latest?.score != null ? (
                      <>
                        <p className="tabular text-4xl font-semibold leading-none text-forest">{latest.score}</p>
                        <p className="text-base text-ink-muted">{tx(lang, "outOf100")}</p>
                      </>
                    ) : (
                      <Chip tone="neutral" className="text-sm">
                        {tr(lang, "notEnoughData")}
                      </Chip>
                    )}
                  </div>
                </div>

                <h3 className="mt-4 text-base font-semibold text-ink-muted">{tr(lang, "whatCounts")}</h3>
                <ul className="mt-2 space-y-3">
                  {components.map((c) => (
                    <li key={c.key}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-ink-strong">{tx(lang, c.key as ExtraKey)}</span>
                        <span className="tabular shrink-0 font-semibold text-ink-strong">{c.value != null ? c.value : tx(lang, "noData")}</span>
                      </div>
                      <div className="mt-1 h-3 overflow-hidden rounded-full bg-sunken" aria-hidden>
                        {c.value != null && (
                          <div
                            className={cx("h-full rounded-full", c.value >= 75 ? "bg-forest" : c.value >= 50 ? "bg-gold" : "bg-terracotta")}
                            style={{ width: `${Math.max(4, c.value)}%` }}
                          />
                        )}
                      </div>
                      <p className="mt-0.5 text-base text-ink">{lang === "hi" && c.detailHi ? c.detailHi : c.detail}</p>
                    </li>
                  ))}
                </ul>

                {history.length > 1 && (
                  <div className="mt-4 border-t border-line pt-3">
                    <h3 className="text-base font-semibold text-ink-muted">{tx(lang, "history2")}</h3>
                    <ol className="mt-1.5 space-y-2">
                      {history.map((h) => (
                        <li key={h.id} className="text-base">
                          <span className="tabular font-semibold text-ink-strong">{h.score ?? "—"}</span>
                          <span className="text-ink-muted"> · {fmtDayLocalised(h.at, lang)}</span>
                          <p className="text-ink">{lang === "hi" && h.reasonHi ? h.reasonHi : h.reason}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex gap-2 text-ink">
        <MessageCircleWarning aria-hidden className="mt-1 size-5 shrink-0 text-sage-ink" />
        {tr(lang, "wrongRecord")}
      </p>
    </div>
  );
}
