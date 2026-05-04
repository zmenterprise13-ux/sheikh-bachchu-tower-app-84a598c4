import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Upload, Users, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

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
};

export default function AdminCommittee() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("committee_members")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Member[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
    });
    setOpen(true);
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
    if (!form.name_bn.trim() || !form.role_bn.trim()) {
      toast.error(lang === "bn" ? "নাম ও পদবি দিন" : "Name & role required");
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
              {lang === "bn" ? "ফ্রন্ট পেজে দেখানো কমিটি সদস্যদের পরিচালনা করুন" : "Manage members shown on the front page"}
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
                <div className="flex items-center gap-3">
                  <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden border border-border shrink-0">
                    {form.photo_url ? <img src={form.photo_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); }}
                    />
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                      <Upload className="h-4 w-4" />
                      {uploading ? "..." : (lang === "bn" ? "ছবি আপলোড" : "Upload photo")}
                    </Button>
                  </div>
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

        <div className="grid gap-3">
          {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">{t("noData")}</div>
          )}
          {!loading && items.map((m, i) => (
            <div key={m.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center gap-4">
              <div className={`h-16 w-16 rounded-xl overflow-hidden border-2 bg-muted shrink-0 bg-gradient-to-br ${m.accent}`}>
                {m.photo_url && <img src={m.photo_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground truncate">{lang === "bn" ? m.name_bn : m.name}</div>
                <div className="text-sm text-muted-foreground truncate">{lang === "bn" ? m.role_bn : m.role}</div>
                {!m.is_published && (
                  <span className="inline-block mt-1 text-[10px] font-bold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                    {lang === "bn" ? "অপ্রকাশিত" : "UNPUBLISHED"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => move(m, -1)} disabled={i === 0} aria-label="Up"><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => move(m, 1)} disabled={i === items.length - 1} aria-label="Down"><ArrowDown className="h-4 w-4" /></Button>
                <Switch checked={m.is_published} onCheckedChange={() => togglePublish(m)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(m)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} aria-label="Delete" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>

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
