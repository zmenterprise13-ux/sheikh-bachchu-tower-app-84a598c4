import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { FLATS } from "@/data/mockData";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { Input } from "@/components/ui/input";
import { Search, Phone, Home } from "lucide-react";

export default function AdminFlats() {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");

  const filtered = FLATS.filter(f => {
    const s = q.toLowerCase();
    return !s
      || f.flatNo.toLowerCase().includes(s)
      || f.ownerName.toLowerCase().includes(s)
      || f.ownerNameBn.includes(q)
      || f.phone.includes(q);
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("flats")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formatNumber(FLATS.length, lang)} {lang === "bn" ? "টি ফ্ল্যাট" : "flats total"}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder={lang === "bn" ? "খুঁজুন..." : "Search..."} className="pl-9" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(f => (
            <div key={f.id} className="rounded-2xl bg-card border border-border p-5 shadow-soft hover:shadow-elegant transition-smooth">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground font-bold shrink-0">
                  {f.flatNo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">
                    {lang === "bn" ? f.ownerNameBn : f.ownerName}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Phone className="h-3 w-3" /> {f.phone}
                  </div>
                </div>
                {f.isOccupied ? (
                  <span className="text-[10px] font-bold bg-success/15 text-success rounded-full px-2 py-0.5">
                    {lang === "bn" ? "চালু" : "Active"}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                    {lang === "bn" ? "খালি" : "Vacant"}
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-secondary/50 p-2">
                  <div className="text-muted-foreground flex items-center gap-1"><Home className="h-3 w-3" /> {lang === "bn" ? "সাইজ" : "Size"}</div>
                  <div className="font-semibold text-foreground mt-0.5">{formatNumber(f.size, lang)} sqft</div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <div className="text-muted-foreground">{t("parking")}</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {f.parking > 0 ? formatMoney(f.parking, lang) : "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <div className="text-muted-foreground">{t("serviceCharge")}</div>
                  <div className="font-semibold text-foreground mt-0.5">{formatMoney(f.serviceCharge, lang)}</div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <div className="text-muted-foreground">{t("gasBill")}</div>
                  <div className="font-semibold text-foreground mt-0.5">{formatMoney(f.gasBill, lang)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
