import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { Input } from "@/components/ui/input";
import { Search, Phone, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Flat = {
  id: string;
  flat_no: string;
  floor: number;
  owner_name: string | null;
  owner_name_bn: string | null;
  phone: string | null;
  size: number;
  service_charge: number;
  gas_bill: number;
  parking: number;
  is_occupied: boolean;
};

export default function AdminFlats() {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("flats")
        .select("id, flat_no, floor, owner_name, owner_name_bn, phone, size, service_charge, gas_bill, parking, is_occupied")
        .order("floor")
        .order("flat_no");
      if (error) toast.error(error.message);
      setFlats((data ?? []) as Flat[]);
      setLoading(false);
    })();
  }, []);

  const filtered = flats.filter((f) => {
    const s = q.toLowerCase();
    return !s
      || f.flat_no.toLowerCase().includes(s)
      || (f.owner_name ?? "").toLowerCase().includes(s)
      || (f.owner_name_bn ?? "").includes(q)
      || (f.phone ?? "").includes(q);
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("flats")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formatNumber(flats.length, lang)} {lang === "bn" ? "টি ফ্ল্যাট" : "flats total"}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "bn" ? "খুঁজুন..." : "Search..."} className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((f) => (
              <div key={f.id} className="rounded-2xl bg-card border border-border p-5 shadow-soft hover:shadow-elegant transition-smooth">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground font-bold shrink-0">
                    {f.flat_no}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {(lang === "bn" ? f.owner_name_bn : f.owner_name) || "—"}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Phone className="h-3 w-3" /> {f.phone || "—"}
                    </div>
                  </div>
                  {f.is_occupied ? (
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
                      {Number(f.parking) > 0 ? formatMoney(Number(f.parking), lang) : "—"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <div className="text-muted-foreground">{t("serviceCharge")}</div>
                    <div className="font-semibold text-foreground mt-0.5">{formatMoney(Number(f.service_charge), lang)}</div>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <div className="text-muted-foreground">{t("gasBill")}</div>
                    <div className="font-semibold text-foreground mt-0.5">{formatMoney(Number(f.gas_bill), lang)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
