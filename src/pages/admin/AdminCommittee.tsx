import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Pencil, Trash2, Upload, Users, ArrowUp, ArrowDown, Phone, Link2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Flat = {
  id: string;
  flat_no: string;
  owner_name: string | null;
  owner_name_bn: string | null;
  phone: string | null;
  owner_photo_url: string | null;
};

type Member = {
  id: string;
  name: string;
  name_bn: string;
  role: string;
  role_bn: string;
  photo_url: string | null;
  accent: string;
  sort_order: number;
  is_published: boolean;
  bio: string | null;
  bio_bn: string | null;
  phone: string | null;
  flat_id: string | null;
  category: string;
};

const ACCENTS = [
  { value: "from-amber-400 to-yellow-600", label: "Amber" },
  { value: "from-sky-400 to-blue-600", label: "Sky" },
  { value: "from-emerald-400 to-teal-600", label: "Emerald" },
  { value: "from-fuchsia-400 to-purple-600", label: "Fuchsia" },
  { value: "from-rose-400 to-pink-600", label: "Rose" },
  { value: "from-orange-400 to-red-600", label: "Orange" },
  { value: "from-cyan-400 to-sky-600", label: "Cyan" },
  { value: "from-lime-400 to-green-600", label: "Lime" },
  { value: "from-indigo-400 to-violet-600", label: "Indigo" },
  { value: "from-teal-400 to-emerald-600", label: "Teal" },
];

const emptyForm = {
  name: "",
  name_bn: "",
  role: "",
  role_bn: "",
  photo_url: "",
  accent: ACCENTS[1].value,
  sort_order: 0,
  is_published: true,
  bio: "",
  bio_bn: "",
  phone: "",
  flat_id: "" as string,
  category: "committee" as "committee" | "advisor",
};

