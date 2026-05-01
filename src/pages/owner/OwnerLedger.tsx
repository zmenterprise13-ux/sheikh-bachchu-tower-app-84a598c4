import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useOwnerFlat } from "@/hooks/useOwnerFlat";
import { FlatLedgerView } from "@/components/FlatLedgerView";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

export default function OwnerLedger() {
  const { lang } = useLang();
  const { flat, loading } = useOwnerFlat();

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
        ) : !flat ? (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
            {lang === "bn" ? "কোনো ফ্ল্যাট লিঙ্ক করা নেই।" : "No flat is linked to your account."}
          </div>
        ) : (
          <FlatLedgerView
            flat={{
              id: flat.id,
              flat_no: flat.flat_no,
              floor: flat.floor,
              size: flat.size,
              owner_name: flat.owner_name,
              owner_name_bn: flat.owner_name_bn,
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
