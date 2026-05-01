import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Megaphone, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

type Notice = {
  id: string;
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  important: boolean;
  date: string;
};

export default function AdminNotices() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", titleBn: "", body: "", bodyBn: "", important: false });

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

  const submit = async () => {
    if (!form.titleBn.trim() || !form.bodyBn.trim()) {
      toast.error(lang === "bn" ? "শিরোনাম ও বিবরণ দিন" : "Title & body required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("notices").insert({
      title: form.title.trim() || form.titleBn.trim(),
      title_bn: form.titleBn.trim(),
      body: form.body.trim() || form.bodyBn.trim(),
      body_bn: form.bodyBn.trim(),
      important: form.important,
      date: new Date().toISOString().slice(0, 10),
      created_by: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "নোটিশ পোস্ট হয়েছে" : "Notice posted");
    setForm({ title: "", titleBn: "", body: "", bodyBn: "", important: false });
    setOpen(false);
    load();
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2 shadow-elegant">
                <Plus className="h-4 w-4" /> {t("addNotice")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{t("addNotice")}</DialogTitle></DialogHeader>
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
                  <p className="text-sm text-muted-foreground mt-1.5">{lang === "bn" ? n.body_bn : n.body}</p>
                  <div className="text-xs text-muted-foreground mt-2">{n.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
