import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function shiftMonth(m: string, delta: number): string {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mm - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function BillGenerationTester() {
  const { lang } = useLang();
  const [billedMonths, setBilledMonths] = useState<Set<string>>(new Set());
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [month, setMonth] = useState<string>("");
  const [eidOverride, setEidOverride] = useState(false);
  const [forceEid, setForceEid] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  // Build a window of candidate months (last 12 + current + next 1) and exclude already-billed ones.
  const now = currentMonth();
  const candidates: string[] = [];
  for (let i = -12; i <= 1; i++) candidates.push(shiftMonth(now, i));
  const availableMonths = candidates.filter((m) => !billedMonths.has(m));

  const loadBilled = async () => {
    setLoadingMonths(true);
    const { data } = await supabase.from("bills").select("month");
    const set = new Set<string>((data ?? []).map((r: any) => r.month as string));
    setBilledMonths(set);
    setLoadingMonths(false);
    // pick default month: latest available <= current, else first available
    setMonth((prev) => {
      if (prev && !set.has(prev)) return prev;
      const preferred = [...candidates].reverse().find((m) => !set.has(m) && m <= now);
      return preferred ?? candidates.find((m) => !set.has(m)) ?? "";
    });
  };

  useEffect(() => { loadBilled(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const run = async () => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    if (billedMonths.has(month)) return;
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
      // Refresh billed months so generated month disappears from picker
      await loadBilled();
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
            ? "যে মাসের বিল ইতিমধ্যে জেনারেট হয়েছে সেটি তালিকায় দেখাবে না।"
            : "Months that already have bills are hidden from the picker."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <Label className="text-xs">{lang === "bn" ? "মাস" : "Month"}</Label>
          <Select value={month} onValueChange={setMonth} disabled={loadingMonths || availableMonths.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={
                loadingMonths
                  ? (lang === "bn" ? "লোড হচ্ছে…" : "Loading…")
                  : availableMonths.length === 0
                    ? (lang === "bn" ? "কোনো মাস বাকি নেই" : "No months left")
                    : (lang === "bn" ? "মাস নির্বাচন করুন" : "Select month")
              } />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={run} disabled={running || !month || billedMonths.has(month)} className="gap-2 gradient-primary text-primary-foreground">
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
          <AlertDescription className="space-y-3">
            {result.ok && result.data && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                  <Stat label={lang === "bn" ? "মাস" : "Month"} value={String(result.data.month)} />
                  <Stat label={lang === "bn" ? "মোট ফ্ল্যাট" : "Total flats"} value={String(result.data.flats_total ?? 0)} />
                  <Stat label={lang === "bn" ? "নতুন তৈরি" : "Inserted"} value={String(result.data.inserted ?? 0)} highlight />
                  <Stat label={lang === "bn" ? "ব্যাকফিল মাস" : "Backfill"} value={String(result.data.backfill ?? 0)} />
                </div>

                {Array.isArray(result.data.months) && result.data.months.map((m: any) => (
                  <div key={m.month} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-sm">
                        {m.month}
                        {m.failed && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-2 py-0.5 text-[10px] font-semibold">
                            <XCircle className="h-3 w-3" /> {lang === "bn" ? "ব্যর্থ" : "Failed"}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {lang === "bn" ? "ইনসার্ট" : "Inserted"}: <b className="text-success">{m.inserted}</b>
                        {" · "}
                        {lang === "bn" ? "স্কিপ" : "Skipped"}: <b className="text-muted-foreground">{m.already_billed}</b>
                        {" · "}
                        {lang === "bn" ? "ঈদ" : "Eid"}: {m.eid_included ? "✓" : "—"}
                      </div>
                    </div>
                    {m.error && (
                      <pre className="text-[10px] p-2 rounded bg-destructive/10 text-destructive overflow-x-auto whitespace-pre-wrap">{m.error}</pre>
                    )}
                    <div className="grid sm:grid-cols-2 gap-2">
                      <FlatList
                        title={lang === "bn" ? "নতুন তৈরি ফ্ল্যাট" : "Inserted flats"}
                        flats={m.inserted_flats ?? []}
                        tone="success"
                      />
                      <FlatList
                        title={lang === "bn" ? "স্কিপ হওয়া (ইতিমধ্যে বিল আছে)" : "Skipped (already billed)"}
                        flats={m.skipped_flats ?? []}
                        tone="muted"
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
            {result.error && (
              <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-x-auto whitespace-pre-wrap">{result.error}</pre>
            )}
            <details className="text-[10px]">
              <summary className="cursor-pointer text-muted-foreground">{lang === "bn" ? "র Response" : "Raw response"}</summary>
              <pre className="mt-1 p-2 rounded bg-muted/50 overflow-x-auto max-h-48">
                {JSON.stringify({ startedAt: result.startedAt, response: result.data ?? null }, null, 2)}
              </pre>
            </details>
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

function FlatList({
  title, flats, tone,
}: { title: string; flats: Array<{ id: string; flat_no: string }>; tone: "success" | "muted" }) {
  const toneCls = tone === "success"
    ? "border-success/30 bg-success/5"
    : "border-border bg-muted/30";
  return (
    <div className={`rounded-md border p-2 ${toneCls}`}>
      <div className="text-[10px] uppercase text-muted-foreground mb-1">
        {title} ({flats.length})
      </div>
      {flats.length === 0 ? (
        <div className="text-[11px] text-muted-foreground italic">—</div>
      ) : (
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
          {flats.map((f) => (
            <span key={f.id} className="inline-block rounded border border-border bg-background px-1.5 py-0.5 text-[11px] font-mono">
              {f.flat_no}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
