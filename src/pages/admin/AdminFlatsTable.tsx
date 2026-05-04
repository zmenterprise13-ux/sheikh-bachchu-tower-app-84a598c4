import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Save, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { InitialsFallback } from "@/components/InitialsFallback";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Flat = {
  id: string;
  flat_no: string;
  floor: number;
  owner_name: string | null;
  owner_name_bn: string | null;
  phone: string | null;
  occupant_type: "owner" | "tenant" | string;
  occupant_name: string | null;
  occupant_name_bn: string | null;
  occupant_phone: string | null;
  service_charge: number;
  gas_bill: number;
  eid_bonus: number;
  other_charge: number;
  owner_photo_url: string | null;
  occupant_photo_url: string | null;
};

const COLS =
  "id, flat_no, floor, owner_name, owner_name_bn, phone, occupant_type, occupant_name, occupant_name_bn, occupant_phone, service_charge, gas_bill, eid_bonus, other_charge, owner_photo_url, occupant_photo_url";

const EDITABLE_KEYS: (keyof Flat)[] = [
  "owner_name",
  "owner_name_bn",
  "phone",
  "occupant_name",
  "occupant_name_bn",
  "occupant_phone",
  "service_charge",
  "gas_bill",
  "eid_bonus",
  "other_charge",
  "owner_photo_url",
  "occupant_photo_url",
];

export default function AdminFlatsTable() {
  const { lang } = useLang();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Flat[]>([]);
  const [original, setOriginal] = useState<Record<string, Flat>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("flats").select(COLS).order("floor").order("flat_no");
    if (error) toast.error(error.message);
    const list = (data ?? []) as Flat[];
    setRows(list);
    setOriginal(Object.fromEntries(list.map((f) => [f.id, f])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const dirty = useMemo(() => {
    return rows.filter((f) => {
      const o = original[f.id];
      if (!o) return false;
      return EDITABLE_KEYS.some((k) => (f as any)[k] !== (o as any)[k]);
    });
  }, [rows, original]);

  const updateRow = (id: string, patch: Partial<Flat>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleUpload = async (id: string, field: "owner_photo_url" | "occupant_photo_url", file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setUploadingId(id + field);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `flats/${id}/${field}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("occupant-photos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("occupant-photos").getPublicUrl(path);
      updateRow(id, { [field]: data.publicUrl } as any);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const saveAll = async () => {
    if (dirty.length === 0) {
      toast.info(lang === "bn" ? "কোনো পরিবর্তন নেই" : "No changes");
      return;
    }
    setSaving(true);
    try {
      for (const f of dirty) {
        const patch: Record<string, any> = {};
        for (const k of EDITABLE_KEYS) {
          patch[k as string] = (f as any)[k];
        }
        const { error } = await supabase.from("flats").update(patch as any).eq("id", f.id);
        if (error) throw error;
      }
      toast.success(
        lang === "bn" ? `${dirty.length} টি ফ্ল্যাট সংরক্ষণ হয়েছে` : `Saved ${dirty.length} flats`
      );
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = rows.filter((f) => {
    const s = q.toLowerCase();
    return (
      !s ||
      f.flat_no.toLowerCase().includes(s) ||
      (f.owner_name ?? "").toLowerCase().includes(s) ||
      (f.occupant_name ?? "").toLowerCase().includes(s) ||
      (f.phone ?? "").includes(q) ||
      (f.occupant_phone ?? "").includes(q)
    );
  });

  const renderPhoto = (row: Flat, field: "owner_photo_url" | "occupant_photo_url") => {
    const url = row[field];
    const busy = uploadingId === row.id + field;
    const inputId = `${row.id}-${field}`;
    return (
      <div className="flex items-center gap-1">
        <Avatar className="h-9 w-9">
          {url ? <AvatarImage src={url} /> : null}
          <InitialsFallback name={row.flat_no} seed={row.id ?? row.flat_no} className="text-[10px]" />
        </Avatar>
        <label htmlFor={inputId}>
          <Button asChild size="icon" variant="ghost" className="h-7 w-7" disabled={busy}>
            <span>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            </span>
          </Button>
        </label>
        {url && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => updateRow(row.id, { [field]: null } as any)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(row.id, field, f);
            e.target.value = "";
          }}
        />
      </div>
    );
  };

  const renderNum = (row: Flat, field: keyof Flat) => (
    <Input
      type="number"
      value={(row[field] as number) ?? 0}
      onChange={(e) => updateRow(row.id, { [field]: Number(e.target.value) || 0 } as any)}
      className="h-8 w-24 text-xs"
    />
  );

  const renderText = (row: Flat, field: keyof Flat, w = "w-32") => (
    <Input
      value={(row[field] as string) ?? ""}
      onChange={(e) => updateRow(row.id, { [field]: e.target.value } as any)}
      className={`h-8 ${w} text-xs`}
    />
  );

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {lang === "bn" ? "ফ্ল্যাট – একসাথে এডিট" : "Flats – Bulk Edit"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "bn"
                ? "টেবিল থেকে সরাসরি সব ফ্ল্যাটের তথ্য পরিবর্তন করুন।"
                : "Edit all flats inline and save together."}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={lang === "bn" ? "খুঁজুন..." : "Search..."}
                className="pl-9"
              />
            </div>
            <Button onClick={saveAll} disabled={saving || dirty.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {lang === "bn" ? `সংরক্ষণ (${dirty.length})` : `Save (${dirty.length})`}
            </Button>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ফ্ল্যাট" : "Flat"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ছবি (ওনার)" : "Owner Photo"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ওনার নাম (EN)" : "Owner Name (EN)"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ওনার নাম (BN)" : "Owner Name (BN)"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ওনার মোবাইল" : "Owner Mobile"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ছবি (ভাড়াটিয়া)" : "Tenant Photo"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ভাড়াটিয়া নাম (EN)" : "Tenant Name (EN)"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ভাড়াটিয়া নাম (BN)" : "Tenant Name (BN)"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ভাড়াটিয়া মোবাইল" : "Tenant Mobile"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "সার্ভিস চার্জ" : "Service"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "গ্যাস" : "Gas"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "ঈদ বোনাস" : "Eid Bonus"}</TableHead>
                  <TableHead className="whitespace-nowrap">{lang === "bn" ? "অতিরিক্ত" : "Other"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const isDirty = dirty.find((d) => d.id === row.id);
                  return (
                    <TableRow key={row.id} className={isDirty ? "bg-primary/5" : ""}>
                      <TableCell className="font-semibold">{row.flat_no}</TableCell>
                      <TableCell>{renderPhoto(row, "owner_photo_url")}</TableCell>
                      <TableCell>{renderText(row, "owner_name", "w-40")}</TableCell>
                      <TableCell>{renderText(row, "owner_name_bn", "w-40")}</TableCell>
                      <TableCell>{renderText(row, "phone", "w-32")}</TableCell>
                      <TableCell>{renderPhoto(row, "occupant_photo_url")}</TableCell>
                      <TableCell>{renderText(row, "occupant_name", "w-40")}</TableCell>
                      <TableCell>{renderText(row, "occupant_name_bn", "w-40")}</TableCell>
                      <TableCell>{renderText(row, "occupant_phone", "w-32")}</TableCell>
                      <TableCell>{renderNum(row, "service_charge")}</TableCell>
                      <TableCell>{renderNum(row, "gas_bill")}</TableCell>
                      <TableCell>{renderNum(row, "eid_bonus")}</TableCell>
                      <TableCell>{renderNum(row, "other_charge")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
