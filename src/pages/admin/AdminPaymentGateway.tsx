import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, KeyRound, CreditCard, ExternalLink, FlaskConical, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useSslczSettings, SSLCZ_DEFAULTS, type SslczSettings } from "@/hooks/useSslczSettings";
import { supabase } from "@/integrations/supabase/client";

type TestLog = {
  ok: boolean;
  at: string;
  mode?: string;
  httpStatus?: number;
  tran_id?: string;
  status?: string | null;
  failedreason?: string | null;
  gatewayPageURL?: string | null;
  storeIdPreview?: string;
  error?: string;
  raw?: any;
};

export default function AdminPaymentGateway() {
  const { lang } = useLang();
  const { settings, loading, save } = useSslczSettings();
  const [form, setForm] = useState<SslczSettings>(SSLCZ_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testAmount, setTestAmount] = useState<number>(10);
  const [logs, setLogs] = useState<TestLog[]>([]);

  useEffect(() => { setForm(settings); }, [settings]);

  const set = <K extends keyof SslczSettings>(k: K, v: SslczSettings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    if (form.fee_pct < 0 || form.fee_pct > 0.2) {
      toast.error(lang === "bn" ? "ফি ০–২০% এর মধ্যে দিন" : "Fee must be 0–20%");
      return;
    }
    if (form.min_amount < 0 || (form.max_amount > 0 && form.max_amount < form.min_amount)) {
      toast.error(lang === "bn" ? "Min/Max amount সঠিক নয়" : "Invalid min/max amount");
      return;
    }
    setSaving(true);
    const { error } = await save(form);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(lang === "bn" ? "সংরক্ষিত হয়েছে" : "Saved");
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("sslcz-test", {
        body: { amount: testAmount, mode: form.mode },
      });
      const at = new Date().toLocaleString();
      if (error) {
        setLogs((p) => [{ ok: false, at, error: error.message }, ...p].slice(0, 10));
        toast.error(error.message);
      } else {
        const log: TestLog = { ...(data as any), at };
        setLogs((p) => [log, ...p].slice(0, 10));
        if (log.ok) toast.success(lang === "bn" ? "টেস্ট সফল ✅" : "Test succeeded ✅");
        else toast.error(lang === "bn" ? "টেস্ট ব্যর্থ ❌" : "Test failed ❌");
      }
    } catch (e: any) {
      setLogs((p) => [{ ok: false, at: new Date().toLocaleString(), error: String(e?.message || e) }, ...p].slice(0, 10));
      toast.error(String(e?.message || e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {lang === "bn" ? "পেমেন্ট গেটওয়ে (SSLCommerz)" : "Payment Gateway (SSLCommerz)"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "অনলাইন কার্ড / মোবাইল ব্যাংকিং পেমেন্টের সেটিংস"
                : "Online card / mobile banking payment settings"}
            </p>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            {/* Enable / Mode */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-foreground">
                    {lang === "bn" ? "অনলাইন পেমেন্ট চালু" : "Enable online payment"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === "bn"
                      ? "চালু থাকলে owner/tenant দের কাছে 'Pay Online' বাটন দেখাবে।"
                      : "When on, residents will see a 'Pay Online' button on bills."}
                  </p>
                </div>
                <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{lang === "bn" ? "মোড" : "Mode"}</Label>
                  <Select value={form.mode} onValueChange={(v: "sandbox" | "live") => set("mode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (test)</SelectItem>
                      <SelectItem value="live">Live (production)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {lang === "bn"
                      ? "Live এ যেতে SSLCommerz থেকে live store credentials নিয়ে নিচে আপডেট করুন।"
                      : "For Live, update credentials below with SSLCommerz live store keys."}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Store ID ({lang === "bn" ? "ডিসপ্লে" : "display"})</Label>
                  <Input
                    value={form.store_id_display}
                    onChange={(e) => set("store_id_display", e.target.value)}
                    placeholder="e.g. bacch6a02fd499c465"
                  />
                </div>
              </div>
            </div>

            {/* Fee + range */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
              <div className="font-semibold text-foreground">
                {lang === "bn" ? "ফি ও সীমা" : "Fee & limits"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">
                    {lang === "bn" ? "Service charge %" : "Service charge %"}
                  </Label>
                  <Input
                    type="number" step="0.1" min={0} max={20}
                    value={(form.fee_pct * 100).toString()}
                    onChange={(e) => set("fee_pct", Math.max(0, Math.min(20, Number(e.target.value) || 0)) / 100)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {lang === "bn" ? "Owner উপর যোগ হবে" : "Added on top for the payer"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">{lang === "bn" ? "Min টাকা" : "Min amount (BDT)"}</Label>
                  <Input
                    type="number" min={0}
                    value={form.min_amount}
                    onChange={(e) => set("min_amount", Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <Label className="text-xs">{lang === "bn" ? "Max টাকা (0 = সীমা নাই)" : "Max amount (0 = no limit)"}</Label>
                  <Input
                    type="number" min={0}
                    value={form.max_amount}
                    onChange={(e) => set("max_amount", Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={onSave} disabled={saving} className="gap-2 gradient-primary text-primary-foreground">
                <Save className="h-4 w-4" /> {lang === "bn" ? "সংরক্ষণ" : "Save"}
              </Button>
            </div>

            {/* Credentials (secrets) */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-3">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                {lang === "bn" ? "Store credentials (গোপন)" : "Store credentials (secret)"}
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === "bn"
                  ? "Store ID ও Password সরাসরি ডেটাবেইজে রাখা হয় না — সেগুলো backend secret হিসেবে রাখা থাকে। আপডেট করতে নিচের লিংক থেকে Edge Function secrets পেজে যান এবং SSLCOMMERZ_STORE_ID ও SSLCOMMERZ_STORE_PASSWORD আপডেট করুন।"
                  : "Store ID & Password are kept as backend secrets, not in the database. To rotate them, open the Edge Function secrets page and update SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD."}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://supabase.com/dashboard/project/ogurhyuwaurxxivwgqnx/settings/functions"
                  target="_blank" rel="noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {lang === "bn" ? "Secrets পেজ খুলুন" : "Open secrets page"}
                  </Button>
                </a>
                <a
                  href={form.mode === "live"
                    ? "https://sellercenter.sslcommerz.com/"
                    : "https://developer.sslcommerz.com/registration/"}
                  target="_blank" rel="noreferrer"
                >
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    SSLCommerz {form.mode === "live" ? "Seller Center" : "Sandbox"}
                  </Button>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
