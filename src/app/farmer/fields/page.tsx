"use client";

import { AlertTriangle, CheckCircle2, CircleDot, Droplets, MessageSquareText, ShieldAlert, Sprout, XCircle } from "lucide-react";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Provenance } from "@/components/ui/domain";
import { Chip, EmptyState } from "@/components/ui/primitives";
import { STAGE_LABEL, cropLabel } from "@/data/crops";
import { tr, type I18nKey } from "@/lib/i18n";
import { tx } from "@/lib/i18n-farmer-extra";
import { fmtDayLocalised, ms } from "@/lib/time";
import { latestRiskByField } from "@/services/risk";
import { MOISTURE_HIGH, MOISTURE_LOW, latestReading } from "@/services/soil";

export default function FarmerFields() {
  const { state, user } = useReadyState();
  const lang = user.language;
  const t = (k: I18nKey) => tr(lang, k);
  const fields = state.fields.filter((f) => user.fieldIds.includes(f.id));
  const risk = latestRiskByField(state);
  const reports = state.reports.filter((r) => r.reporterId === user.id).sort((a, b) => ms(b.createdAt) - ms(a.createdAt)).slice(0, 6);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("fields")}</h1>

      {fields.length === 0 ? (
        <EmptyState icon={Sprout} title={tx(lang, "noFieldsAssigned")} />
      ) : (
        <ul className="space-y-3">
          {fields.map((field) => {
            const farm = state.farms.find((f) => f.id === field.farmId);
            const moisture = latestReading(state, field.id, "moisture");
            const r = risk.get(field.id);
            const level = moisture ? (moisture.value < MOISTURE_LOW ? "dry" : moisture.value > MOISTURE_HIGH ? "wet" : "okay") : null;
            return (
              <li key={field.id} className="rounded-panel border border-line bg-surface p-4 shadow-panel">
                <h2 className="text-xl font-semibold">{field.name}</h2>
                <p className="text-ink">
                  {farm?.name} · {cropLabel(field.crop, lang)} · {t("stage")}: {STAGE_LABEL[field.stage][lang]}
                </p>

                <div className="mt-3 flex items-center gap-3 rounded-control bg-sunken p-3">
                  <Droplets aria-hidden className="size-7 shrink-0 text-forest" />
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-ink-muted">{t("soilMoisture")}</p>
                    {moisture ? (
                      <>
                        <p className="text-lg font-semibold text-ink-strong">
                          {t(level as I18nKey)} · <span className="tabular">{moisture.value}%</span>
                        </p>
                        <Provenance source={moisture.source} at={moisture.at} now={state.now} staleAfterHours={6} className="mt-0.5" />
                      </>
                    ) : (
                      <p className="text-lg text-ink">{tx(lang, "noReading")}</p>
                    )}
                  </div>
                  {level === "dry" && (
                    <Chip tone="terracotta" icon={AlertTriangle} className="text-sm">
                      {t("dry")}
                    </Chip>
                  )}
                </div>

                {r && (r.category === "high" || r.category === "medium") && (
                  <div className={r.category === "high" ? "mt-3 flex gap-3 rounded-control bg-terracotta-tint p-3" : "mt-3 flex gap-3 rounded-control bg-gold-tint p-3"}>
                    <ShieldAlert aria-hidden className={r.category === "high" ? "mt-0.5 size-6 shrink-0 text-terracotta-ink" : "mt-0.5 size-6 shrink-0 text-gold-ink"} />
                    <div>
                      <p className="font-semibold text-ink-strong">{r.category === "high" ? t("riskWarning") : tx(lang, "riskMedium")}</p>
                      <p className="text-ink-strong">{r.category === "high" ? t("riskWarningBody") : tx(lang, "riskMediumBody")}</p>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section>
        <h2 className="mb-2.5 text-xl font-semibold">{t("recentReports")}</h2>
        {reports.length === 0 ? (
          <EmptyState icon={MessageSquareText} title={tx(lang, "noReports")} />
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-panel border border-line bg-surface p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-strong">{t(`kind_${r.kind}` as I18nKey)}</span>
                  <Chip
                    tone={r.status === "unverified" ? "gold" : r.status === "reviewed" ? "sage" : "neutral"}
                    icon={r.status === "unverified" ? CircleDot : r.status === "reviewed" ? CheckCircle2 : XCircle}
                    className="text-sm"
                  >
                    {t(r.status)}
                  </Chip>
                </div>
                <p className="mt-1 text-ink-strong">“{r.transcript}”</p>
                <p className="mt-0.5 text-base text-ink-muted">
                  {state.fields.find((f) => f.id === r.fieldId)?.name} · {fmtDayLocalised(r.createdAt, lang)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
