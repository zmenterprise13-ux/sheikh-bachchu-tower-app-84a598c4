import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil, Phone, Store } from "lucide-react";
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

type Shop = {
  id: string;
  shop_no: string;
  side: string | null;
  size: number;
  service_charge: number;
  rent: number;
  is_occupied: boolean;
  occupant_type: "owner" | "tenant";
  owner_name: string | null;
  owner_name_bn: string | null;
  owner_phone: string | null;
  owner_photo_url: string | null;
  occupant_name: string | null;
  occupant_name_bn: string | null;
  occupant_phone: string | null;
  occupant_photo_url: string | null;
};

export default function AdminShops() {
  const { t, lang } = useLang();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Shop | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .order("shop_no");
    if (error) toast.error(error.message);
    setShops((data ?? []) as Shop[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("shops")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {shops.length} {lang === "bn" ? "টি দোকান" : "shops"}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {shops.map((s) => {
              const occ = lang === "bn" ? s.occupant_name_bn : s.occupant_name;
              const own = lang === "bn" ? s.owner_name_bn : s.owner_name;
              return (
                <div
                  key={s.id}
                  className="rounded-2xl bg-card border border-border p-5 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground font-bold shrink-0">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground">{s.shop_no}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.side === "east" ? t("east") : s.side === "west" ? t("west") : "—"}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(s)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {s.occupant_photo_url ? (
                        <AvatarImage src={s.occupant_photo_url} />
                      ) : null}
                      <InitialsFallback name={occ ?? own ?? "?"} seed={s.id} className="text-[10px]" />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{occ || own || "—"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {s.occupant_phone || s.owner_phone || "—"}
                      </div>
                    </div>
                    <span
                      className={
                        "text-[10px] font-bold rounded-full px-2 py-0.5 " +
                        (s.occupant_type === "owner"
                          ? "bg-primary/15 text-primary"
                          : "bg-warning/15 text-warning")
                      }
                    >
                      {s.occupant_type === "owner" ? t("ownerLabel") : t("tenantLabel")}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-secondary/50 p-2">
                      <div className="text-muted-foreground">Size</div>
                      <div className="font-semibold">{s.size} sqft</div>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2">
                      <div className="text-muted-foreground">{t("serviceCharge")}</div>
                      <div className="font-semibold">{formatMoney(Number(s.service_charge), lang)}</div>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2">
                      <div className="text-muted-foreground">{t("rent")}</div>
                      <div className="font-semibold">{formatMoney(Number(s.rent), lang)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ShopEditDialog
        shop={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </AppShell>
  );
}

function ShopEditDialog({
  shop,
  onClose,
  onSaved,
}: {
  shop: Shop | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<Shop | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(shop), [shop]);
  if (!form) return null;

  const set = <K extends keyof Shop>(k: K, v: Shop[K]) =>
    setForm((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    setSaving(true);
    const { id, ...rest } = form;
    const { error } = await supabase.from("shops").update(rest).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    onSaved();
  };

  return (
    <Dialog open={!!shop} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("shopNo")} {form.shop_no}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="text-sm font-semibold">{t("ownerLabel")}</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Name (EN)</Label>
                <Input value={form.owner_name ?? ""} onChange={(e) => set("owner_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">নাম (BN)</Label>
                <Input value={form.owner_name_bn ?? ""} onChange={(e) => set("owner_name_bn", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("phone")}</Label>
                <Input value={form.owner_phone ?? ""} onChange={(e) => set("owner_phone", e.target.value)} />
              </div>
            </div>
            <PhotoUpload
              label={t("ownerPhoto")}
              value={form.owner_photo_url}
              onChange={(url) => set("owner_photo_url", url)}
              folder="shops"
            />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{t("occupantType")}</div>
              <Select value={form.occupant_type} onValueChange={(v) => set("occupant_type", v as "owner" | "tenant")}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
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
                    <Input value={form.occupant_name ?? ""} onChange={(e) => set("occupant_name", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">নাম (BN)</Label>
                    <Input value={form.occupant_name_bn ?? ""} onChange={(e) => set("occupant_name_bn", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">{t("phone")}</Label>
                    <Input value={form.occupant_phone ?? ""} onChange={(e) => set("occupant_phone", e.target.value)} />
                  </div>
                </div>
                <PhotoUpload
                  label={t("occupantPhoto")}
                  value={form.occupant_photo_url}
                  onChange={(url) => set("occupant_photo_url", url)}
                  folder="shops"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("side")}</Label>
              <Select value={form.side ?? ""} onValueChange={(v) => set("side", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="east">{t("east")}</SelectItem>
                  <SelectItem value="west">{t("west")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Size (sqft)</Label>
              <Input type="number" value={form.size} onChange={(e) => set("size", Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">{t("serviceCharge")}</Label>
              <Input type="number" value={form.service_charge} onChange={(e) => set("service_charge", Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">{t("rent")}</Label>
              <Input type="number" value={form.rent} onChange={(e) => set("rent", Number(e.target.value))} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id="shop-occ" type="checkbox" checked={form.is_occupied} onChange={(e) => set("is_occupied", e.target.checked)} />
            <Label htmlFor="shop-occ" className="text-sm">{t("occupied")}</Label>
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
