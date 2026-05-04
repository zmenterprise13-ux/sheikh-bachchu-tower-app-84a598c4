import { useEffect, useMemo, useRef, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Upload, Loader2, Save, Printer, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  gender: string;
  occupation: string;
  education: string;
  institution: string;
  is_married: boolean;
  spouse_name: string;
  children_count: number;
  children_details: string;
  phone: string;
  notes: string;
};

type TenantInfo = {
  id?: string;
  flat_id: string;
  tenant_name: string;
  tenant_name_bn: string;
  father_name: string;
  mother_name: string;
  spouse_name: string;
  permanent_address: string;
  present_address: string;
  phone: string;
  emergency_phone: string;
  email: string;
  occupation: string;
  workplace: string;
  nid_number: string;
  photo_url: string | null;
  move_in_date: string;
  total_members: number;
  notes: string;
};

const emptyTenant = (flat_id: string): TenantInfo => ({
  flat_id,
  tenant_name: "",
  tenant_name_bn: "",
  father_name: "",
  mother_name: "",
  spouse_name: "",
  permanent_address: "",
  present_address: "",
  phone: "",
  emergency_phone: "",
  email: "",
  occupation: "",
  workplace: "",
  nid_number: "",
  photo_url: null,
  move_in_date: "",
  total_members: 0,
  notes: "",
});

const emptyMember = (): FamilyMember => ({
  name: "",
  relation: "",
  age: null,
  gender: "",
  occupation: "",
  education: "",
  institution: "",
  is_married: false,
  spouse_name: "",
  children_count: 0,
  children_details: "",
  phone: "",
  notes: "",
});

