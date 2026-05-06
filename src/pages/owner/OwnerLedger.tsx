import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useOwnerFlats } from "@/hooks/useOwnerFlat";
import { useAuth } from "@/context/AuthContext";
import { FlatLedgerView } from "@/components/FlatLedgerView";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Building2, Home, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export default function OwnerLedger() {
  const { lang } = useLang();
  const { user } = useAuth();
  const { flats, loading } = useOwnerFlats();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (flats.length === 0) return;
    setOpenMap(prev => {
      const next = { ...prev };
      flats.forEach((f, i) => {
        if (next[f.id] === undefined) next[f.id] = i === 0;
      });
      return next;
    });
  }, [flats]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="print-hide flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {lang === "bn" ? "আমার লেজার" : "My Ledger"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "bn"
                ? "বিল, পেমেন্ট ও বকেয়ার পূর্ণ ইতিহাস"
                : "Full timeline of bills, payments and dues"}
            </p>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : flats.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
            {lang === "bn" ? "কোনো ফ্ল্যাট লিঙ্ক করা নেই।" : "No flat is linked to your account."}
          </div>
        ) : flats.length === 1 ? (
          <FlatLedgerView
            flat={{
              id: flats[0].id,
              flat_no: flats[0].flat_no,
              floor: flats[0].floor,
              size: flats[0].size,
              owner_name: flats[0].owner_name,
              owner_name_bn: flats[0].owner_name_bn,
            }}
          />
        ) : (
          <div className="space-y-4">
            {flats.map((f) => {
              const isOpen = !!openMap[f.id];
              const isRented = !!(user && f.owner_user_id === user.id && f.tenant_user_id && f.tenant_user_id !== user.id);
              return (
                <Collapsible key={f.id} open={isOpen} onOpenChange={(v) => setOpenMap(p => ({ ...p, [f.id]: v }))}>
                  <div className={cn(
                    "rounded-2xl bg-card border shadow-soft overflow-hidden transition-colors",
                    isRented ? "border-accent/40" : "border-border"
                  )}>
                    <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors text-left">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        isRented ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"
                      )}>
                        {isRented ? <Home className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-bold text-foreground">
                            {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {f.flat_no}
                          </div>
                          {isRented ? (
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
                              {lang === "bn" ? "ভাড়া" : "Rented"}
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              {lang === "bn" ? "নিজের" : "Own"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {lang === "bn" ? "তলা" : "Floor"} {f.floor} · {f.size} sqft
                        </div>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border p-4 bg-muted/10">
                        <FlatLedgerView
                          flat={{
                            id: f.id,
                            flat_no: f.flat_no,
                            floor: f.floor,
                            size: f.size,
                            owner_name: f.owner_name,
                            owner_name_bn: f.owner_name_bn,
                          }}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
