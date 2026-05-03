import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Home } from "lucide-react";

type Flat = {
  id: string;
  flat_no: string;
  floor: number;
  owner_name: string | null;
  owner_name_bn: string | null;
  phone: string | null;
  occupant_type: string;
  occupant_name: string | null;
  occupant_phone: string | null;
};

const sideOf = (flat_no: string): "east" | "west" => {
  const digits = flat_no.replace(/\D/g, "");
  return digits.slice(-1) === "1" ? "east" : "west";
};

const isTenantFlat = (f: Flat) =>
  Boolean(f.occupant_name && f.occupant_name.trim()) ||
  (f.occupant_type === "tenant" && Boolean(f.occupant_phone));

export default function AdminBuildingOverview() {
  const { lang } = useLang();
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("flats")
        .select("id, flat_no, floor, owner_name, owner_name_bn, phone, occupant_type, occupant_name, occupant_phone")
        .order("floor")
        .order("flat_no");
      setFlats((data as Flat[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = flats.length;
    const eastCount = flats.filter((f) => sideOf(f.flat_no) === "east").length;
    const westCount = flats.filter((f) => sideOf(f.flat_no) === "west").length;
    const tenantCount = flats.filter(isTenantFlat).length;
    const ownerOccupied = total - tenantCount;

    const map = new Map<string, { name: string; flats: Flat[] }>();
    for (const f of flats) {
      const key = (f.phone && f.phone.trim()) || `name:${(f.owner_name || "").trim().toLowerCase()}` || f.id;
      if (!map.has(key)) {
        map.set(key, {
          name: (lang === "bn" ? f.owner_name_bn || f.owner_name : f.owner_name) || (lang === "bn" ? "অজানা" : "Unknown"),
          flats: [],
        });
      }
      map.get(key)!.flats.push(f);
    }
    const owners = Array.from(map.values()).sort((a, b) => b.flats.length - a.flats.length);
    return {
      total,
      eastCount,
      westCount,
      tenantCount,
      ownerOccupied,
      uniqueOwners: owners.length,
      multiOwners: owners.filter((o) => o.flats.length > 1),
    };
  }, [flats, lang]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {lang === "bn" ? "বিল্ডিং সারসংক্ষেপ" : "Building Overview"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? "পুরো বিল্ডিং-এর ফ্ল্যাট, মালিক ও বাসিন্দার সারসংক্ষেপ।"
              : "Summary of all flats, owners, and occupants in the building."}
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: lang === "bn" ? "মোট ফ্ল্যাট" : "Total Flats", value: stats.total },
                { label: lang === "bn" ? "পূর্ব পাশ" : "East Side", value: stats.eastCount },
                { label: lang === "bn" ? "পশ্চিম পাশ" : "West Side", value: stats.westCount },
                { label: lang === "bn" ? "মালিক নিজে" : "Owner-occupied", value: stats.ownerOccupied },
                { label: lang === "bn" ? "ভাড়াটিয়া" : "Tenants", value: stats.tenantCount },
                { label: lang === "bn" ? "মোট মালিক" : "Unique Owners", value: stats.uniqueOwners },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-xl font-bold text-foreground mt-1">{s.value}</div>
                </div>
              ))}
            </div>

            {stats.multiOwners.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-foreground mb-2">
                  {lang === "bn" ? "একাধিক ফ্ল্যাটের মালিক" : "Owners with multiple flats"}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.multiOwners.map((o, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-background/40 p-2.5 flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate flex-1 min-w-0">{o.name}</span>
                      <Badge variant="secondary" className="gap-1">
                        <Home className="h-3 w-3" />{o.flats.length}
                      </Badge>
                      <div className="flex flex-wrap gap-1 w-full">
                        {o.flats
                          .slice()
                          .sort((a, b) => a.flat_no.localeCompare(b.flat_no))
                          .map((f) => (
                            <Badge key={f.id} variant="outline" className="text-[10px] py-0 px-1.5">
                              {f.flat_no}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
