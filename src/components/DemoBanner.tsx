import { useLang } from "@/i18n/LangContext";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

export function DemoBanner() {
  const { t } = useLang();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 flex items-start gap-3">
      <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{t("demoMode")}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{t("demoMessage")}</div>
      </div>
      <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-base">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