export default function AdminCommittee() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<Member[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [flatPickerOpen, setFlatPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: m, error }, { data: f }] = await Promise.all([
      supabase
        .from("committee_members")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("flats")
        .select("id, flat_no, owner_name, owner_name_bn, phone, owner_photo_url")
        .order("flat_no", { ascending: true }),
    ]);
    if (error) toast.error(error.message);
    setItems((m ?? []) as Member[]);
    setFlats((f ?? []) as Flat[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Only flats that have a phone number can be selected (phone is mandatory for visibility)
  const eligibleFlats = useMemo(
    () => flats.filter((f) => f.phone && f.phone.trim().length > 0),
    [flats]
  );
  const flatById = (id: string | null) => flats.find((f) => f.id === id) || null;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: items.length });
    setOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      name_bn: m.name_bn,
      role: m.role,
      role_bn: m.role_bn,
      photo_url: m.photo_url ?? "",
      accent: m.accent,
      sort_order: m.sort_order,
      is_published: m.is_published,
      bio: m.bio ?? "",
      bio_bn: m.bio_bn ?? "",
      phone: m.phone ?? "",
      flat_id: m.flat_id ?? "",
      category: (m.category as any) || "committee",
    });
    setOpen(true);
  };

  const onPickFlat = (flatId: string) => {
    const f = flatById(flatId);
    if (!f) { setForm((s) => ({ ...s, flat_id: "" })); return; }
    setForm((s) => ({
      ...s,
      flat_id: f.id,
      // Auto-prefill name fields if empty
      name_bn: s.name_bn.trim() || f.owner_name_bn || f.owner_name || "",
      name: s.name.trim() || f.owner_name || f.owner_name_bn || "",
      // Phone always synced from flat
      phone: f.phone ?? "",
    }));
  };

  const onPhoto = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("committee-photos").upload(path, file, { upsert: false });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from("committee-photos").getPublicUrl(path);
    setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    setUploading(false);
  };

  const submit = async () => {
    if (!form.flat_id) {
      toast.error(lang === "bn" ? "ফ্ল্যাট নির্বাচন করুন" : "Select a flat");
      return;
    }
    if (!form.name_bn.trim() || !form.role_bn.trim()) {
      toast.error(lang === "bn" ? "নাম ও পদবি দিন" : "Name & role required");
      return;
    }
    const f = flatById(form.flat_id);
    if (!f || !f.phone || !f.phone.trim()) {
      toast.error(lang === "bn" ? "এই ফ্ল্যাটের ফোন নম্বর নেই" : "Selected flat has no phone number");
      return;
    }
    setSubmitting(true);
    const payload = {
      name: form.name.trim() || form.name_bn.trim(),
      name_bn: form.name_bn.trim(),
      role: form.role.trim() || form.role_bn.trim(),
      role_bn: form.role_bn.trim(),
      photo_url: form.photo_url || null,
      accent: form.accent,
      sort_order: form.sort_order,
      is_published: form.is_published,
      bio: form.bio.trim() || null,
      bio_bn: form.bio_bn.trim() || null,
      phone: f.phone.trim(),
      flat_id: form.flat_id,
      category: form.category,
    };
    const { error } = editingId
      ? await supabase.from("committee_members").update(payload).eq("id", editingId)
      : await supabase.from("committee_members").insert(payload);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? (lang === "bn" ? "আপডেট হয়েছে" : "Updated") : (lang === "bn" ? "যোগ হয়েছে" : "Added"));
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const togglePublish = async (m: Member) => {
    const { error } = await supabase.from("committee_members").update({ is_published: !m.is_published }).eq("id", m.id);
    if (error) toast.error(error.message);
    else load();
  };

  const move = async (m: Member, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === m.id);
    const swap = items[idx + dir];
    if (!swap) return;
    await supabase.from("committee_members").update({ sort_order: swap.sort_order }).eq("id", m.id);
    await supabase.from("committee_members").update({ sort_order: m.sort_order }).eq("id", swap.id);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("committee_members").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else { toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted"); load(); }
    setDeleteId(null);
  };

  const linkedFlat = flatById(form.flat_id);
  const effectivePhoto = form.photo_url || linkedFlat?.owner_photo_url || "";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {lang === "bn" ? "কার্যকরী কমিটি" : "Executive Committee"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "bn" ? "কমিটির সদস্য একজন ফ্ল্যাট ওনার — ফোন নম্বর ও ছবি অটো ফ্ল্যাট থেকে নেওয়া হবে" : "Each member is linked to a flat owner — phone & photo are auto from the flat"}
            </p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gradient-primary text-primary-foreground gap-2 shadow-elegant">
                <Plus className="h-4 w-4" /> {lang === "bn" ? "সদস্য যোগ করুন" : "Add Member"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? (lang === "bn" ? "সদস্য এডিট" : "Edit Member") : (lang === "bn" ? "নতুন সদস্য" : "New Member")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {/* Flat selector */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                    {lang === "bn" ? "ফ্ল্যাট ওনার নির্বাচন করুন" : "Link to flat owner"}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select value={form.flat_id || undefined} onValueChange={onPickFlat}>
                    <SelectTrigger>
                      <SelectValue placeholder={lang === "bn" ? "ফ্ল্যাট নির্বাচন করুন" : "Select a flat"} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleFlats.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                          {lang === "bn" ? "কোনো ফ্ল্যাটে ফোন নম্বর সেট নেই" : "No flat has a phone number set"}
                        </div>
                      ) : (
                        eligibleFlats.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <span className="font-semibold">{f.flat_no}</span>
                            {" — "}
                            <span>{lang === "bn" ? (f.owner_name_bn || f.owner_name) : (f.owner_name || f.owner_name_bn) || "—"}</span>
                            <span className="text-muted-foreground ml-1.5">({f.phone})</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "bn" ? "শুধু যাদের ফোন নম্বর আছে তারাই তালিকায় আসবে" : "Only flats with a phone number are listed"}
                  </p>
                </div>

                {/* Photo (auto from flat or manual override) */}
                <div className="flex items-center gap-3">
                  <div className={`h-20 w-20 rounded-xl bg-muted overflow-hidden border border-border shrink-0 bg-gradient-to-br ${form.accent}`}>
                    {effectivePhoto ? <img src={effectivePhoto} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); }}
                    />
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                      <Upload className="h-4 w-4" />
                      {uploading ? "..." : (lang === "bn" ? "ছবি আপলোড / পরিবর্তন" : "Upload / change photo")}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      {form.photo_url
                        ? (lang === "bn" ? "কাস্টম ছবি ব্যবহার হচ্ছে" : "Using custom photo")
                        : linkedFlat?.owner_photo_url
                          ? (lang === "bn" ? "ফ্ল্যাট ওনারের ছবি অটো দেখানো হচ্ছে" : "Auto from flat owner photo")
                          : (lang === "bn" ? "ছবি পরে আপলোড করতে পারবেন" : "You can add a photo later")}
                    </p>
                    {form.photo_url && (
                      <button
                        type="button"
                        className="text-[11px] text-primary hover:underline"
                        onClick={() => setForm((s) => ({ ...s, photo_url: "" }))}
                      >
                        {lang === "bn" ? "কাস্টম ছবি সরান (ফ্ল্যাট ওনারের ছবিতে ফিরে যান)" : "Remove custom photo (use flat owner photo)"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Phone - readonly, from flat */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {lang === "bn" ? "ফোন নম্বর (অটো)" : "Phone (auto)"}
                  </Label>
                  <Input value={linkedFlat?.phone || form.phone} readOnly disabled placeholder="—" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>নাম (বাংলা)</Label>
                    <Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Name (English)</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>পদবি (বাংলা)</Label>
                    <Input value={form.role_bn} onChange={(e) => setForm({ ...form, role_bn: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role (English)</Label>
                    <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "ক্যাটাগরি" : "Category"}</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as "committee" | "advisor" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="committee">{lang === "bn" ? "কার্যকরী কমিটি" : "Executive Committee"}</SelectItem>
                      <SelectItem value="advisor">{lang === "bn" ? "উপদেষ্টা পরিষদ" : "Advisory Council"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "রঙ" : "Accent color"}</Label>
                  <Select value={form.accent} onValueChange={(v) => setForm({ ...form, accent: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCENTS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          <div className="flex items-center gap-2">
                            <span className={`h-4 w-4 rounded-full bg-gradient-to-br ${a.value}`} />
                            {a.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>সংক্ষিপ্ত বায়ো (বাংলা)</Label>
                  <Textarea rows={3} value={form.bio_bn} onChange={(e) => setForm({ ...form, bio_bn: e.target.value })} placeholder="সদস্য সম্পর্কে সংক্ষিপ্ত বিবরণ..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Short Bio (English)</Label>
                  <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Brief description about the member..." />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{lang === "bn" ? "ফ্রন্ট পেজে দেখান" : "Publish on front page"}</span>
                  <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>{t("cancel")}</Button>
                <Button className="gradient-primary text-primary-foreground" onClick={submit} disabled={submitting || uploading}>
                  {submitting ? "..." : t("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading && (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">{t("noData")}</div>
        )}
        {!loading && items.length > 0 && (() => {
          const advisors = items.filter((m) => m.category === "advisor");
          const committee = items.filter((m) => m.category !== "advisor");

          const renderRow = (m: Member, i: number, list: Member[]) => {
            const f = flatById(m.flat_id);
            const photo = m.photo_url || f?.owner_photo_url || null;
            const phone = f?.phone || m.phone;
            const noPhone = !phone || !phone.trim();
            return (
              <div key={m.id} className={`rounded-2xl bg-card border ${noPhone ? "border-amber-300" : "border-border"} p-4 shadow-soft flex items-center gap-4`}>
                <div className={`h-16 w-16 rounded-xl overflow-hidden border-2 bg-muted shrink-0 bg-gradient-to-br ${m.accent}`}>
                  {photo && <img src={photo} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">{lang === "bn" ? m.name_bn : m.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{lang === "bn" ? m.role_bn : m.role}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {f && (
                      <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {f.flat_no}
                      </span>
                    )}
                    {phone && (
                      <span className="text-[10px] font-mono bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        {phone}
                      </span>
                    )}
                    {(m.bio_bn?.trim() || m.bio?.trim()) ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
                        {lang === "bn" ? "বায়ো আছে" : "Bio added"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                        {lang === "bn" ? "বায়ো নেই" : "No bio"}
                      </span>
                    )}
                    {noPhone && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                        {lang === "bn" ? "ফোন নেই — সামনে দেখাবে না" : "No phone — hidden on front"}
                      </span>
                    )}
                    {!m.is_published && (
                      <span className="text-[10px] font-bold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        {lang === "bn" ? "অপ্রকাশিত" : "UNPUBLISHED"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => move(m, -1)} disabled={i === 0} aria-label="Up"><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => move(m, 1)} disabled={i === list.length - 1} aria-label="Down"><ArrowDown className="h-4 w-4" /></Button>
                  <Switch checked={m.is_published} onCheckedChange={() => togglePublish(m)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} aria-label="Delete" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          };

          const Section = ({ title, list, accent }: { title: string; list: Member[]; accent: string }) => (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full bg-gradient-to-br ${accent}`} />
                <h2 className="text-base font-bold text-foreground">{title}</h2>
                <span className="text-xs text-muted-foreground">({list.length})</span>
              </div>
              {list.length === 0 ? (
                <div className="rounded-2xl bg-muted/30 border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  {lang === "bn" ? "কোনো সদস্য নেই" : "No members yet"}
                </div>
              ) : (
                <div className="grid gap-3">
                  {list.map((m, i) => renderRow(m, i, list))}
                </div>
              )}
            </div>
          );

          return (
            <div className="space-y-8">
              <Section
                title={lang === "bn" ? "উপদেষ্টা পরিষদ" : "Advisory Council"}
                list={advisors}
                accent="from-fuchsia-400 to-purple-600"
              />
              <Section
                title={lang === "bn" ? "কার্যকরী কমিটি" : "Executive Committee"}
                list={committee}
                accent="from-sky-400 to-blue-600"
              />
            </div>
          );
        })()}

        <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{lang === "bn" ? "সদস্য মুছবেন?" : "Delete member?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {lang === "bn" ? "এই কাজটি ফিরিয়ে আনা যাবে না।" : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {lang === "bn" ? "মুছুন" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
