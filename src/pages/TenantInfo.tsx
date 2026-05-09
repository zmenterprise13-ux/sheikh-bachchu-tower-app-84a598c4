import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { InitialsFallback } from "@/components/InitialsFallback";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Upload, Loader2, Save, Printer, Download, Users, UserMinus, History, CalendarDays, LogIn, LogOut, Clock, Eye } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompress";
import { PermanentAddressFields, parsePermanentAddress, serializePermanentAddress, validatePermanentAddress } from "@/components/PermanentAddressFields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type TenancyPeriod = {
  id: string;
  tenant_name: string;
  tenant_name_bn: string | null;
  phone: string | null;
  nid_number: string | null;
  occupation: string | null;
  photo_url: string | null;
  family_count: number;
  move_in_date: string | null;
  move_out_date: string | null;
  move_out_month: string | null;
  leave_reason: string | null;
  notes: string | null;
};

type Flat = {
  id: string;
  flat_no: string;
  floor: number;
  owner_name: string | null;
  owner_user_id: string | null;
};

type FamilyMember = {
  id?: string;
  name: string;
  relation: string;
  age: number | null;
  occupation: string;
  phone: string;
};

type TenantInfo = {
  id?: string;
  flat_id: string;
  // Address details (top of police form)
  beat_no: string;
  ward_no: string;
  holding_no: string;
  road: string;
  area: string;
  post_code: string;
  // 1. Tenant name
  tenant_name: string;
  tenant_name_bn: string;
  // 2. Father's name
  father_name: string;
  // 3. Birth + marital
  birth_date: string;
  marital_status: string;
  // 4. Permanent address
  permanent_address: string;
  // 5. Occupation + workplace
  occupation: string;
  workplace: string;
  // 6. Religion + education
  religion: string;
  education: string;
  // 7. Mobile + email
  phone: string;
  email: string;
  // 8. NID
  nid_number: string;
  // 9. Passport
  passport_number: string;
  // 10. Emergency
  emergency_name: string;
  emergency_relation: string;
  emergency_address: string;
  emergency_phone: string;
  // 12. Helper
  helper_name: string;
  helper_nid: string;
  helper_phone: string;
  helper_address: string;
  // 13. Driver
  driver_name: string;
  driver_nid: string;
  // 14. Previous landlord
  previous_landlord_name: string;
  previous_landlord_phone: string;
  // 15. Reason for leaving
  leave_reason: string;
  // 16. Current landlord
  current_landlord_name: string;
  // 17. Move-in date
  move_in_date: string;
  // Misc
  photo_url: string | null;
  total_members: number;
  notes: string;
  // legacy
  mother_name: string;
  spouse_name: string;
  present_address: string;
};

const emptyTenant = (flat_id: string): TenantInfo => ({
  flat_id,
  beat_no: "", ward_no: "", holding_no: "", road: "", area: "", post_code: "",
  tenant_name: "", tenant_name_bn: "",
  father_name: "",
  birth_date: "", marital_status: "",
  permanent_address: "",
  occupation: "", workplace: "",
  religion: "", education: "",
  phone: "", email: "",
  nid_number: "", passport_number: "",
  emergency_name: "", emergency_relation: "", emergency_address: "", emergency_phone: "",
  helper_name: "", helper_nid: "", helper_phone: "", helper_address: "",
  driver_name: "", driver_nid: "",
  previous_landlord_name: "", previous_landlord_phone: "",
  leave_reason: "",
  current_landlord_name: "",
  move_in_date: "",
  photo_url: null,
  total_members: 0,
  notes: "",
  mother_name: "", spouse_name: "", present_address: "",
});

const emptyMember = (): FamilyMember => ({
  name: "", relation: "", age: null, occupation: "", phone: "",
});

const RELATION_OPTIONS = ["স্বামী", "স্ত্রী", "পিতা", "মাতা", "ছেলে", "মেয়ে", "ভাই", "বোন", "দাদা", "দাদী", "নানা", "নানী", "চাচা", "চাচী", "মামা", "মামী"];

function RelationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = !value || RELATION_OPTIONS.includes(value);
  const [custom, setCustom] = useState(!isPreset);
  const selectValue = custom ? "__other__" : (value || "");
  return (
    <div className="flex gap-1">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === "__other__") { setCustom(true); onChange(""); }
          else { setCustom(false); onChange(v); }
        }}
      >
        <SelectTrigger className="border-0 h-8 w-[120px]"><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
        <SelectContent>
          {RELATION_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          <SelectItem value="__other__">অন্যান্য…</SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="সম্পর্ক লিখুন"
          className="border-0 h-8 flex-1 min-w-0"
        />
      )}
    </div>
  );
}

type Kind = "tenant" | "owner";
type Config = {
  infoTable: "tenant_info" | "owner_info";
  familyTable: "tenant_family_members" | "owner_family_members";
  familyFk: "tenant_info_id" | "owner_info_id";
  photoFolder: string;
  archiveEnabled: boolean;
  title: string;
  subtitle: string;
  personLabel: string;
  viewPath: string;
  editPath: string;
};
const CONFIGS: Record<Kind, Config> = {
  tenant: {
    infoTable: "tenant_info", familyTable: "tenant_family_members", familyFk: "tenant_info_id",
    photoFolder: "tenants", archiveEnabled: true,
    title: "ভাড়াটিয়া নিবন্ধন ফরম",
    subtitle: "পুলিশ নিবন্ধন ফরমের আদলে ভাড়াটিয়ার তথ্য সংরক্ষণ করুন",
    personLabel: "ভাড়াটিয়া",
    viewPath: "/tenant-info/view", editPath: "/tenant-info",
  },
  owner: {
    infoTable: "owner_info", familyTable: "owner_family_members", familyFk: "owner_info_id",
    photoFolder: "owners", archiveEnabled: false,
    title: "ফ্ল্যাট মালিকের বিস্তারিত তথ্য",
    subtitle: "ভাড়াটিয়ার ফরমের আদলে মালিকের পূর্ণাঙ্গ তথ্য সংরক্ষণ করুন",
    personLabel: "মালিক",
    viewPath: "/owner-info/view", editPath: "/owner-info",
  },
};

