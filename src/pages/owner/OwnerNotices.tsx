import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { NOTICES } from "@/data/mockData";
import { Megaphone, AlertTriangle } from "lucide-react";

export default function OwnerNotices() {
  const { t, lang } = useLang();
  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("notices")}</h1>
        <div className="grid gap-4">
          {NOTICES.map(n => (
            <div key={n.id} className="rounded-2xl bg-card border border-border p-5 shadow-soft flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${n.important ? "bg-destructive/15 text-destructive" : "bg-secondary text-primary"}`}>
                {n.important ? <AlertTriangle className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{lang === "bn" ? n.titleBn : n.title}</h3>
                  {n.important && <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">{lang === "bn" ? "জরুরি" : "URGENT"}</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1.5">{lang === "bn" ? n.bodyBn : n.body}</p>
                <div className="text-xs text-muted-foreground mt-2">{n.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
