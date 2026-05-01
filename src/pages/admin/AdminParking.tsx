import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Car, Pencil } from "lucide-react";
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

type Slot = {
  id: string;
  slot_no: string;
  flat_id: string | null;
  shop_id: string | null;
  monthly_fee: number;
  notes: string | null;
};

type FlatOpt = { id: string; flat_no: string };
type ShopOpt = { id: string; shop_no: string };

const NONE = "__none__";

export default function AdminParking() {
  const { t, lang } = useLang();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [flats, setFlats] = useState<FlatOpt[]>([]);
  const [shops, setShops] = useState<ShopOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Slot | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, f, sh] = await Promise.all([
      supabase.from("parking_slots").select("*").order("slot_no"),
      supabase.from("flats").select("id, flat_no").order("floor").order("flat_no"),
      supabase.from("shops").select("id, shop_no").order("shop_no"),
    ]);
    if (s.error) toast.error(s.error.message);
    // sort slots numerically (P1, P2 ... P10)
    const sorted = ((s.data ?? []) as Slot[]).sort((a, b) => {
      const na = parseInt(a.slot_no.replace(/\D/g, ""), 10) || 0;
      const nb = parseInt(b.slot_no.replace(/\D/g, ""), 10) || 0;
      return na - nb;
    });
    setSlots(sorted);
    setFlats((f.data ?? []) as FlatOpt[]);
    setShops((sh.data ?? []) as ShopOpt[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const labelFor = (slot: Slot) => {
    if (slot.flat_id) {
      const f = flats.find((x) => x.id === slot.flat_id);
      return f ? `${t("flatNo")} ${f.flat_no}` : "—";
    }
    if (slot.shop_id) {
      const sh = shops.find((x) => x.id === slot.shop_id);
      return sh ? `${t("shopNo")} ${sh.shop_no}` : "—";
    }
    return null;
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("parkingNav")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {slots.length} {lang === "bn" ? "টি স্লট" : "slots"}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((s) => {
              const assigned = labelFor(s);
              return (
                <div
                  key={s.id}
                  className="rounded-2xl bg-card border border-border p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
                      <Car className="h-4 w-4" />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditing(s)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-2 font-bold text-foreground">{s.slot_no}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {assigned || (
                      <span className="text-warning">{t("unassigned")}</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-foreground">
                    {formatMoney(Number(s.monthly_fee), lang)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SlotEditDialog
        slot={editing}
        flats={flats}
        shops={shops}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </AppShell>
  );
}

function SlotEditDialog({
  slot,
  flats,
  shops,
  onClose,
  onSaved,
}: {
  slot: Slot | null;
  flats: FlatOpt[];
  shops: ShopOpt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<Slot | null>(null);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<"none" | "flat" | "shop">("none");

  useEffect(() => {
    setForm(slot);
    if (slot?.flat_id) setTarget("flat");
    else if (slot?.shop_id) setTarget("shop");
    else setTarget("none");
  }, [slot]);

  if (!form) return null;
  const set = <K extends keyof Slot>(k: K, v: Slot[K]) =>
    setForm((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    setSaving(true);
    const payload = {
      monthly_fee: form.monthly_fee,
      notes: form.notes,
      flat_id: target === "flat" ? form.flat_id : null,
      shop_id: target === "shop" ? form.shop_id : null,
    };
    const { error } = await supabase.from("parking_slots").update(payload).eq("id", form.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    onSaved();
  };

  return (
    <Dialog open={!!slot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("slotNo")} {form.slot_no}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">{t("assignedTo")}</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("unassigned")}</SelectItem>
                <SelectItem value="flat">{t("flats")}</SelectItem>
                <SelectItem value="shop">{t("shops")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {target === "flat" && (
            <div>
              <Label className="text-xs">{t("flatNo")}</Label>
              <Select
                value={form.flat_id ?? NONE}
                onValueChange={(v) => set("flat_id", v === NONE ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NONE}>—</SelectItem>
                  {flats.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.flat_no}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {target === "shop" && (
            <div>
              <Label className="text-xs">{t("shopNo")}</Label>
              <Select
                value={form.shop_id ?? NONE}
                onValueChange={(v) => set("shop_id", v === NONE ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.shop_no}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">{t("monthlyFee")}</Label>
            <Input
              type="number"
              value={form.monthly_fee}
              onChange={(e) => set("monthly_fee", Number(e.target.value))}
            />
          </div>

          <div>
            <Label className="text-xs">{t("description")}</Label>
            <Input
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("cancel")}</Button>
          <Button onClick={save} disabled={saving}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