export default function TenantInfoPage({ kind = "tenant" }: { kind?: Kind } = {}) {
  const cfg = CONFIGS[kind];
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [flats, setFlats] = useState<Flat[]>([]);
  const [searchParams] = useSearchParams();
  const [selectedFlatId, setSelectedFlatId] = useState<string>(searchParams.get("flat") || "");
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [history, setHistory] = useState<TenancyPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("flats").select("id, flat_no, floor, owner_name, owner_user_id").order("floor").order("flat_no");
      if (error) { toast.error(error.message); return; }
      const list = (data || []) as Flat[];
      const visible = isAdmin ? list : list.filter((f) => f.owner_user_id === user?.id);
      setFlats(visible);
      if (visible.length && !selectedFlatId) setSelectedFlatId(visible[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (!selectedFlatId) return;
    setLoading(true);
    (async () => {
      const sb: any = supabase;
      const { data: ti, error } = await sb.from(cfg.infoTable).select("*").eq("flat_id", selectedFlatId).maybeSingle();
      if (error && error.code !== "PGRST116") toast.error(error.message);
      if (ti) {
        setTenant({ ...emptyTenant(selectedFlatId), ...(ti as any), photo_url: (ti as any).photo_url ?? null });
        const { data: fm } = await sb.from(cfg.familyTable).select("*").eq(cfg.familyFk, (ti as any).id).order("sort_order").order("created_at");
        setMembers(((fm || []) as any[]).map((m) => ({
          id: m.id, name: m.name ?? "", relation: m.relation ?? "", age: m.age, occupation: m.occupation ?? "", phone: m.phone ?? "",
        })));
      } else {
        setTenant(emptyTenant(selectedFlatId));
        setMembers([]);
      }
      if (cfg.archiveEnabled) {
        const { data: hist } = await supabase
          .from("tenancy_periods")
          .select("id, tenant_name, tenant_name_bn, phone, nid_number, occupation, photo_url, family_count, move_in_date, move_out_date, move_out_month, leave_reason, notes")
          .eq("flat_id", selectedFlatId)
          .order("move_out_date", { ascending: false, nullsFirst: false })
          .order("archived_at", { ascending: false });
        setHistory((hist || []) as TenancyPeriod[]);
      } else {
        setHistory([]);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFlatId, kind]);

  const updateTenant = (patch: Partial<TenantInfo>) => setTenant((t) => (t ? { ...t, ...patch } : t));
  const addMember = () => setMembers((m) => [...m, emptyMember()]);
  const removeMember = (idx: number) => setMembers((m) => m.filter((_, i) => i !== idx));
  const updateMember = (idx: number, patch: Partial<FamilyMember>) =>
    setMembers((m) => m.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("ফাইল খুব বড় (সর্বোচ্চ 5MB)");
    setPhotoUploading(true);
    try {
      const compressed = await compressImage(file, { maxDim: 800, quality: 0.8 });
      const ext = compressed.type === "image/jpeg" ? "jpg" : "png";
      const path = `${cfg.photoFolder}/${selectedFlatId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("tenant-photos").upload(path, compressed, { upsert: false, contentType: compressed.type });
      if (error) throw error;
      const { data } = supabase.storage.from("tenant-photos").getPublicUrl(path);
      updateTenant({ photo_url: data.publicUrl });
      toast.success("ছবি আপলোড হয়েছে");
    } catch (err: any) {
      toast.error(err.message ?? "আপলোড ব্যর্থ");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!tenant) return;
    if (!tenant.tenant_name.trim()) return toast.error(`${cfg.personLabel}ের নাম দিন`);
    const addrErr = validatePermanentAddress(parsePermanentAddress(tenant.permanent_address));
    if (addrErr) return toast.error(`স্থায়ী ঠিকানা: ${addrErr}`);
    setSaving(true);
    try {
      const sb: any = supabase;
      const payload: any = {
        ...tenant,
        move_in_date: tenant.move_in_date || null,
        birth_date: tenant.birth_date || null,
        total_members: members.length,
      };
      let tenantId = tenant.id;
      if (tenantId) {
        const { error } = await sb.from(cfg.infoTable).update(payload).eq("id", tenantId);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from(cfg.infoTable).insert(payload).select("id").single();
        if (error) throw error;
        tenantId = (data as any).id;
        setTenant((t) => (t ? { ...t, id: tenantId } : t));
      }
      await sb.from(cfg.familyTable).delete().eq(cfg.familyFk, tenantId!);
      if (members.length) {
        const rows = members.map((m, idx) => ({
          [cfg.familyFk]: tenantId,
          name: m.name,
          relation: m.relation || "",
          age: m.age,
          occupation: m.occupation || null,
          phone: m.phone || null,
          sort_order: idx,
        }));
        const { error } = await sb.from(cfg.familyTable).insert(rows);
        if (error) throw error;
      }
      toast.success("সংরক্ষণ হয়েছে");
    } catch (err: any) {
      toast.error(err.message ?? "সংরক্ষণ ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  const archiveTenant = async () => {
    if (!tenant?.id) return toast.error("সংরক্ষিত ভাড়াটিয়া নেই");
    setArchiving(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const monthStr = todayStr.slice(0, 7);
      const snapshot = { ...tenant, members };
      const { error: insErr } = await supabase.from("tenancy_periods").insert({
        flat_id: tenant.flat_id,
        tenant_name: tenant.tenant_name,
        tenant_name_bn: tenant.tenant_name_bn || null,
        phone: tenant.phone || null,
        nid_number: tenant.nid_number || null,
        occupation: tenant.occupation || null,
        photo_url: tenant.photo_url,
        family_count: members.length,
        move_in_date: tenant.move_in_date || null,
        move_out_date: todayStr,
        move_out_month: monthStr,
        leave_reason: tenant.leave_reason || null,
        notes: tenant.notes || null,
        snapshot,
        archived_by: user?.id ?? null,
      });
      if (insErr) throw insErr;
      await supabase.from("tenant_family_members").delete().eq("tenant_info_id", tenant.id);
      const { error: delErr } = await supabase.from("tenant_info").delete().eq("id", tenant.id);
      if (delErr) throw delErr;
      toast.success("ভাড়াটিয়া আর্কাইভ হয়েছে");
      setTenant(emptyTenant(selectedFlatId));
      setMembers([]);
      const { data: hist } = await supabase
        .from("tenancy_periods")
        .select("id, tenant_name, tenant_name_bn, phone, nid_number, occupation, photo_url, family_count, move_in_date, move_out_date, move_out_month, leave_reason, notes")
        .eq("flat_id", selectedFlatId)
        .order("move_out_date", { ascending: false, nullsFirst: false })
        .order("archived_at", { ascending: false });
      setHistory((hist || []) as TenancyPeriod[]);
    } catch (err: any) {
      toast.error(err.message ?? "আর্কাইভ ব্যর্থ");
    } finally {
      setArchiving(false);
    }
  };

  const selectedFlat = flats.find((f) => f.id === selectedFlatId);
  const handlePrintFilled = () => window.print();
  const handleDownloadBlankPdf = () => {
    const w = window.open("/tenant-info/blank-form", "_blank");
    if (!w) toast.error("পপ-আপ ব্লকড");
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" /> {cfg.title}
            </h1>
            <p className="text-sm text-muted-foreground">{cfg.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`${cfg.viewPath}${selectedFlatId ? `?flat=${selectedFlatId}` : ""}`}>
                <Eye className="h-4 w-4 mr-1" /> ভিউ
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadBlankPdf}>
              <Download className="h-4 w-4 mr-1" /> ফাঁকা ফরম
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintFilled}>
              <Printer className="h-4 w-4 mr-1" /> প্রিন্ট
            </Button>
            {cfg.archiveEnabled && tenant?.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={archiving}>
                    <UserMinus className="h-4 w-4 mr-1" /> চলে গেছেন (আর্কাইভ)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ভাড়াটিয়া আর্কাইভ করবেন?</AlertDialogTitle>
                    <AlertDialogDescription>
                      বর্তমান ভাড়াটিয়ার সব তথ্য "পূর্ববর্তী ভাড়াটিয়া" তালিকায় সংরক্ষণ হবে এবং ফর্ম খালি হয়ে যাবে। চলে যাওয়ার তারিখ আজকের তারিখ হিসেবে রেকর্ড হবে।
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>বাতিল</AlertDialogCancel>
                    <AlertDialogAction onClick={archiveTenant}>হ্যাঁ, আর্কাইভ করুন</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {tenant && (
              <Button onClick={save} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                সংরক্ষণ
              </Button>
            )}
          </div>
        </div>

        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ফ্ল্যাট নির্বাচন করুন</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedFlatId} onValueChange={setSelectedFlatId}>
              <SelectTrigger className="w-full sm:w-[320px]">
                <SelectValue placeholder="ফ্ল্যাট নির্বাচন" />
              </SelectTrigger>
              <SelectContent>
                {flats.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    ফ্ল্যাট {f.flat_no} {f.owner_name ? `— ${f.owner_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <Skeleton className="h-96" />
        ) : tenant ? (
          <div className="space-y-4 print-area">
            <div className="hidden print:block text-center mb-4">
              <h1 className="text-xl font-bold">ভাড়াটিয়া নিবন্ধন ফরম</h1>
              <p className="text-sm">ফ্ল্যাট {selectedFlat?.flat_no}</p>
            </div>

            {/* Basic flat info */}
            <Card>
              <CardHeader><CardTitle className="text-base">প্রাথমিক তথ্য</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="১. ফ্ল্যাট মালিক/ভাড়াটিয়ার নাম">
                    <Input value={tenant.tenant_name || selectedFlat?.owner_name || ""} onChange={(e) => updateTenant({ tenant_name: e.target.value })} />
                  </Field>
                  <Field label="২. ফ্ল্যাট নং"><Input value={selectedFlat?.flat_no ?? ""} disabled /></Field>
                  <Field label="৩. হোল্ডিং নং"><Input value={tenant.holding_no} onChange={(e) => updateTenant({ holding_no: e.target.value })} /></Field>
                </div>
              </CardContent>
            </Card>

            {/* Personal info */}
            <Card>
              <CardHeader><CardTitle className="text-base">ভাড়াটিয়া/বাড়িওয়ালার ব্যক্তিগত তথ্য</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-24 w-24 border-2 border-border">
                      {tenant.photo_url ? <AvatarImage src={tenant.photo_url} /> : null}
                      <InitialsFallback name={tenant.tenant_name || "?"} />
                    </Avatar>
                    <div className="print:hidden flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => photoInputRef.current?.click()} disabled={photoUploading}>
                        {photoUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        <span className="ml-1 text-xs">ছবি</span>
                      </Button>
                      {tenant.photo_url && (
                        <Button size="sm" variant="ghost" onClick={() => updateTenant({ photo_url: null })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
                    <Field label="১. নাম *"><Input value={tenant.tenant_name} onChange={(e) => updateTenant({ tenant_name: e.target.value })} /></Field>
                    <Field label="নাম (English)"><Input value={tenant.tenant_name_bn} onChange={(e) => updateTenant({ tenant_name_bn: e.target.value })} /></Field>
                    <Field label="২. পিতার নাম"><Input value={tenant.father_name} onChange={(e) => updateTenant({ father_name: e.target.value })} /></Field>
                    <Field label="৩. জন্ম তারিখ"><Input type="date" value={tenant.birth_date} onChange={(e) => updateTenant({ birth_date: e.target.value })} /></Field>
                    <Field label="বৈবাহিক অবস্থা">
                      <Select value={tenant.marital_status} onValueChange={(v) => updateTenant({ marital_status: v })}>
                        <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="বিবাহিত">বিবাহিত</SelectItem>
                          <SelectItem value="অবিবাহিত">অবিবাহিত</SelectItem>
                          <SelectItem value="বিধবা">বিধবা</SelectItem>
                          <SelectItem value="বিপত্নীক">বিপত্নীক</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="৪. স্থায়ী ঠিকানা" full>
                      <PermanentAddressFields
                        value={parsePermanentAddress(tenant.permanent_address)}
                        onChange={(addr) => updateTenant({ permanent_address: serializePermanentAddress(addr) })}
                      />
                    </Field>
                    <Field label="৫. পেশা"><Input value={tenant.occupation} onChange={(e) => updateTenant({ occupation: e.target.value })} /></Field>
                    <Field label="প্রতিষ্ঠান/কর্মস্থলের ঠিকানা"><Input value={tenant.workplace} onChange={(e) => updateTenant({ workplace: e.target.value })} /></Field>
                    <Field label="৬. ধর্ম"><Input value={tenant.religion} onChange={(e) => updateTenant({ religion: e.target.value })} /></Field>
                    <Field label="শিক্ষাগত যোগ্যতা"><Input value={tenant.education} onChange={(e) => updateTenant({ education: e.target.value })} /></Field>
                    <Field label="৭. মোবাইল নম্বর"><Input value={tenant.phone} onChange={(e) => updateTenant({ phone: e.target.value })} /></Field>
                    <Field label="ই-মেইল"><Input value={tenant.email} onChange={(e) => updateTenant({ email: e.target.value })} /></Field>
                    <Field label="৮. জাতীয় পরিচয়পত্র নম্বর"><Input value={tenant.nid_number} onChange={(e) => updateTenant({ nid_number: e.target.value })} /></Field>
                    <Field label="৯. পাসপোর্ট নম্বর (যদি থাকে)"><Input value={tenant.passport_number} onChange={(e) => updateTenant({ passport_number: e.target.value })} /></Field>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency contact */}
            <Card>
              <CardHeader><CardTitle className="text-base">১০. জরুরি যোগাযোগ</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="(ক) নাম"><Input value={tenant.emergency_name} onChange={(e) => updateTenant({ emergency_name: e.target.value })} /></Field>
                  <Field label="(খ) সম্পর্ক"><Input value={tenant.emergency_relation} onChange={(e) => updateTenant({ emergency_relation: e.target.value })} /></Field>
                  <Field label="(গ) ঠিকানা" full><Textarea rows={2} value={tenant.emergency_address} onChange={(e) => updateTenant({ emergency_address: e.target.value })} /></Field>
                  <Field label="(ঘ) মোবাইল নম্বর"><Input value={tenant.emergency_phone} onChange={(e) => updateTenant({ emergency_phone: e.target.value })} /></Field>
                </div>
              </CardContent>
            </Card>

            {/* Family members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">১১. পরিবার / মেসের সদস্যদের বিবরণ ({members.length} জন)</CardTitle>
                <Button size="sm" onClick={addMember} className="print:hidden">
                  <Plus className="h-4 w-4 mr-1" /> সদস্য যোগ
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {members.length === 0 && <p className="text-sm text-muted-foreground">কোনো সদস্য যোগ করা হয়নি</p>}
                {members.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border border-border p-2 text-left w-12">ক্রঃ</th>
                          <th className="border border-border p-2 text-left">নাম</th>
                          <th className="border border-border p-2 text-left">সম্পর্ক</th>
                          <th className="border border-border p-2 text-left w-20">বয়স</th>
                          <th className="border border-border p-2 text-left">পেশা</th>
                          <th className="border border-border p-2 text-left">মোবাইল নম্বর</th>
                          <th className="border border-border p-2 w-12 print:hidden"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m, idx) => (
                          <tr key={idx}>
                            <td className="border border-border p-1 text-center">{idx + 1}</td>
                            <td className="border border-border p-1"><Input value={m.name} onChange={(e) => updateMember(idx, { name: e.target.value })} className="border-0 h-8" /></td>
                            <td className="border border-border p-1"><RelationPicker value={m.relation} onChange={(v) => updateMember(idx, { relation: v })} /></td>
                            <td className="border border-border p-1"><Input type="number" value={m.age ?? ""} onChange={(e) => updateMember(idx, { age: e.target.value ? +e.target.value : null })} className="border-0 h-8" /></td>
                            <td className="border border-border p-1"><Input value={m.occupation} onChange={(e) => updateMember(idx, { occupation: e.target.value })} className="border-0 h-8" /></td>
                            <td className="border border-border p-1"><Input value={m.phone} onChange={(e) => updateMember(idx, { phone: e.target.value })} className="border-0 h-8" /></td>
                            <td className="border border-border p-1 text-center print:hidden">
                              <Button size="sm" variant="ghost" onClick={() => removeMember(idx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Helper */}
            <Card>
              <CardHeader><CardTitle className="text-base">১২. গৃহকর্মীর তথ্য</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="নাম"><Input value={tenant.helper_name} onChange={(e) => updateTenant({ helper_name: e.target.value })} /></Field>
                  <Field label="জাতীয় পরিচয়পত্র নং"><Input value={tenant.helper_nid} onChange={(e) => updateTenant({ helper_nid: e.target.value })} /></Field>
                  <Field label="মোবাইল নম্বর"><Input value={tenant.helper_phone} onChange={(e) => updateTenant({ helper_phone: e.target.value })} /></Field>
                  <Field label="স্থায়ী ঠিকানা"><Input value={tenant.helper_address} onChange={(e) => updateTenant({ helper_address: e.target.value })} /></Field>
                </div>
              </CardContent>
            </Card>

            {/* Driver */}
            <Card>
              <CardHeader><CardTitle className="text-base">১৩. ড্রাইভারের তথ্য</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="নাম"><Input value={tenant.driver_name} onChange={(e) => updateTenant({ driver_name: e.target.value })} /></Field>
                  <Field label="জাতীয় পরিচয়পত্র নং"><Input value={tenant.driver_nid} onChange={(e) => updateTenant({ driver_nid: e.target.value })} /></Field>
                </div>
              </CardContent>
            </Card>

            {/* Tenancy history */}
            <Card>
              <CardHeader><CardTitle className="text-base">পূর্ববর্তী ও বর্তমান বাড়িওয়ালার তথ্য</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="১৪. পূর্ববর্তী বাড়িওয়ালার নাম"><Input value={tenant.previous_landlord_name} onChange={(e) => updateTenant({ previous_landlord_name: e.target.value })} /></Field>
                  <Field label="মোবাইল নম্বর"><Input value={tenant.previous_landlord_phone} onChange={(e) => updateTenant({ previous_landlord_phone: e.target.value })} /></Field>
                  <Field label="১৫. পূর্ববর্তী বাসা ছাড়ার কারণ" full><Textarea rows={2} value={tenant.leave_reason} onChange={(e) => updateTenant({ leave_reason: e.target.value })} /></Field>
                  <Field label="১৬. বর্তমান বাড়িওয়ালার নাম"><Input value={tenant.current_landlord_name} onChange={(e) => updateTenant({ current_landlord_name: e.target.value })} /></Field>
                  <Field label="১৭. বর্তমান বাড়িতে যে তারিখ থেকে বসবাস"><Input type="date" value={tenant.move_in_date} onChange={(e) => updateTenant({ move_in_date: e.target.value })} /></Field>
                  <Field label="অন্যান্য মন্তব্য" full><Textarea rows={2} value={tenant.notes} onChange={(e) => updateTenant({ notes: e.target.value })} /></Field>
                </div>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  বিঃ দ্রঃ এই ফরমের একটি কপি বাড়ির মালিক অবশ্যই সংরক্ষণ করবেন।
                </p>
              </CardContent>
            </Card>

            {/* Tenancy timeline (tenant-only) */}
            {cfg.archiveEnabled && (history.length > 0 || tenant.tenant_name) && (() => {
              const bnDigits = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
              const toBn = (s: string) => s.replace(/\d/g, (d) => bnDigits[+d]);
              const fmtDate = (d?: string | null) => {
                if (!d) return "—";
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return d;
                return toBn(dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
              };
              const monthsBetween = (from?: string | null, to?: string | null) => {
                if (!from) return null;
                const a = new Date(from);
                const b = to ? new Date(to) : new Date();
                if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
                let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
                if (b.getDate() < a.getDate()) m -= 1;
                if (m < 0) return null;
                const years = Math.floor(m / 12);
                const months = m % 12;
                const parts: string[] = [];
                if (years > 0) parts.push(`${toBn(String(years))} বছর`);
                if (months > 0) parts.push(`${toBn(String(months))} মাস`);
                if (parts.length === 0) parts.push("১ মাসের কম");
                return parts.join(" ");
              };

              type TLItem = {
                key: string;
                name: string;
                photo_url?: string | null;
                phone?: string | null;
                family_count?: number | null;
                move_in?: string | null;
                move_out?: string | null;
                leave_reason?: string | null;
                current: boolean;
              };
              const items: TLItem[] = [];
              if (tenant.tenant_name) {
                items.push({
                  key: "current",
                  name: tenant.tenant_name,
                  photo_url: tenant.photo_url,
                  phone: tenant.phone,
                  family_count: tenant.total_members ?? null,
                  move_in: tenant.move_in_date || null,
                  move_out: null,
                  leave_reason: null,
                  current: true,
                });
              }
              for (const h of history) {
                items.push({
                  key: h.id,
                  name: h.tenant_name,
                  photo_url: h.photo_url,
                  phone: h.phone,
                  family_count: h.family_count,
                  move_in: h.move_in_date,
                  move_out: h.move_out_date,
                  leave_reason: h.leave_reason,
                  current: false,
                });
              }
              items.sort((a, b) => {
                if (a.current) return -1;
                if (b.current) return 1;
                return (b.move_out || "").localeCompare(a.move_out || "");
              });

              return (
                <Card className="print:hidden">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" /> ভাড়াটিয়া টাইমলাইন
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="relative border-s-2 border-border ms-3 space-y-6">
                      {items.map((it) => (
                        <li key={it.key} className="ms-6">
                          <span className={`absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${it.current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {it.current ? <Clock className="h-3 w-3" /> : <History className="h-3 w-3" />}
                          </span>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg border border-border p-3 bg-card">
                            <div className="flex items-start gap-3 min-w-0">
                              <Avatar className="h-10 w-10 shrink-0">
                                {it.photo_url ? <AvatarImage src={it.photo_url} /> : null}
                                <InitialsFallback name={it.name || "?"} />
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate">{it.name}</span>
                                  {it.current ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">বর্তমান</span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">পূর্ববর্তী</span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {it.phone || "মোবাইল নেই"}
                                  {it.family_count ? ` · ${toBn(String(it.family_count))} সদস্য` : ""}
                                </div>
                                {it.leave_reason ? (
                                  <div className="text-xs text-muted-foreground mt-1 italic">কারণ: {it.leave_reason}</div>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-xs sm:text-right shrink-0 space-y-1">
                              <div className="flex items-center gap-1.5 sm:justify-end">
                                <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-muted-foreground">উঠেছেন:</span>
                                <span className="font-medium">{fmtDate(it.move_in)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 sm:justify-end">
                                <LogOut className="h-3.5 w-3.5 text-rose-600" />
                                <span className="text-muted-foreground">চলে গেছেন:</span>
                                <span className="font-medium">{it.current ? "এখনো আছেন" : fmtDate(it.move_out)}</span>
                              </div>
                              {monthsBetween(it.move_in, it.move_out) ? (
                                <div className="flex items-center gap-1.5 sm:justify-end text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>সময়কাল: {monthsBetween(it.move_in, it.move_out)}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Tenancy history (tenant-only) */}
            {cfg.archiveEnabled && history.length > 0 && (
              <Card className="print:hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" /> পূর্ববর্তী ভাড়াটিয়া ({history.length} জন)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border border-border p-2 text-left">নাম</th>
                          <th className="border border-border p-2 text-left">মোবাইল</th>
                          <th className="border border-border p-2 text-left">পেশা</th>
                          <th className="border border-border p-2 text-left">সদস্য</th>
                          <th className="border border-border p-2 text-left">উঠেছিলেন</th>
                          <th className="border border-border p-2 text-left">চলে গেছেন</th>
                          <th className="border border-border p-2 text-left">যে মাসে</th>
                          <th className="border border-border p-2 text-left">কারণ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((h) => (
                          <tr key={h.id}>
                            <td className="border border-border p-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  {h.photo_url ? <AvatarImage src={h.photo_url} /> : null}
                                  <InitialsFallback name={h.tenant_name || "?"} />
                                </Avatar>
                                <span>{h.tenant_name}</span>
                              </div>
                            </td>
                            <td className="border border-border p-2">{h.phone || "—"}</td>
                            <td className="border border-border p-2">{h.occupation || "—"}</td>
                            <td className="border border-border p-2">{h.family_count}</td>
                            <td className="border border-border p-2">{h.move_in_date || "—"}</td>
                            <td className="border border-border p-2">{h.move_out_date || "—"}</td>
                            <td className="border border-border p-2">{h.move_out_month || "—"}</td>
                            <td className="border border-border p-2 max-w-[220px] truncate" title={h.leave_reason || ""}>{h.leave_reason || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="sticky bottom-0 -mx-2 px-2 py-3 bg-background/95 backdrop-blur border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 print:hidden z-10">
              <p className="text-xs text-muted-foreground">
                পরিবর্তন সংরক্ষণ করতে নিচের বাটনে ক্লিক করুন।
              </p>
              <Button onClick={save} disabled={saving} size="lg" className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                সংরক্ষণ করুন
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2 lg:col-span-3 space-y-1" : "space-y-1"}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