export default function TenantInfoPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string>("");
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Load flats
  useEffect(() => {
    (async () => {
      let q = supabase.from("flats").select("id, flat_no, floor, owner_name, owner_user_id").order("floor").order("flat_no");
      const { data, error } = await q;
      if (error) {
        toast.error(error.message);
        return;
      }
      const list = (data || []) as Flat[];
      // Owners only see their own flat(s)
      const visible = isAdmin ? list : list.filter((f) => f.owner_user_id === user?.id);
      setFlats(visible);
      if (visible.length && !selectedFlatId) setSelectedFlatId(visible[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user?.id]);

  // Load tenant + members for the selected flat
  useEffect(() => {
    if (!selectedFlatId) return;
    setLoading(true);
    (async () => {
      const { data: ti, error } = await supabase
        .from("tenant_info")
        .select("*")
        .eq("flat_id", selectedFlatId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") {
        toast.error(error.message);
      }
      if (ti) {
        setTenant({ ...emptyTenant(selectedFlatId), ...(ti as any), photo_url: (ti as any).photo_url ?? null });
        const { data: fm } = await supabase
          .from("tenant_family_members")
          .select("*")
          .eq("tenant_info_id", (ti as any).id)
          .order("sort_order")
          .order("created_at");
        setMembers(((fm || []) as any[]).map((m) => ({
          id: m.id,
          name: m.name ?? "",
          relation: m.relation ?? "",
          age: m.age,
          gender: m.gender ?? "",
          occupation: m.occupation ?? "",
          education: m.education ?? "",
          institution: m.institution ?? "",
          is_married: !!m.is_married,
          spouse_name: m.spouse_name ?? "",
          children_count: m.children_count ?? 0,
          children_details: m.children_details ?? "",
          phone: m.phone ?? "",
          notes: m.notes ?? "",
        })));
      } else {
        setTenant(emptyTenant(selectedFlatId));
        setMembers([]);
      }
      setLoading(false);
    })();
  }, [selectedFlatId]);

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
      const path = `tenants/${selectedFlatId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("tenant-photos").upload(path, compressed, {
        upsert: false,
        contentType: compressed.type,
      });
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
    if (!tenant.tenant_name.trim()) return toast.error("ভাড়াটিয়ার নাম দিন");
    setSaving(true);
    try {
      const payload: any = {
        ...tenant,
        move_in_date: tenant.move_in_date || null,
        total_members: members.length,
      };
      let tenantId = tenant.id;
      if (tenantId) {
        const { error } = await supabase.from("tenant_info").update(payload).eq("id", tenantId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("tenant_info").insert(payload).select("id").single();
        if (error) throw error;
        tenantId = (data as any).id;
        setTenant((t) => (t ? { ...t, id: tenantId } : t));
      }

      // Replace family members (simple: delete & re-insert)
      await supabase.from("tenant_family_members").delete().eq("tenant_info_id", tenantId!);
      if (members.length) {
        const rows = members.map((m, idx) => ({
          tenant_info_id: tenantId,
          name: m.name,
          relation: m.relation,
          age: m.age,
          gender: m.gender || null,
          occupation: m.occupation || null,
          education: m.education || null,
          institution: m.institution || null,
          is_married: m.is_married,
          spouse_name: m.spouse_name || null,
          children_count: m.children_count || 0,
          children_details: m.children_details || null,
          phone: m.phone || null,
          notes: m.notes || null,
          sort_order: idx,
        }));
        const { error } = await supabase.from("tenant_family_members").insert(rows);
        if (error) throw error;
      }
      toast.success("সংরক্ষণ হয়েছে");
    } catch (err: any) {
      toast.error(err.message ?? "সংরক্ষণ ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  const selectedFlat = flats.find((f) => f.id === selectedFlatId);

  const handlePrintFilled = () => {
    window.print();
  };

  const handleDownloadBlankPdf = () => {
    // open blank form route in new tab and trigger print
    const w = window.open("/tenant-info/blank-form", "_blank");
    if (!w) toast.error("পপ-আপ ব্লকড");
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" /> ভাড়াটিয়া তথ্য
            </h1>
            <p className="text-sm text-muted-foreground">ফ্ল্যাট অনুযায়ী ভাড়াটিয়ার তথ্য সংরক্ষণ ও আপডেট করুন</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadBlankPdf}>
              <Download className="h-4 w-4 mr-1" /> ফাঁকা ফরম
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintFilled}>
              <Printer className="h-4 w-4 mr-1" /> প্রিন্ট
            </Button>
            {tenant && (
              <Button onClick={save} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                সংরক্ষণ / Update
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
          <div ref={printRef} className="space-y-4 print-area">
            {/* Print header */}
            <div className="hidden print:block text-center mb-4">
              <h1 className="text-xl font-bold">শেখ বাচ্চু টাওয়ার</h1>
              <p className="text-sm">ভাড়াটিয়া তথ্য — ফ্ল্যাট {selectedFlat?.flat_no}</p>
            </div>

            {/* Tenant basic info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ভাড়াটিয়ার ব্যক্তিগত তথ্য</CardTitle>
              </CardHeader>
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
                    <Field label="নাম (বাংলা) *">
                      <Input value={tenant.tenant_name} onChange={(e) => updateTenant({ tenant_name: e.target.value })} />
                    </Field>
                    <Field label="নাম (English)">
                      <Input value={tenant.tenant_name_bn} onChange={(e) => updateTenant({ tenant_name_bn: e.target.value })} />
                    </Field>
                    <Field label="পিতার নাম">
                      <Input value={tenant.father_name} onChange={(e) => updateTenant({ father_name: e.target.value })} />
                    </Field>
                    <Field label="মাতার নাম">
                      <Input value={tenant.mother_name} onChange={(e) => updateTenant({ mother_name: e.target.value })} />
                    </Field>
                    <Field label="স্বামী/স্ত্রীর নাম">
                      <Input value={tenant.spouse_name} onChange={(e) => updateTenant({ spouse_name: e.target.value })} />
                    </Field>
                    <Field label="মোবাইল নং">
                      <Input value={tenant.phone} onChange={(e) => updateTenant({ phone: e.target.value })} />
                    </Field>
                    <Field label="জরুরি যোগাযোগ">
                      <Input value={tenant.emergency_phone} onChange={(e) => updateTenant({ emergency_phone: e.target.value })} />
                    </Field>
                    <Field label="ইমেইল">
                      <Input value={tenant.email} onChange={(e) => updateTenant({ email: e.target.value })} />
                    </Field>
                    <Field label="পেশা">
                      <Input value={tenant.occupation} onChange={(e) => updateTenant({ occupation: e.target.value })} />
                    </Field>
                    <Field label="কর্মস্থল">
                      <Input value={tenant.workplace} onChange={(e) => updateTenant({ workplace: e.target.value })} />
                    </Field>
                    <Field label="NID নং">
                      <Input value={tenant.nid_number} onChange={(e) => updateTenant({ nid_number: e.target.value })} />
                    </Field>
                    <Field label="প্রবেশের তারিখ">
                      <Input type="date" value={tenant.move_in_date} onChange={(e) => updateTenant({ move_in_date: e.target.value })} />
                    </Field>
                    <Field label="স্থায়ী ঠিকানা" full>
                      <Textarea rows={2} value={tenant.permanent_address} onChange={(e) => updateTenant({ permanent_address: e.target.value })} />
                    </Field>
                    <Field label="বর্তমান ঠিকানা" full>
                      <Textarea rows={2} value={tenant.present_address} onChange={(e) => updateTenant({ present_address: e.target.value })} />
                    </Field>
                    <Field label="অন্যান্য মন্তব্য" full>
                      <Textarea rows={2} value={tenant.notes} onChange={(e) => updateTenant({ notes: e.target.value })} />
                    </Field>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Family members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">পরিবারের সদস্যবৃন্দ ({members.length} জন)</CardTitle>
                <Button size="sm" onClick={addMember} className="print:hidden">
                  <Plus className="h-4 w-4 mr-1" /> সদস্য যোগ
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.length === 0 && <p className="text-sm text-muted-foreground">কোনো সদস্য যোগ করা হয়নি</p>}
                {members.map((m, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">সদস্য #{idx + 1}</span>
                      <Button size="sm" variant="ghost" onClick={() => removeMember(idx)} className="print:hidden">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <Field label="নাম">
                        <Input value={m.name} onChange={(e) => updateMember(idx, { name: e.target.value })} />
                      </Field>
                      <Field label="সম্পর্ক">
                        <Input placeholder="যেমন: ছেলে, মেয়ে, স্ত্রী" value={m.relation} onChange={(e) => updateMember(idx, { relation: e.target.value })} />
                      </Field>
                      <Field label="বয়স">
                        <Input type="number" value={m.age ?? ""} onChange={(e) => updateMember(idx, { age: e.target.value ? +e.target.value : null })} />
                      </Field>
                      <Field label="লিঙ্গ">
                        <Select value={m.gender} onValueChange={(v) => updateMember(idx, { gender: v })}>
                          <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="পুরুষ">পুরুষ</SelectItem>
                            <SelectItem value="মহিলা">মহিলা</SelectItem>
                            <SelectItem value="অন্যান্য">অন্যান্য</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="পেশা / কী করে">
                        <Input value={m.occupation} onChange={(e) => updateMember(idx, { occupation: e.target.value })} />
                      </Field>
                      <Field label="শিক্ষাগত যোগ্যতা">
                        <Input value={m.education} onChange={(e) => updateMember(idx, { education: e.target.value })} />
                      </Field>
                      <Field label="পড়াশোনার প্রতিষ্ঠান">
                        <Input value={m.institution} onChange={(e) => updateMember(idx, { institution: e.target.value })} />
                      </Field>
                      <Field label="মোবাইল">
                        <Input value={m.phone} onChange={(e) => updateMember(idx, { phone: e.target.value })} />
                      </Field>
                      <div className="flex items-end gap-2">
                        <Label className="text-xs">বিবাহিত?</Label>
                        <Switch checked={m.is_married} onCheckedChange={(v) => updateMember(idx, { is_married: v })} />
                      </div>
                      {m.is_married && (
                        <>
                          <Field label="স্বামী/স্ত্রীর নাম">
                            <Input value={m.spouse_name} onChange={(e) => updateMember(idx, { spouse_name: e.target.value })} />
                          </Field>
                          <Field label="সন্তান সংখ্যা">
                            <Input type="number" value={m.children_count} onChange={(e) => updateMember(idx, { children_count: +e.target.value || 0 })} />
                          </Field>
                          <Field label="সন্তানদের বিবরণ" full>
                            <Textarea rows={2} value={m.children_details} onChange={(e) => updateMember(idx, { children_details: e.target.value })} />
                          </Field>
                        </>
                      )}
                      <Field label="মন্তব্য" full>
                        <Textarea rows={2} value={m.notes} onChange={(e) => updateMember(idx, { notes: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="sticky bottom-0 -mx-2 px-2 py-3 bg-background/95 backdrop-blur border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 print:hidden z-10">
              <p className="text-xs text-muted-foreground">
                পরিবর্তন সংরক্ষণ করতে নিচের বাটনে ক্লিক করুন। ভাড়াটিয়ার তথ্য ও সকল ফ্যামিলি মেম্বার একসাথে সেভ হবে।
              </p>
              <Button onClick={save} disabled={saving} size="lg" className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                সংরক্ষণ করুন / Update
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
