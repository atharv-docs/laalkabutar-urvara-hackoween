"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { Language } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { getReadAloud, setReadAloud, speechRecognitionSupported, speechSynthesisSupported } from "@/components/farmer/speech";
import { Button, cx } from "@/components/ui/primitives";
import { tr } from "@/lib/i18n";
import { tx } from "@/lib/i18n-farmer-extra";
import { setLanguage } from "@/services/farmers";

export default function FarmerSettings() {
  const { user, run, signOut } = useReadyState();
  const router = useRouter();
  const lang = user.language;
  // Rendered only client-side (behind PortalGate), so browser checks can run in initializers.
  const [readAloud, setReadAloudState] = useState(getReadAloud);
  const [support] = useState(() => ({ listen: speechRecognitionSupported(), speak: speechSynthesisSupported() }));

  const choose = (l: Language) => {
    if (l !== lang) void run((s) => setLanguage(s, user.id, l), { success: tr(l, "language") + ": " + (l === "hi" ? "हिंदी" : "English") });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{tx(lang, "settingsTitle")}</h1>

      <section className="rounded-panel border border-line bg-surface p-4">
        <h2 className="text-lg font-semibold">{tr(lang, "language")}</h2>
        <div role="radiogroup" aria-label={tr(lang, "language")} className="mt-3 grid grid-cols-2 gap-2">
          {(["hi", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={lang === l}
              lang={l}
              onClick={() => choose(l)}
              className={cx(
                "min-h-14 rounded-control border-2 text-lg font-semibold",
                lang === l ? "border-forest bg-forest-tint text-forest" : "border-line bg-surface text-ink-strong hover:border-forest/40",
              )}
            >
              {l === "hi" ? "हिंदी" : "English"}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-panel border border-line bg-surface p-4">
        <h2 className="text-lg font-semibold">{tx(lang, "voice")}</h2>
        <p className="mt-1 text-ink">{support.listen ? tr(lang, "voiceLanguageNote") : tr(lang, "voiceUnavailable")}</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p id="read-aloud-label" className="font-semibold text-ink-strong">
              {tr(lang, "speechOutput")}
            </p>
            <p className="text-base text-ink">{support.speak ? tx(lang, "readAloudHint") : tx(lang, "speechNotSupportedListen")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={readAloud}
            aria-labelledby="read-aloud-label"
            disabled={!support.speak}
            onClick={() => {
              setReadAloud(!readAloud);
              setReadAloudState(!readAloud);
            }}
            className={cx(
              "relative inline-flex h-11 w-20 shrink-0 items-center rounded-full border-2 px-1 text-sm font-semibold transition-colors disabled:opacity-50",
              readAloud ? "border-forest bg-forest text-ivory" : "border-line-strong bg-sunken text-ink",
            )}
          >
            <span className={cx("absolute size-8 rounded-full bg-surface shadow-panel transition-transform", readAloud ? "translate-x-9" : "translate-x-0")} />
            <span className={cx("relative w-full", readAloud ? "pr-9 text-left pl-1" : "pl-9 text-right pr-1")}>{readAloud ? tx(lang, "on") : tx(lang, "off")}</span>
          </button>
        </div>
      </section>

      <section className="rounded-panel border border-line bg-surface p-4">
        <h2 className="text-lg font-semibold">{tx(lang, "account")}</h2>
        <p className="mt-1 text-ink-strong">{user.name}</p>
        <p className="text-ink">
          {tx(lang, "loginId")}: <span className="tabular font-semibold">{user.loginId}</span>
        </p>
        <Button
          size="lg"
          variant="secondary"
          icon={LogOut}
          className="mt-4 w-full"
          onClick={() => void signOut().then(() => router.replace("/login"))}
        >
          {tr(lang, "signOut")}
        </Button>
      </section>
    </div>
  );
}
