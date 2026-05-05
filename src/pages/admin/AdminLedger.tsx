import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { supabase } from "@/integrations/supabase/client";
import { FlatLedgerView, LedgerFlat } from "@/components/FlatLedgerView";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams } from "react-router-dom";
import { residentName } from "@/lib/displayName";

export default function AdminLedger() {
  const { lang } = useLang();
  const [params, setParams] = useSearchParams();
  const [flats, setFlats] = useState<LedgerFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const selectedId = params.get("flat") || "";

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("flats")
        .select("id, flat_no, floor, size, owner_name, owner_name_bn, occupant_type, occupant_name, occupant_name_bn")
        .order("floor")
        .order("flat_no");
      setFlats((data ?? []) as LedgerFlat[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return !s ? flats : flats.filter((f) =>
      f.flat_no.toLowerCase().includes(s) ||
      (f.owner_name ?? "").toLowerCase().includes(s) ||
      (f.owner_name_bn ?? "").includes(q) ||
      (f.occupant_name ?? "").toLowerCase().includes(s)
    );
  }, [flats, q]);

  const selected = flats.find((f) => f.id === selectedId) || null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="print-hide">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {lang === "bn" ? "ফ্ল্যাট লেজার" : "Flat Ledger"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {lang === "bn"
                  ? "ফ্ল্যাট সিলেক্ট করে বিল, পেমেন্ট ও বকেয়ার পূর্ণ ইতিহাস দেখুন"
                  : "Select a flat to view full bill, payment and dues timeline"}
              </p>
            </div>
          </div>
        </div>

        <div className="print-hide flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "bn" ? "ফ্ল্যাট খুঁজুন..." : "Search flat..."}
              className="pl-9"
            />
          </div>
          <Select
            value={selectedId}
            onValueChange={(v) => setParams({ flat: v })}
          >
            <SelectTrigger className="sm:w-72">
              <SelectValue placeholder={lang === "bn" ? "ফ্ল্যাট নির্বাচন করুন" : "Select a flat"} />
            </SelectTrigger>
            <SelectContent>
              {filtered.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {f.flat_no} —{" "}
                  {(lang === "bn" ? f.owner_name_bn : f.owner_name) || "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : !selected ? (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
            {lang === "bn" ? "একটি ফ্ল্যাট সিলেক্ট করুন।" : "Select a flat to view its ledger."}
          </div>
        ) : (
          <FlatLedgerView flat={selected} />
        )}
      </div>
    </AppShell>
  );
}
