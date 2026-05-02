import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlayCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";

const currentMonth = () => new Date().toISOString().slice(0, 7);

type RunResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  startedAt: string;
  data?: any;
  error?: string;
};

export function BillGenerationTester() {
  const { lang } = useLang();
  const [month, setMonth] = useState(currentMonth());
  const [eidOverride, setEidOverride] = useState(false);
  const [forceEid, setForceEid] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  const run = async () => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    setRunning(true);
    setResult(null);
    const startedAt = new Date().toISOString();
    const t0 = performance.now();
    try {
      const body: Record<string, unknown> = { month };
      if (eidOverride) body.eid = forceEid;
      const { data, error } = await supabase.functions.invoke("generate-monthly-bills", { body });
      const durationMs = Math.round(performance.now() - t0);
      if (error) {
        setResult({ ok: false, status: (error as any).status ?? 0, durationMs, startedAt, error: error.message, data });
      } else {
        setResult({ ok: true, status: 200, durationMs, startedAt, data });
      }
    } catch (e) {
      setResult({
        ok: false, status: 0, durationMs: Math.round(performance.now() - t0),
        startedAt, error: (e as Error).message,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
      <div>
        <div className="font-semibold text-foreground">
          {lang === "bn" ? "ম্যানুয়াল বিল জেনারেশন টেস্ট" : "Manual bill generation test"}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {lang === "bn"
            ? "নির্বাচিত মাসের জন্য বিল জেনারেট করে। ইতিমধ্যে বিল আছে এমন ফ্ল্যাট স্কিপ হবে।"
            : "Generates bills for the selected month. Flats already billed will be skipped."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <Label className="text-xs">{lang === "bn" ? "মাস" : "Month"}</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <Button onClick={run} disabled={running} className="gap-2 gradient-primary text-primary-foreground">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          {lang === "bn" ? "টেস্ট চালান" : "Run test"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="eid-override" checked={eidOverride} onCheckedChange={setEidOverride} />
          <Label htmlFor="eid-override" className="text-xs cursor-pointer">
            {lang === "bn" ? "ঈদ বোনাস ম্যানুয়ালি সেট করুন" : "Override Eid bonus"}
          </Label>
        </div>
        {eidOverride && (
          <div className="flex items-center gap-2">
            <Switch id="force-eid" checked={forceEid} onCheckedChange={setForceEid} />
            <Label htmlFor="force-eid" className="text-xs cursor-pointer">
              {forceEid
                ? (lang === "bn" ? "ঈদ বোনাস যোগ হবে" : "Include Eid bonus")
                : (lang === "bn" ? "ঈদ বোনাস বাদ" : "Exclude Eid bonus")}
            </Label>
          </div>
        )}
      </div>

      {result && (
        <Alert variant={result.ok ? "default" : "destructive"}>
          {result.ok
            ? <CheckCircle2 className="h-4 w-4 text-success" />
            : <XCircle className="h-4 w-4" />}
          <AlertTitle>
            {result.ok
              ? (lang === "bn" ? "সফল" : "Success")
              : (lang === "bn" ? "ব্যর্থ" : "Failed")}
            {" · "}
            <span className="font-mono text-xs">{result.status} · {result.durationMs}ms</span>
          </AlertTitle>
          <AlertDescription className="space-y-2">
            {result.ok && result.data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                <Stat label={lang === "bn" ? "মাস" : "Month"} value={String(result.data.month)} />
                <Stat label={lang === "bn" ? "মোট ফ্ল্যাট" : "Total flats"} value={String(result.data.flats_total ?? 0)} />
                <Stat label={lang === "bn" ? "ইতিমধ্যে বিল" : "Already billed"} value={String(result.data.already_billed ?? 0)} />
                <Stat label={lang === "bn" ? "নতুন তৈরি" : "Inserted"} value={String(result.data.inserted ?? 0)} highlight />
                <Stat label={lang === "bn" ? "ঈদ বোনাস" : "Eid included"} value={result.data.eid_included ? "Yes" : "No"} />
              </div>
            )}
            {result.error && (
              <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-x-auto whitespace-pre-wrap">{result.error}</pre>
            )}
            <pre className="mt-2 p-2 rounded bg-muted/50 text-[10px] overflow-x-auto max-h-48">
              {JSON.stringify({ startedAt: result.startedAt, response: result.data ?? null }, null, 2)}
            </pre>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`font-semibold ${highlight ? "text-success" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
