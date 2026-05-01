import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";

type HistoryRow = {
  id: string;
  changed_at: string;
  changed_by: string | null;
  changed_fields: string[];
  eid_month_1: string | null;
  eid_month_2: string | null;
  eid_due_day_1: number | null;
  eid_due_day_2: number | null;
  regular_due_day: number | null;
  other_due_offset_days: number | null;
  prev_eid_month_1: string | null;
  prev_eid_month_2: string | null;
  prev_eid_due_day_1: number | null;
  prev_eid_due_day_2: number | null;
  prev_regular_due_day: number | null;
  prev_other_due_offset_days: number | null;
};

const FIELD_LABEL: Record<string, { bn: string; en: string }> = {
  eid_month_1: { bn: "ঈদ মাস #১", en: "Eid Month #1" },
  eid_month_2: { bn: "ঈদ মাস #২", en: "Eid Month #2" },
  eid_due_day_1: { bn: "ঈদ #১ ডিউ দিন", en: "Eid #1 Due Day" },
  eid_due_day_2: { bn: "ঈদ #২ ডিউ দিন", en: "Eid #2 Due Day" },
  regular_due_day: { bn: "নিয়মিত ডিউ দিন", en: "Regular Due Day" },
  other_due_offset_days: { bn: "অন্যান্য চার্জ অফসেট (দিন)", en: "Other Charge Offset (days)" },
  initial: { bn: "প্রাথমিক সেটআপ", en: "Initial setup" },
};

export default function AdminSettingsHistory() {
  const { lang } = useLang();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("billing_settings_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(200);
      const list = (data || []) as HistoryRow[];
      setRows(list);

      const userIds = Array.from(new Set(list.map((r) => r.changed_by).filter(Boolean))) as string[];
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => {
          map[p.user_id] = p.display_name || p.user_id.slice(0, 8);
        });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, []);

  const fmtVal = (field: string, v: any) => {
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <HistoryIcon className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">
                {lang === "bn" ? "সেটিংস পরিবর্তন ইতিহাস" : "Settings Change History"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {lang === "bn"
                  ? "ঈদ ও অন্যান্য চার্জ ডিউ সেটিংসের সকল পরিবর্তন"
                  : "All changes to Eid and Other Charges due settings"}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/settings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {lang === "bn" ? "সেটিংস" : "Back to Settings"}
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            {lang === "bn" ? "কোনো ইতিহাস পাওয়া যায়নি।" : "No history yet."}
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold">
                      {format(new Date(r.changed_at), "PPpp")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lang === "bn" ? "পরিবর্তনকারী: " : "By: "}
                      {r.changed_by ? profiles[r.changed_by] || r.changed_by.slice(0, 8) : (lang === "bn" ? "সিস্টেম" : "System")}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.changed_fields.map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs">
                        {FIELD_LABEL[f]?.[lang] || f}
                      </Badge>
                    ))}
                  </div>
                </div>

                {!r.changed_fields.includes("initial") && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">
                            {lang === "bn" ? "ফিল্ড" : "Field"}
                          </th>
                          <th className="text-left p-2 font-medium">
                            {lang === "bn" ? "আগে" : "Before"}
                          </th>
                          <th className="text-left p-2 font-medium">
                            {lang === "bn" ? "পরে" : "After"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.changed_fields.map((f) => {
                          const prev = (r as any)[`prev_${f}`];
                          const next = (r as any)[f];
                          return (
                            <tr key={f} className="border-t border-border">
                              <td className="p-2 font-medium">
                                {FIELD_LABEL[f]?.[lang] || f}
                              </td>
                              <td className="p-2 text-muted-foreground line-through">
                                {fmtVal(f, prev)}
                              </td>
                              <td className="p-2 text-foreground font-semibold">
                                {fmtVal(f, next)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
