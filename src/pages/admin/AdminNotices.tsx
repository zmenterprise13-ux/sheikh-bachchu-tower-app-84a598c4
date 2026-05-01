import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { NOTICES, Notice } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Megaphone, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AdminNotices() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<Notice[]>(NOTICES);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", titleBn: "", body: "", bodyBn: "", important: false });

  const submit = () => {
    if (!form.titleBn.trim() || !form.bodyBn.trim()) {
      toast.error(lang === "bn" ? "শিরোনাম ও বিবরণ দিন" : "Title & body required");
      return;
    }
    setItems(prev => [{
      id: `n-${Date.now()}`,
      title: form.title.trim() || form.titleBn.trim(),
      titleBn: form.titleBn.trim(),
      body: form.body.trim() || form.bodyBn.trim(),
      bodyBn: form.bodyBn.trim(),
      date: new Date().toISOString().slice(0, 10),
      important: form.important,
    }, ...prev]);
    setForm({ title: "", titleBn: "", body: "", bodyBn: "", important: false });
    setOpen(false);
    toast.success(lang === "bn" ? "নোটিশ পোস্ট হয়েছে" : "Notice posted");
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
                  <Input value={form.titleBn} onChange={e => setForm({...form, titleBn: e.target.value})} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label>Title (English)</Label>
                  <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label>বিবরণ (বাংলা)</Label>
                  <Textarea rows={3} value={form.bodyBn} onChange={e => setForm({...form, bodyBn: e.target.value})} maxLength={500} />
                </div>
                <div className="space-y-1.5">
                  <Label>Body (English)</Label>
                  <Textarea rows={3} value={form.body} onChange={e => setForm({...form, body: e.target.value})} maxLength={500} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">{lang === "bn" ? "জরুরি হিসেবে চিহ্নিত করুন" : "Mark as important"}</span>
                  </div>
                  <Switch checked={form.important} onCheckedChange={v => setForm({...form, important: v})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                <Button className="gradient-primary text-primary-foreground" onClick={submit}>{t("save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {items.map(n => (
            <div key={n.id} className="rounded-2xl bg-card border border-border p-5 shadow-soft hover:shadow-elegant transition-smooth">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${n.important ? "bg-destructive/15 text-destructive" : "bg-secondary text-primary"}`}>
                  {n.important ? <AlertTriangle className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{lang === "bn" ? n.titleBn : n.title}</h3>
                    {n.important && (
                      <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
                        {lang === "bn" ? "জরুরি" : "URGENT"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">{lang === "bn" ? n.bodyBn : n.body}</p>
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
