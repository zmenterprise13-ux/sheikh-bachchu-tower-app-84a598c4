import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Phone, Home, Pencil, Wallet, CalendarIcon, BookOpen, Printer, KeyRound, Loader2, Plus } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { InitialsFallback } from "@/components/InitialsFallback";
import { PhotoUpload } from "@/components/PhotoUpload";
import { useSignupEnabled } from "@/hooks/useSignupEnabled";

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
  eid_bonus: number;
  is_occupied: boolean;
  occupant_type: "owner" | "tenant";
  occupant_name: string | null;
  occupant_name_bn: string | null;
  occupant_phone: string | null;
  occupant_photo_url: string | null;
  owner_photo_url: string | null;
};

const SELECT_COLS =
  "id, flat_no, floor, owner_name, owner_name_bn, phone, size, service_charge, gas_bill, parking, eid_bonus, is_occupied, occupant_type, occupant_name, occupant_name_bn, occupant_phone, occupant_photo_url, owner_photo_url";

export default function AdminFlats() {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Flat | null>(null);
  const [ledgerFlat, setLedgerFlat] = useState<Flat | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkLoginBusy, setBulkLoginBusy] = useState(false);
  const { enabled: signupEnabled } = useSignupEnabled();

  const missingLogins = (flats as any[]).filter(
    (f) => !f.owner_user_id && /^\d{11}$/.test((f.phone ?? "").trim()),
  );

  const createMissingLogins = async () => {
    if (!signupEnabled) {
      toast.error(lang === "bn" ? "সাইন আপ বর্তমানে বন্ধ আছে" : "Sign up is currently disabled");
      return;
    }
    if (missingLogins.length === 0) {
      toast.info(lang === "bn" ? "সব ফ্ল্যাটের লগইন তৈরি আছে" : "All flats already have logins");
      return;
    }
    setBulkLoginBusy(true);
    // dedupe by phone
    const seen = new Set<string>();
    const targets = missingLogins.filter((f) => {
      const p = (f.phone as string).trim();
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    let ok = 0;
    let fail = 0;
    for (const f of targets) {
      const { data, error } = await supabase.functions.invoke("owner-create-account", {
        body: { phone: (f.phone as string).trim(), flat_id: f.id },
      });
      if (error || (data as any)?.error) fail++;
      else ok++;
    }
    setBulkLoginBusy(false);
    if (ok) toast.success(lang === "bn" ? `${ok} টি লগইন তৈরি (পাসওয়ার্ড: 12345678)` : `Created ${ok} logins (password: 12345678)`);
    if (fail) toast.error(lang === "bn" ? `${fail} টি ব্যর্থ` : `${fail} failed`);
    await load();
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("flats")
      .select(SELECT_COLS)
      .order("floor")
      .order("flat_no");
    if (error) toast.error(error.message);
    setFlats((data ?? []) as Flat[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = flats.filter((f) => {
    const s = q.toLowerCase();
    return (
      !s ||
      f.flat_no.toLowerCase().includes(s) ||
      (f.owner_name ?? "").toLowerCase().includes(s) ||
      (f.owner_name_bn ?? "").includes(q) ||
      (f.occupant_name ?? "").toLowerCase().includes(s) ||
      (f.phone ?? "").includes(q)
    );
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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="default"
              size="sm"
              onClick={() => setAddOpen(true)}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              {lang === "bn" ? "নতুন ফ্ল্যাট" : "New Flat"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="shrink-0"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {lang === "bn" ? "বাল্ক সার্ভিস চার্জ" : "Bulk Service Charge"}
            </Button>
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={lang === "bn" ? "খুঁজুন..." : "Search..."}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((f) => {
              const occName = lang === "bn" ? f.occupant_name_bn : f.occupant_name;
              const ownName = lang === "bn" ? f.owner_name_bn : f.owner_name;
              return (
                <div
                  key={f.id}
                  className="rounded-2xl bg-card border border-border p-5 shadow-soft hover:shadow-elegant transition-smooth"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground font-bold shrink-0">
                      {f.flat_no}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {f.occupant_photo_url ? (
                            <AvatarImage src={f.occupant_photo_url} />
                          ) : null}
                          <InitialsFallback name={occName ?? ownName ?? "?"} seed={f.id} className="text-[10px]" />
                        </Avatar>
                        <div className="font-semibold text-foreground truncate">
                          {occName || ownName || "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="h-3 w-3" />{" "}
                        {f.occupant_phone || f.phone || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setLedgerFlat(f)}
                        className="h-8 w-8"
                        title={lang === "bn" ? "লেজার" : "Ledger"}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(f)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={
                        "text-[10px] font-bold rounded-full px-2 py-0.5 " +
                        (f.occupant_type === "owner"
                          ? "bg-primary/15 text-primary"
                          : "bg-warning/15 text-warning")
                      }
                    >
                      {f.occupant_type === "owner" ? t("ownerLabel") : t("tenantLabel")}
                    </span>
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
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Home className="h-3 w-3" /> {lang === "bn" ? "সাইজ" : "Size"}
                      </div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {formatNumber(f.size, lang)} sqft
                      </div>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2">
                      <div className="text-muted-foreground">{t("parking")}</div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {Number(f.parking) > 0 ? formatMoney(Number(f.parking), lang) : "—"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2">
                      <div className="text-muted-foreground">{t("serviceCharge")}</div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {formatMoney(Number(f.service_charge), lang)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2">
                      <div className="text-muted-foreground">{t("gasBill")}</div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {formatMoney(Number(f.gas_bill), lang)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FlatEditDialog
        flat={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <BulkServiceChargeDialog
        open={bulkOpen}
        flats={flats}
        onClose={() => setBulkOpen(false)}
        onDone={() => {
          setBulkOpen(false);
          load();
        }}
      />

      <FlatLedgerDialog
        flat={ledgerFlat}
        onClose={() => setLedgerFlat(null)}
      />

      <AddFlatDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load(); }}
      />
    </AppShell>
  );
}

function AddFlatDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { lang } = useLang();
  const [flatNo, setFlatNo] = useState("");
  const [floor, setFloor] = useState<number>(1);
  const [ownerName, setOwnerName] = useState("");
  const [ownerNameBn, setOwnerNameBn] = useState("");
  const [phone, setPhone] = useState("");
  const [size, setSize] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFlatNo(""); setFloor(1); setOwnerName(""); setOwnerNameBn(""); setPhone(""); setSize(0);
  };

  const submit = async () => {
    if (!flatNo.trim()) {
      toast.error(lang === "bn" ? "ফ্ল্যাট নম্বর দিন" : "Flat number required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("flats").insert({
      flat_no: flatNo.trim(),
      floor: Number(floor) || 1,
      owner_name: ownerName || null,
      owner_name_bn: ownerNameBn || null,
      phone: phone || null,
      size: Number(size) || 0,
      occupant_type: "owner",
      is_occupied: true,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "ফ্ল্যাট যোগ হয়েছে" : "Flat added");
    reset();
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "নতুন ফ্ল্যাট যোগ করুন" : "Add new flat"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{lang === "bn" ? "ফ্ল্যাট নম্বর" : "Flat No"}</Label>
              <Input value={flatNo} onChange={(e) => setFlatNo(e.target.value)} placeholder="11A" />
            </div>
            <div>
              <Label className="text-xs">{lang === "bn" ? "ফ্লোর" : "Floor"}</Label>
              <Input type="number" value={floor} onChange={(e) => setFloor(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Owner Name (EN)</Label>
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">ওনার নাম (BN)</Label>
            <Input value={ownerNameBn} onChange={(e) => setOwnerNameBn(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{lang === "bn" ? "মোবাইল" : "Phone"}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={11} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <Label className="text-xs">Size (sqft)</Label>
              <Input type="number" value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving}>
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {lang === "bn" ? "যোগ করুন" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ChargeKey = "service_charge" | "gas_bill" | "eid_bonus" | "other_charge";
type ChargeEntry = { enabled: boolean; mode: "flat" | "sqft"; value: string; note: string };
type ChargeState = Record<ChargeKey, ChargeEntry>;

const CHARGE_META: { key: ChargeKey; labelBn: string; labelEn: string; onFlat: boolean }[] = [
  { key: "service_charge", labelBn: "সার্ভিস চার্জ", labelEn: "Service Charge", onFlat: true },
  { key: "gas_bill", labelBn: "গ্যাস বিল", labelEn: "Gas Bill", onFlat: true },
  { key: "eid_bonus", labelBn: "ঈদ বোনাস", labelEn: "Eid Bonus", onFlat: true },
  { key: "other_charge", labelBn: "অন্যান্য আদায়", labelEn: "Other Charge", onFlat: false },
];

const defaultEntry = (): ChargeEntry => ({ enabled: false, mode: "flat", value: "", note: "" });

function BulkServiceChargeDialog({
  open,
  flats,
  onClose,
  onDone,
}: {
  open: boolean;
  flats: Flat[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, lang } = useLang();
  const [charges, setCharges] = useState<ChargeState>({
    service_charge: defaultEntry(),
    gas_bill: defaultEntry(),
    eid_bonus: defaultEntry(),
    other_charge: defaultEntry(),
  });
  const [updateBills, setUpdateBills] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  });
  const [monthBills, setMonthBills] = useState<
    Record<string, { id: string; status: string; service_charge: number; gas_bill: number; eid_bonus: number; other_charge: number }>
  >({});
  const [billsLoading, setBillsLoading] = useState(false);

  const month = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setBillsLoading(true);
      const { data } = await supabase
        .from("bills")
        .select("id, flat_id, status, service_charge, gas_bill, eid_bonus, other_charge")
        .eq("month", month);
      if (cancelled) return;
      const map: typeof monthBills = {};
      (data || []).forEach((b: any) => {
        map[b.flat_id] = {
          id: b.id,
          status: b.status,
          service_charge: Number(b.service_charge) || 0,
          gas_bill: Number(b.gas_bill) || 0,
          eid_bonus: Number(b.eid_bonus) || 0,
          other_charge: Number(b.other_charge) || 0,
        };
      });
      setMonthBills(map);
      setBillsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, month]);

  const setField = (key: ChargeKey, patch: Partial<ChargeEntry>) =>
    setCharges((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const calcValue = (entry: ChargeEntry, flat: Flat) => {
    const v = Number(entry.value) || 0;
    return entry.mode === "sqft" ? Math.round(v * flat.size) : v;
  };

  const enabledCharges = CHARGE_META.filter((c) => charges[c.key].enabled && Number(charges[c.key].value) > 0);

  const preview = flats.slice(0, 3).map((f) => {
    const items: { label: string; value: number }[] = enabledCharges.map((c) => ({
      label: lang === "bn" ? c.labelBn : c.labelEn,
      value: calcValue(charges[c.key], f),
    }));
    return { flat_no: f.flat_no, items };
  });

  const apply = async () => {
    if (enabledCharges.length === 0) {
      toast.error(lang === "bn" ? "অন্তত একটি চার্জ সিলেক্ট করুন" : "Enable at least one charge");
      return;
    }
    setSaving(true);
    try {
      // Update flat master data (only for charges that exist on flats table)
      for (const f of flats) {
        const flatUpdate: Record<string, number> = {};
        for (const c of enabledCharges) {
          if (c.onFlat) {
            flatUpdate[c.key] = calcValue(charges[c.key], f);
          }
        }
        if (Object.keys(flatUpdate).length > 0) {
          const { error } = await supabase.from("flats").update(flatUpdate as any).eq("id", f.id);
          if (error) throw error;
        }
      }

      // Update current month's unpaid bills
      let billsUpdated = 0;
      if (updateBills) {
        for (const f of flats) {
          const billUpdate: Record<string, number | string> = {};
          for (const c of enabledCharges) {
            billUpdate[c.key] = calcValue(charges[c.key], f);
          }
          // Add other_note if other_charge is set
          if (charges.other_charge.enabled && charges.other_charge.note) {
            billUpdate.other_note = charges.other_charge.note;
          }
          const { data: rows, error } = await supabase
            .from("bills")
            .update(billUpdate as any)
            .eq("flat_id", f.id)
            .eq("month", month)
            .neq("status", "paid")
            .select("id");
          if (error) throw error;
          billsUpdated += rows?.length ?? 0;
        }
      }

      toast.success(
        lang === "bn"
          ? `${flats.length} টি ফ্ল্যাট আপডেট · ${billsUpdated} টি বিল আপডেট`
          : `${flats.length} flats updated · ${billsUpdated} bills updated`
      );
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lang === "bn" ? "বাল্ক চার্জ আপডেট" : "Bulk Charge Update"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target month picker */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <Label className="text-xs font-semibold">
              {lang === "bn" ? "টার্গেট মাস" : "Target Month"}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal h-9")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(monthDate, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={monthDate}
                  onSelect={(d) => {
                    if (d) {
                      setMonthDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)));
                    }
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground">
              {lang === "bn"
                ? `নির্বাচিত মাস: ${month}`
                : `Selected: ${month}`}
            </p>
          </div>

          {CHARGE_META.map((c) => {
            const entry = charges[c.key];
            return (
              <div
                key={c.key}
                className={
                  "rounded-lg border p-3 space-y-2 transition-colors " +
                  (entry.enabled ? "border-primary/50 bg-primary/5" : "border-border")
                }
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`chk-${c.key}`}
                    checked={entry.enabled}
                    onChange={(e) => setField(c.key, { enabled: e.target.checked })}
                  />
                  <Label htmlFor={`chk-${c.key}`} className="text-sm font-semibold cursor-pointer">
                    {lang === "bn" ? c.labelBn : c.labelEn}
                  </Label>
                </div>

                {entry.enabled && (
                  <div className="space-y-2 pl-6">
                    <RadioGroup
                      value={entry.mode}
                      onValueChange={(v) => setField(c.key, { mode: v as any })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-1">
                        <RadioGroupItem value="flat" id={`${c.key}-flat`} />
                        <Label htmlFor={`${c.key}-flat`} className="text-xs font-normal cursor-pointer">
                          {lang === "bn" ? "ফিক্সড" : "Fixed"}
                        </Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <RadioGroupItem value="sqft" id={`${c.key}-sqft`} />
                        <Label htmlFor={`${c.key}-sqft`} className="text-xs font-normal cursor-pointer">
                          {lang === "bn" ? "প্রতি sqft" : "Per sqft"}
                        </Label>
                      </div>
                    </RadioGroup>
                    <Input
                      type="number"
                      value={entry.value}
                      onChange={(e) => setField(c.key, { value: e.target.value })}
                      placeholder={entry.mode === "flat" ? "5000" : "5"}
                      className="h-8 text-sm"
                    />
                    {c.key === "other_charge" && (
                      <Input
                        value={entry.note}
                        onChange={(e) => setField(c.key, { note: e.target.value })}
                        placeholder={lang === "bn" ? "নোট (ঐচ্ছিক)" : "Note (optional)"}
                        className="h-8 text-sm"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Month-wise unpaid bills preview */}
          {enabledCharges.length > 0 && updateBills && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-2 max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  {lang === "bn" ? `${month} - বিল প্রিভিউ` : `${month} — Bill Preview`}
                </div>
                {billsLoading && (
                  <span className="text-muted-foreground italic">
                    {lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}
                  </span>
                )}
              </div>
              {(() => {
                const unpaidFlats = flats.filter(
                  (f) => monthBills[f.id] && monthBills[f.id].status !== "paid"
                );
                const noBillFlats = flats.filter((f) => !monthBills[f.id]);
                const paidFlats = flats.filter(
                  (f) => monthBills[f.id] && monthBills[f.id].status === "paid"
                );

                if (billsLoading) return null;

                return (
                  <>
                    <div className="flex flex-wrap gap-3 text-[11px] pb-1 border-b border-border">
                      <span className="text-success font-medium">
                        {lang === "bn" ? "আপডেট হবে: " : "Will update: "}
                        {formatNumber(unpaidFlats.length, lang)}
                      </span>
                      <span className="text-muted-foreground">
                        {lang === "bn" ? "পেইড (স্কিপ): " : "Paid (skip): "}
                        {formatNumber(paidFlats.length, lang)}
                      </span>
                      <span className="text-warning">
                        {lang === "bn" ? "বিল নেই: " : "No bill: "}
                        {formatNumber(noBillFlats.length, lang)}
                      </span>
                    </div>

                    {unpaidFlats.length === 0 ? (
                      <div className="text-muted-foreground italic py-2">
                        {lang === "bn"
                          ? "এই মাসের কোনো আনপেইড বিল নেই।"
                          : "No unpaid bills for this month."}
                      </div>
                    ) : (
                      unpaidFlats.map((f) => {
                        const bill = monthBills[f.id];
                        return (
                          <div key={f.id} className="border-b border-border/50 pb-1.5">
                            <div className="font-medium text-foreground">
                              {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {f.flat_no}
                            </div>
                            {enabledCharges.map((c) => {
                              const newVal = calcValue(charges[c.key], f);
                              const oldVal = bill[c.key];
                              const changed = newVal !== oldVal;
                              return (
                                <div
                                  key={c.key}
                                  className="flex justify-between pl-3 text-muted-foreground"
                                >
                                  <span>{lang === "bn" ? c.labelBn : c.labelEn}</span>
                                  <span className="flex items-center gap-1.5">
                                    {changed && (
                                      <>
                                        <span className="line-through opacity-60">
                                          {formatMoney(oldVal, lang)}
                                        </span>
                                        <span>→</span>
                                      </>
                                    )}
                                    <span
                                      className={
                                        changed ? "font-semibold text-primary" : "text-foreground"
                                      }
                                    >
                                      {formatMoney(newVal, lang)}
                                    </span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    )}

                    {noBillFlats.length > 0 && (
                      <div className="text-[11px] text-warning italic pt-1">
                        {lang === "bn"
                          ? `${formatNumber(noBillFlats.length, lang)} টি ফ্ল্যাটে এই মাসের বিল নেই — এদের বিল আপডেট স্কিপ হবে`
                          : `${noBillFlats.length} flat(s) have no bill for this month — they'll be skipped`}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Charge values preview (master flat data) */}
          {enabledCharges.length > 0 && !updateBills && preview.some((p) => p.items.length > 0) && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-2">
              <div className="font-semibold">
                {lang === "bn" ? "ফ্ল্যাট মাস্টার ডেটা প্রিভিউ:" : "Flat master data preview:"}
              </div>
              {preview.map((p) => (
                <div key={p.flat_no}>
                  <div className="font-medium text-foreground">
                    {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {p.flat_no}
                  </div>
                  {p.items.map((item) => (
                    <div key={item.label} className="flex justify-between pl-3 text-muted-foreground">
                      <span>{item.label}</span>
                      <span className="font-medium text-foreground">{formatMoney(item.value, lang)}</span>
                    </div>
                  ))}
                </div>
              ))}
              {flats.length > 3 && (
                <div className="text-muted-foreground italic">
                  …{lang === "bn" ? "এবং আরো" : "and"} {flats.length - 3} {lang === "bn" ? "টি" : "more"}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              id="upd-bills"
              type="checkbox"
              checked={updateBills}
              onChange={(e) => setUpdateBills(e.target.checked)}
            />
            <Label htmlFor="upd-bills" className="text-sm font-normal cursor-pointer">
              {lang === "bn"
                ? `চলতি মাসের (${month}) আনপেইড বিলও আপডেট করুন`
                : `Also update this month's (${month}) unpaid bills`}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button onClick={apply} disabled={saving || enabledCharges.length === 0}>
            {saving
              ? lang === "bn" ? "প্রয়োগ হচ্ছে..." : "Applying..."
              : lang === "bn" ? `${flats.length} টি ফ্ল্যাটে প্রয়োগ` : `Apply to ${flats.length} flats`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlatEditDialog({
  flat,
  onClose,
  onSaved,
}: {
  flat: Flat | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useLang();
  const [form, setForm] = useState<Flat | null>(null);
  const [saving, setSaving] = useState(false);
  const [creatingLogin, setCreatingLogin] = useState(false);
  const { enabled: signupEnabled } = useSignupEnabled();

  useEffect(() => {
    setForm(flat);
  }, [flat]);

  const createLogin = async () => {
    if (!form) return;
    if (!signupEnabled) {
      toast.error(lang === "bn" ? "সাইন আপ বর্তমানে বন্ধ আছে" : "Sign up is currently disabled");
      return;
    }
    const phone = (form.phone ?? "").trim();
    if (!/^\d{11}$/.test(phone)) {
      toast.error(
        lang === "bn"
          ? "১১ সংখ্যার বৈধ মোবাইল নম্বর দিন (যেমন 01613458260)"
          : "Enter a valid 11-digit phone number (e.g. 01613458260)",
      );
      return;
    }
    setCreatingLogin(true);
    const { data, error } = await supabase.functions.invoke("owner-create-account", {
      body: { phone, flat_id: form.id },
    });
    setCreatingLogin(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    const linkedCount = (data as any)?.linked_flat_count ?? 1;
    const extraNote = linkedCount > 1
      ? (lang === "bn"
          ? ` (একই নম্বরের ${linkedCount}টি ফ্ল্যাট auto-link হয়েছে)`
          : ` (auto-linked ${linkedCount} flats with same phone)`)
      : "";
    toast.success(
      lang === "bn"
        ? `লগইন তৈরি হয়েছে। ইউজারনেম: ${phone}, পাসওয়ার্ড: 12345678${extraNote}`
        : `Login created. Username: ${phone}, Password: 12345678${extraNote}`,
    );
    onSaved();
  };

  if (!form) return null;

  const set = <K extends keyof Flat>(k: K, v: Flat[K]) =>
    setForm((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("flats")
      .update({
        owner_name: form.owner_name,
        owner_name_bn: form.owner_name_bn,
        phone: form.phone,
        size: form.size,
        service_charge: form.service_charge,
        gas_bill: form.gas_bill,
        parking: form.parking,
        eid_bonus: form.eid_bonus,
        is_occupied: form.is_occupied,
        occupant_type: form.occupant_type,
        occupant_name: form.occupant_name,
        occupant_name_bn: form.occupant_name_bn,
        occupant_phone: form.occupant_phone,
        occupant_photo_url: form.occupant_photo_url,
        owner_photo_url: form.owner_photo_url,
      })
      .eq("id", form.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    onSaved();
  };

  return (
    <Dialog open={!!flat} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("flatNo")} {form.flat_no}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Owner section */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="text-sm font-semibold">{t("ownerLabel")}</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Name (EN)</Label>
                <Input
                  value={form.owner_name ?? ""}
                  onChange={(e) => set("owner_name", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">নাম (BN)</Label>
                <Input
                  value={form.owner_name_bn ?? ""}
                  onChange={(e) => set("owner_name_bn", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("phone")}</Label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="01613458260"
                  maxLength={11}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {lang === "bn"
                    ? "১১ সংখ্যার মোবাইল নম্বর — এটিই ওনারের ইউজারনেম হবে"
                    : "11-digit phone — this will be the owner's username"}
                </p>
              </div>
            </div>
            <PhotoUpload
              label={t("ownerPhoto")}
              value={form.owner_photo_url}
              onChange={(url) => set("owner_photo_url", url)}
              folder="flats"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={createLogin}
              disabled={creatingLogin || !signupEnabled}
              className="w-full"
            >
              {creatingLogin ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              {!signupEnabled
                ? (lang === "bn" ? "সাইন আপ বন্ধ আছে" : "Sign up is disabled")
                : (lang === "bn"
                    ? "ওনার লগইন তৈরি করুন (পাসওয়ার্ড: 12345678)"
                    : "Create owner login (password: 12345678)")}
            </Button>
          </div>

          {/* Occupant section */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{t("occupantType")}</div>
              <Select
                value={form.occupant_type}
                onValueChange={(v) => set("occupant_type", v as "owner" | "tenant")}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t("ownerLabel")}</SelectItem>
                  <SelectItem value="tenant">{t("tenantLabel")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.occupant_type === "tenant" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Name (EN)</Label>
                    <Input
                      value={form.occupant_name ?? ""}
                      onChange={(e) => set("occupant_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">নাম (BN)</Label>
                    <Input
                      value={form.occupant_name_bn ?? ""}
                      onChange={(e) => set("occupant_name_bn", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">{t("phone")}</Label>
                    <Input
                      value={form.occupant_phone ?? ""}
                      onChange={(e) => set("occupant_phone", e.target.value)}
                    />
                  </div>
                </div>
                <PhotoUpload
                  label={t("occupantPhoto")}
                  value={form.occupant_photo_url}
                  onChange={(url) => set("occupant_photo_url", url)}
                  folder="flats"
                />
              </>
            )}
          </div>

          {/* Charges */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Size (sqft)</Label>
              <Input
                type="number"
                value={form.size}
                onChange={(e) => set("size", Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">{t("serviceCharge")}</Label>
              <Input
                type="number"
                value={form.service_charge}
                onChange={(e) => set("service_charge", Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">{t("gasBill")}</Label>
              <Input
                type="number"
                value={form.gas_bill}
                onChange={(e) => set("gas_bill", Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">{t("parking")}</Label>
              <Input
                type="number"
                value={form.parking}
                onChange={(e) => set("parking", Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">{t("eidBonus")}</Label>
              <Input
                type="number"
                value={form.eid_bonus}
                onChange={(e) => set("eid_bonus", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="occ"
              type="checkbox"
              checked={form.is_occupied}
              onChange={(e) => set("is_occupied", e.target.checked)}
            />
            <Label htmlFor="occ" className="text-sm">
              {t("occupied")}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type LedgerBill = {
  id: string;
  month: string;
  service_charge: number;
  gas_bill: number;
  parking: number;
  eid_bonus: number;
  other_charge: number;
  other_note: string | null;
  total: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
};

function FlatLedgerDialog({ flat, onClose }: { flat: Flat | null; onClose: () => void }) {
  const { lang } = useLang();
  const [bills, setBills] = useState<LedgerBill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!flat) { setBills([]); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bills")
        .select("id, month, service_charge, gas_bill, parking, eid_bonus, other_charge, other_note, total, paid_amount, status, due_date, paid_at")
        .eq("flat_id", flat.id)
        .order("month", { ascending: false });
      if (error) toast.error(error.message);
      setBills((data ?? []) as LedgerBill[]);
      setLoading(false);
    })();
  }, [flat]);

  if (!flat) return null;

  const totalBilled = bills.reduce((s, b) => s + Number(b.total || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + Number(b.paid_amount || 0), 0);
  const balance = totalBilled - totalPaid;

  const occName = lang === "bn" ? flat.occupant_name_bn : flat.occupant_name;
  const ownName = lang === "bn" ? flat.owner_name_bn : flat.owner_name;
  const generatedAt = new Date().toLocaleString();

  return (
    <Dialog open={!!flat} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print-hide">
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>
              {lang === "bn" ? "ফ্ল্যাট লেজার" : "Flat Ledger"} — {flat.flat_no}
            </span>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              {lang === "bn" ? "প্রিন্ট / PDF" : "Print / PDF"}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="print-area space-y-4">
          {/* Header */}
          <div className="border-b border-border pb-3">
            <div className="text-lg font-bold">
              {lang === "bn" ? "শেখ বাচ্চু টাওয়ার" : "Sheikh Bachchu Tower"}
            </div>
            <div className="text-sm text-muted-foreground">
              {lang === "bn" ? "ফ্ল্যাট লেজার" : "Flat Ledger Statement"}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div>
                <span className="text-muted-foreground">{lang === "bn" ? "ফ্ল্যাট: " : "Flat: "}</span>
                <span className="font-semibold">{flat.flat_no} ({lang === "bn" ? "ফ্লোর" : "Floor"} {flat.floor})</span>
              </div>
              <div>
                <span className="text-muted-foreground">{lang === "bn" ? "সাইজ: " : "Size: "}</span>
                <span className="font-semibold">{formatNumber(flat.size, lang)} sqft</span>
              </div>
              <div>
                <span className="text-muted-foreground">{lang === "bn" ? "ওনার: " : "Owner: "}</span>
                <span className="font-semibold">{ownName || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{lang === "bn" ? "অকুপ্যান্ট: " : "Occupant: "}</span>
                <span className="font-semibold">{occName || ownName || "—"}</span>
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">
                {lang === "bn" ? "জেনারেট: " : "Generated: "} {generatedAt}
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "মোট বিল" : "Total Billed"}</div>
              <div className="text-lg font-bold">{formatMoney(totalBilled, lang)}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "মোট পেইড" : "Total Paid"}</div>
              <div className="text-lg font-bold text-success">{formatMoney(totalPaid, lang)}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "ব্যালেন্স" : "Balance Due"}</div>
              <div className={"text-lg font-bold " + (balance > 0 ? "text-destructive" : "text-success")}>
                {formatMoney(balance, lang)}
              </div>
            </div>
          </div>

          {/* Detail table */}
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : bills.length === 0 ? (
            <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
              {lang === "bn" ? "কোনো বিল নেই।" : "No bills found."}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">{lang === "bn" ? "মাস" : "Month"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "সার্ভিস" : "Service"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "গ্যাস" : "Gas"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "পার্কিং" : "Parking"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "ঈদ" : "Eid"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "অন্যান্য" : "Other"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "মোট" : "Total"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "পেইড" : "Paid"}</th>
                    <th className="text-right p-2 font-medium">{lang === "bn" ? "বকেয়া" : "Due"}</th>
                    <th className="text-left p-2 font-medium">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => {
                    const due = Number(b.total) - Number(b.paid_amount);
                    return (
                      <tr key={b.id} className="border-t border-border">
                        <td className="p-2 font-medium">{b.month}</td>
                        <td className="p-2 text-right">{formatMoney(b.service_charge, lang)}</td>
                        <td className="p-2 text-right">{formatMoney(b.gas_bill, lang)}</td>
                        <td className="p-2 text-right">{formatMoney(b.parking, lang)}</td>
                        <td className="p-2 text-right">{Number(b.eid_bonus) > 0 ? formatMoney(b.eid_bonus, lang) : "—"}</td>
                        <td className="p-2 text-right">{Number(b.other_charge) > 0 ? formatMoney(b.other_charge, lang) : "—"}</td>
                        <td className="p-2 text-right font-semibold">{formatMoney(b.total, lang)}</td>
                        <td className="p-2 text-right text-success">{formatMoney(b.paid_amount, lang)}</td>
                        <td className={"p-2 text-right font-semibold " + (due > 0 ? "text-destructive" : "")}>
                          {formatMoney(due, lang)}
                        </td>
                        <td className="p-2">
                          <span className={
                            "inline-block px-2 py-0.5 rounded text-[10px] font-bold " +
                            (b.status === "paid"
                              ? "bg-success/15 text-success"
                              : b.status === "partial"
                              ? "bg-warning/15 text-warning"
                              : "bg-destructive/15 text-destructive")
                          }>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 font-semibold">
                  <tr>
                    <td className="p-2">{lang === "bn" ? "মোট" : "Total"}</td>
                    <td colSpan={5}></td>
                    <td className="p-2 text-right">{formatMoney(totalBilled, lang)}</td>
                    <td className="p-2 text-right text-success">{formatMoney(totalPaid, lang)}</td>
                    <td className={"p-2 text-right " + (balance > 0 ? "text-destructive" : "")}>
                      {formatMoney(balance, lang)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
