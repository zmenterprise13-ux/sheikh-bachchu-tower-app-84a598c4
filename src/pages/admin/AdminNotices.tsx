import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Megaphone, AlertTriangle, Pencil, Trash2, Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { NoticeBody } from "@/components/NoticeBody";

type Notice = {
  id: string;
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  important: boolean;
  date: string;
};

const emptyForm = { title: "", titleBn: "", body: "", bodyBn: "", important: false };

export default function AdminNotices() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const broadcastUpdate = async () => {
    setBroadcasting(true);
    try {
      // Server-side fetch via edge function — bypasses GitHub per-IP rate limit + CORS.
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "github-latest-release"
      );
      if (fnErr) throw fnErr;
      if (fnData?.error) throw new Error(fnData.error);
      const latest = fnData?.release;
      if (!latest?.tag_name) {
        toast.error(lang === "bn" ? "কোনো রিলিজ পাওয়া যায়নি" : "No release found");
        return;
      }
      const apk = latest.assets?.find((a: any) => a.name.endsWith(".apk"));
      const tag = latest.tag_name;
      const downloadUrl = apk?.browser_download_url ?? latest.html_url;
      const titleBn = `🚀 নতুন অ্যাপ আপডেট — ${tag}`;
      const titleEn = `🚀 New App Update — ${tag}`;
      const bodyBn = `অ্যাপের নতুন ভার্সন ${tag} প্রকাশিত হয়েছে। নিচের বাটনে ক্লিক করে নতুন APK ডাউনলোড ও ইনস্টল করুন। এরপর থেকে নতুন আপডেট আসলেই অ্যাপের ভিতরে স্বয়ংক্রিয়ভাবে notification পাবেন।\n\n${downloadUrl}`;
      const bodyEn = `New app version ${tag} is available. Click the button below to download and install the latest APK. Future updates will be notified automatically inside the app.\n\n${downloadUrl}`;
      const { error } = await supabase.from("notices").insert({
        title: titleEn,
        title_bn: titleBn,
        body: bodyEn,
        body_bn: bodyBn,
        important: true,
        date: new Date().toISOString().slice(0, 10),
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success(lang === "bn" ? "আপডেট নোটিশ পাঠানো হয়েছে" : "Update notice broadcasted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notices")
      .select("id, title, title_bn, body, body_bn, important, date")
      .order("date", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Notice[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (n: Notice) => {
    setEditingId(n.id);
    setForm({ title: n.title, titleBn: n.title_bn, body: n.body, bodyBn: n.body_bn, important: n.important });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.titleBn.trim() || !form.bodyBn.trim()) {
      toast.error(lang === "bn" ? "শিরোনাম ও বিবরণ দিন" : "Title & body required");
      return;
    }
    setSubmitting(true);
    const payload = {
      title: form.title.trim() || form.titleBn.trim(),
      title_bn: form.titleBn.trim(),
      body: form.body.trim() || form.bodyBn.trim(),
      body_bn: form.bodyBn.trim(),
      important: form.important,
    };
    const { error } = editingId
      ? await supabase.from("notices").update(payload).eq("id", editingId)
      : await supabase.from("notices").insert({
          ...payload,
          date: new Date().toISOString().slice(0, 10),
          created_by: user?.id ?? null,
        });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      editingId
        ? (lang === "bn" ? "নোটিশ আপডেট হয়েছে" : "Notice updated")
        : (lang === "bn" ? "নোটিশ পোস্ট হয়েছে" : "Notice posted"),
    );
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("notices").delete().eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(lang === "bn" ? "নোটিশ মুছে ফেলা হয়েছে" : "Notice deleted");
      load();
    }
    setDeleteId(null);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("notices")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "bn" ? "ফ্ল্যাট ওনারদের জন্য সাম্প্রতিক ঘোষণা" : "Recent announcements for flat owners"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={broadcastUpdate}
              disabled={broadcasting}
              variant="outline"
              className="gap-2"
            >
              {broadcasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {lang === "bn" ? "অ্যাপ আপডেট নোটিশ" : "App Update Notice"}
            </Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild>
                <Button onClick={openCreate} className="gradient-primary text-primary-foreground gap-2 shadow-elegant">
                  <Plus className="h-4 w-4" /> {t("addNotice")}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId
                    ? (lang === "bn" ? "নোটিশ এডিট" : "Edit Notice")
                    : t("addNotice")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>শিরোনাম (বাংলা)</Label>
                  <Input value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label>Title (English)</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label>বিবরণ (বাংলা)</Label>
                  <Textarea rows={3} value={form.bodyBn} onChange={(e) => setForm({ ...form, bodyBn: e.target.value })} maxLength={500} />
                </div>
                <div className="space-y-1.5">
                  <Label>Body (English)</Label>
                  <Textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={500} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">{lang === "bn" ? "জরুরি হিসেবে চিহ্নিত করুন" : "Mark as important"}</span>
                  </div>
                  <Switch checked={form.important} onCheckedChange={(v) => setForm({ ...form, important: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>{t("cancel")}</Button>
                <Button className="gradient-primary text-primary-foreground" onClick={submit} disabled={submitting}>
                  {submitting ? "..." : t("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="grid gap-4">
          {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">{t("noData")}</div>
          )}
          {!loading && items.map((n) => (
            <div key={n.id} className="rounded-2xl bg-card border border-border p-5 shadow-soft hover:shadow-elegant transition-smooth">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${n.important ? "bg-destructive/15 text-destructive" : "bg-secondary text-primary"}`}>
                  {n.important ? <AlertTriangle className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{lang === "bn" ? n.title_bn : n.title}</h3>
                    {n.important && (
                      <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
                        {lang === "bn" ? "জরুরি" : "URGENT"}
                      </span>
                    )}
                  </div>
                  <NoticeBody text={lang === "bn" ? n.body_bn : n.body} lang={lang as "bn" | "en"} className="text-sm text-muted-foreground mt-1.5" />
                  <div className="text-xs text-muted-foreground mt-2">{n.date}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(n)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(n.id)} aria-label="Delete" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{lang === "bn" ? "নোটিশ মুছে ফেলবেন?" : "Delete notice?"}</AlertDialogTitle>
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
