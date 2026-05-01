import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Settings = {
  id?: string;
  eid_month_1: string | null;
  eid_month_2: string | null;
  eid_due_day_1: number;
  eid_due_day_2: number;
  regular_due_day: number;
  other_due_offset_days: number;
};

const DEFAULTS: Settings = {
  eid_month_1: null,
  eid_month_2: null,
  eid_due_day_1: 10,
  eid_due_day_2: 10,
  regular_due_day: 10,
  other_due_offset_days: 15,
};

const toMonthDate = (m: string | null) => (m ? new Date(`${m}-01T00:00:00Z`) : undefined);
const fromDate = (d: Date | undefined) =>
  d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}` : null;

export default function AdminSettings() {
  const { t, lang } = useLang();
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("billing_settings")
        .select("id, eid_month_1, eid_month_2, eid_due_day_1, eid_due_day_2, regular_due_day, other_due_offset_days")
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) setForm(data as Settings);
      setLoading(false);
    })();
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = {
      eid_month_1: form.eid_month_1,
      eid_month_2: form.eid_month_2,
      eid_due_day_1: form.eid_due_day_1,
      eid_due_day_2: form.eid_due_day_2,
      regular_due_day: form.regular_due_day,
      other_due_offset_days: form.other_due_offset_days,
    };
    const { data, error } = form.id
      ? await supabase.from("billing_settings").update(payload).eq("id", form.id).select().single()
      : await supabase.from("billing_settings").insert(payload).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setForm(data as Settings);
    toast.success(lang === "bn" ? "সংরক্ষিত হয়েছে" : "Saved");
  };

  const MonthPicker = ({ value, onChange }: { value: string | null; onChange: (m: string | null) => void }) => {
    const date = toMonthDate(value);
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "MMMM yyyy") : (lang === "bn" ? "মাস নির্বাচন" : "Pick month")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(fromDate(d))}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("billingSettings")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? "ঈদ বোনাসের মাস, ডিউ ডেট ও অন্যান্য আদায়ের ডিউ অফসেট কনফিগার করুন"
              : "Configure Eid bonus months, due dates and other-charge due offset"}
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <div className="space-y-6">
            {/* Eid 1 */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
              <div className="font-semibold text-foreground">
                {t("eidBonus")} #1 ({lang === "bn" ? "ঈদুল ফিতর" : "Eid-ul-Fitr"})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("month")}</Label>
                  <MonthPicker value={form.eid_month_1} onChange={(m) => set("eid_month_1", m)} />
                </div>
                <div>
                  <Label className="text-xs">{t("dueDay")}</Label>
                  <Input
                    type="number" min={1} max={28}
                    value={form.eid_due_day_1}
                    onChange={(e) => set("eid_due_day_1", Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
                  />
                </div>
              </div>
            </div>

            {/* Eid 2 */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
              <div className="font-semibold text-foreground">
                {t("eidBonus")} #2 ({lang === "bn" ? "ঈদুল আযহা" : "Eid-ul-Adha"})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("month")}</Label>
                  <MonthPicker value={form.eid_month_2} onChange={(m) => set("eid_month_2", m)} />
                </div>
                <div>
                  <Label className="text-xs">{t("dueDay")}</Label>
                  <Input
                    type="number" min={1} max={28}
                    value={form.eid_due_day_2}
                    onChange={(e) => set("eid_due_day_2", Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
                  />
                </div>
              </div>
            </div>

            {/* Regular + other */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
              <div className="font-semibold text-foreground">
                {lang === "bn" ? "নিয়মিত বিল ও অন্যান্য আদায়" : "Regular bills & other charges"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">
                    {lang === "bn" ? "নিয়মিত বিলের ডিউ-ডে (১-২৮)" : "Regular bill due day (1–28)"}
                  </Label>
                  <Input
                    type="number" min={1} max={28}
                    value={form.regular_due_day}
                    onChange={(e) => set("regular_due_day", Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    {lang === "bn" ? "অন্যান্য আদায়ের ডিউ-অফসেট (দিন)" : "Other charge due offset (days)"}
                  </Label>
                  <Input
                    type="number" min={0} max={60}
                    value={form.other_due_offset_days}
                    onChange={(e) => set("other_due_offset_days", Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === "bn"
                  ? "অন্যান্য আদায় যোগের ৭/১৫/৩০ দিন পর ডিউ ধরে নেওয়া হবে।"
                  : "Other charges will be due this many days after they're added."}
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="gap-2 gradient-primary text-primary-foreground">
                <Save className="h-4 w-4" /> {t("save")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
