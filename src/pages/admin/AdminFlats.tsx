import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney, formatNumber } from "@/i18n/translations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Phone, Home, Pencil } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhotoUpload } from "@/components/PhotoUpload";

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
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Flat | null>(null);

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
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "bn" ? "খুঁজুন..." : "Search..."}
              className="pl-9"
            />
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
                          <AvatarFallback className="text-[10px]">
                            {(occName ?? ownName ?? "?").slice(0, 2)}
                          </AvatarFallback>
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(f)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
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
    </AppShell>
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
  const { t } = useLang();
  const [form, setForm] = useState<Flat | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(flat);
  }, [flat]);

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
                />
              </div>
            </div>
            <PhotoUpload
              label={t("ownerPhoto")}
              value={form.owner_photo_url}
              onChange={(url) => set("owner_photo_url", url)}
              folder="flats"
            />
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
