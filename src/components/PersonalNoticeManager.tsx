import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, AlertTriangle, Loader2, Search, Users, BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { NoticeBody } from "@/components/NoticeBody";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Flat = {
  id: string;
  flat_no: string;
  owner_name: string | null;
  owner_name_bn: string | null;
  owner_user_id: string | null;
};

type BatchRow = {
  batch_id: string;
  title: string;
  title_bn: string | null;
  body: string;
  body_bn: string | null;
  important: boolean;
  created_at: string;
  recipients: { flat_no: string; read_at: string | null }[];
};

const emptyForm = { title: "", titleBn: "", body: "", bodyBn: "", important: false };

export function PersonalNoticeManager() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [deleteBatchId, setDeleteBatchId] = useState<string | null>(null);

  const loadFlats = async () => {
    const { data, error } = await supabase
      .from("flats")
      .select("id, flat_no, owner_name, owner_name_bn, owner_user_id")
      .order("flat_no", { ascending: true });
    if (error) toast.error(error.message);
    setFlats((data ?? []) as Flat[]);
  };

  const loadBatches = async () => {
    setLoadingBatches(true);
    const { data, error } = await supabase
      .from("personal_notices")
      .select("id, batch_id, title, title_bn, body, body_bn, important, created_at, read_at, flat_id")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setLoadingBatches(false);
      return;
    }
    const rows = (data ?? []) as any[];
    const flatIds = Array.from(new Set(rows.map((r) => r.flat_id))) as string[];
    const flatMap = new Map<string, string>();
    if (flatIds.length > 0) {
      const { data: fs } = await supabase
        .from("flats")
        .select("id, flat_no")
        .in("id", flatIds);
      (fs ?? []).forEach((f: any) => flatMap.set(f.id, f.flat_no));
    }
    const map = new Map<string, BatchRow>();
    for (const r of rows) {
      const key = r.batch_id;
      if (!map.has(key)) {
        map.set(key, {
          batch_id: r.batch_id,
          title: r.title,
          title_bn: r.title_bn,
          body: r.body,
          body_bn: r.body_bn,
          important: r.important,
          created_at: r.created_at,
          recipients: [],
        });
      }
      map.get(key)!.recipients.push({
        flat_no: flatMap.get(r.flat_id) ?? "—",
        read_at: r.read_at,
      });
    }
    setBatches(Array.from(map.values()));
    setLoadingBatches(false);
  };

  useEffect(() => {
    loadFlats();
    loadBatches();
  }, []);

  const filteredFlats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flats;
    return flats.filter((f) =>
      [f.flat_no, f.owner_name, f.owner_name_bn]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q))
    );
  }, [flats, search]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selected);
    filteredFlats.forEach((f) => next.add(f.id));
    setSelected(next);
  };

  const clearAll = () => setSelected(new Set());

  const submit = async () => {
    if (selected.size === 0) {
      toast.error(lang === "bn" ? "অন্তত একটি ফ্ল্যাট বেছে নিন" : "Select at least one flat");
      return;
    }
    if (!form.titleBn.trim() && !form.title.trim()) {
      toast.error(lang === "bn" ? "শিরোনাম দিন" : "Title required");
      return;
    }
    if (!form.bodyBn.trim() && !form.body.trim()) {
      toast.error(lang === "bn" ? "বার্তা দিন" : "Message required");
      return;
    }
    setSubmitting(true);
    const batch_id = crypto.randomUUID();
    const rows = Array.from(selected).map((flat_id) => ({
      batch_id,
      flat_id,
      title: form.title.trim() || form.titleBn.trim(),
      title_bn: form.titleBn.trim() || null,
      body: form.body.trim() || form.bodyBn.trim(),
      body_bn: form.bodyBn.trim() || null,
      important: form.important,
      created_by: user?.id ?? null,
    }));
    const { error } = await supabase.from("personal_notices").insert(rows);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      lang === "bn"
        ? `${rows.length}টি ফ্ল্যাটে বার্তা পাঠানো হয়েছে`
        : `Sent to ${rows.length} flat${rows.length > 1 ? "s" : ""}`
    );
    setForm(emptyForm);
    setSelected(new Set());
    setOpen(false);
    loadBatches();
  };

  const confirmDelete = async () => {
    if (!deleteBatchId) return;
    const { error } = await supabase
      .from("personal_notices")
      .delete()
      .eq("batch_id", deleteBatchId);
    if (error) toast.error(error.message);
    else {
      toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted");
      loadBatches();
    }
    setDeleteBatchId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            {lang === "bn" ? "ব্যক্তিগত বার্তা" : "Personal messages"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lang === "bn"
              ? "নির্দিষ্ট ফ্ল্যাট ওনারদের কাছে কাস্টম বার্তা পাঠান"
              : "Send custom messages to specific flat owners"}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary text-primary-foreground shadow-elegant">
              <Send className="h-4 w-4" />
              {lang === "bn" ? "ব্যক্তিগত বার্তা পাঠান" : "Send personal message"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {lang === "bn" ? "ফ্ল্যাট ওনারকে বার্তা পাঠান" : "Send message to flat owner(s)"}
              </DialogTitle>
            </DialogHeader>

            <div className="overflow-y-auto pr-1 space-y-4">
              {/* Recipients */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {lang === "bn" ? "প্রাপক" : "Recipients"}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({lang === "bn" ? `${selected.size}টি নির্বাচিত` : `${selected.size} selected`})
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={selectAllVisible}>
                      {lang === "bn" ? "সব নির্বাচন" : "Select visible"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
                      {lang === "bn" ? "মুছুন" : "Clear"}
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={lang === "bn" ? "ফ্ল্যাট নং বা নাম দিয়ে খুঁজুন" : "Search by flat or name"}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <ScrollArea className="h-56 rounded-lg border border-border">
                  <div className="p-1">
                    {filteredFlats.map((f) => {
                      const checked = selected.has(f.id);
                      const name = lang === "bn"
                        ? (f.owner_name_bn || f.owner_name || "—")
                        : (f.owner_name || f.owner_name_bn || "—");
                      return (
                        <label
                          key={f.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-accent/50 ${
                            checked ? "bg-primary/10" : ""
                          }`}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggle(f.id)} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground">{f.flat_no}</div>
                            <div className="text-xs text-muted-foreground truncate">{name}</div>
                          </div>
                          {!f.owner_user_id && (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {lang === "bn" ? "অ্যাকাউন্ট নেই" : "no account"}
                            </span>
                          )}
                        </label>
                      );
                    })}
                    {filteredFlats.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground p-6">
                        {lang === "bn" ? "কোনো ফ্ল্যাট পাওয়া যায়নি" : "No flats found"}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Form */}
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
                  <Label>বার্তা (বাংলা)</Label>
                  <Textarea rows={3} value={form.bodyBn} onChange={(e) => setForm({ ...form, bodyBn: e.target.value })} maxLength={1000} />
                </div>
                <div className="space-y-1.5">
                  <Label>Message (English)</Label>
                  <Textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={1000} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">{lang === "bn" ? "জরুরি হিসেবে চিহ্নিত করুন" : "Mark as important"}</span>
                  </div>
                  <Switch checked={form.important} onCheckedChange={(v) => setForm({ ...form, important: v })} />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                {lang === "bn" ? "বাতিল" : "Cancel"}
              </Button>
              <Button
                className="gradient-primary text-primary-foreground gap-2"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {lang === "bn" ? "পাঠান" : "Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sent batches list */}
      <div className="grid gap-3">
        {loadingBatches && Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
        {!loadingBatches && batches.length === 0 && (
          <div className="rounded-2xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">
            {lang === "bn" ? "এখনো কোনো ব্যক্তিগত বার্তা পাঠানো হয়নি" : "No personal messages sent yet"}
          </div>
        )}
        {!loadingBatches && batches.map((b) => {
          const readCount = b.recipients.filter((r) => r.read_at).length;
          return (
            <div key={b.batch_id} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                  b.important ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                }`}>
                  {b.important ? <AlertTriangle className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">
                      {lang === "bn" ? (b.title_bn || b.title) : (b.title || b.title_bn)}
                    </h3>
                    {b.important && (
                      <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
                        {lang === "bn" ? "জরুরি" : "URGENT"}
                      </span>
                    )}
                  </div>
                  <NoticeBody
                    text={lang === "bn" ? (b.body_bn || b.body) : (b.body || b.body_bn || "")}
                    lang={lang as "bn" | "en"}
                    className="text-sm text-muted-foreground mt-1.5"
                  />
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                    <span>{new Date(b.created_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}</span>
                    <span>•</span>
                    <span>
                      {lang === "bn"
                        ? `${b.recipients.length}টি ফ্ল্যাট • ${readCount}টি পঠিত`
                        : `${b.recipients.length} flats • ${readCount} read`}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {b.recipients.slice(0, 12).map((r, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          r.read_at
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                        title={r.read_at ? "Read" : "Unread"}
                      >
                        {r.flat_no}
                      </span>
                    ))}
                    {b.recipients.length > 12 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-muted text-muted-foreground">
                        +{b.recipients.length - 12}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteBatchId(b.batch_id)}
                  className="text-destructive hover:text-destructive shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteBatchId} onOpenChange={(v) => !v && setDeleteBatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "bn" ? "এই বার্তা মুছে ফেলবেন?" : "Delete this message?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "bn"
                ? "সব প্রাপকের কাছ থেকে এটি সরিয়ে ফেলা হবে। এই কাজটি ফিরিয়ে আনা যাবে না।"
                : "It will be removed from all recipients. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "bn" ? "বাতিল" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {lang === "bn" ? "মুছুন" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
