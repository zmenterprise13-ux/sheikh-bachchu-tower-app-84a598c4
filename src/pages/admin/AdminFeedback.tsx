import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, CheckCircle2, Clock, Eye, Trash2, Phone } from "lucide-react";
import { toast } from "sonner";

type Item = {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
  submitter_role: string | null;
  created_at: string;
};

export default function AdminFeedback() {
  const { lang } = useLang();
  const { role } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const isAdmin = role === "admin";

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    setBusy(id);
    const { error } = await supabase.from("feedback").update({ status }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(t("আপডেট হয়েছে", "Updated"));
    load();
  };

  const sendReply = async (id: string) => {
    const reply = (replyDraft[id] || "").trim();
    if (!reply) return toast.error(t("উত্তর লিখুন", "Write a reply"));
    setBusy(id);
    const { error } = await supabase
      .from("feedback")
      .update({ admin_reply: reply, replied_at: new Date().toISOString(), status: "resolved" })
      .eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(t("উত্তর পাঠানো হয়েছে", "Reply sent"));
    setReplyDraft((d) => ({ ...d, [id]: "" }));
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t("মুছে ফেলবেন?", "Delete this feedback?"))) return;
    setBusy(id);
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(t("মুছে ফেলা হয়েছে", "Deleted"));
    load();
  };

  const catLabel = (c: string) => {
    const m: Record<string, [string, string]> = {
      suggestion: ["পরামর্শ", "Suggestion"],
      complaint: ["অভিযোগ", "Complaint"],
      praise: ["প্রশংসা", "Praise"],
      other: ["অন্যান্য", "Other"],
    };
    const v = m[c] ?? [c, c];
    return t(v[0], v[1]);
  };

  const statusBadge = (s: string) => {
    if (s === "resolved") return { icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-600", label: t("সমাধান", "Resolved") };
    if (s === "read") return { icon: Eye, cls: "bg-blue-500/15 text-blue-600", label: t("পঠিত", "Read") };
    return { icon: Clock, cls: "bg-amber-500/15 text-amber-600", label: t("নতুন", "New") };
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              {t("ইউজার মতামত", "User Feedback")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("ইউজারদের পাঠানো মতামত ও পরামর্শ ব্যবস্থাপনা", "Manage feedback sent by users")}
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("সব", "All")}</SelectItem>
              <SelectItem value="new">{t("নতুন", "New")}</SelectItem>
              <SelectItem value="read">{t("পঠিত", "Read")}</SelectItem>
              <SelectItem value="resolved">{t("সমাধান", "Resolved")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">
              {t("কোনো মতামত নেই", "No feedback")}
            </div>
          )}
          {!loading && items.map((it) => {
            const sb = statusBadge(it.status);
            const Icon = sb.icon;
            return (
              <div key={it.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {catLabel(it.category)}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${sb.cls}`}>
                        <Icon className="h-3 w-3" />{sb.label}
                      </span>
                      {it.submitter_role && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {it.submitter_role}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold mt-1.5 text-foreground">{it.subject}</h3>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{it.submitter_name || "—"}</span>
                      {it.submitter_phone && (
                        <a href={`tel:${it.submitter_phone}`} className="inline-flex items-center gap-1 text-primary">
                          <Phone className="h-3 w-3" />{it.submitter_phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(it.created_at).toLocaleString()}</span>
                </div>

                <p className="text-sm mt-3 whitespace-pre-wrap">{it.message}</p>

                {it.admin_reply && (
                  <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <div className="text-xs font-semibold text-primary mb-1">{t("পাঠানো উত্তর", "Reply sent")}</div>
                    <p className="text-sm whitespace-pre-wrap">{it.admin_reply}</p>
                  </div>
                )}

                <div className="mt-3 grid gap-2">
                  <Textarea
                    placeholder={t("উত্তর লিখুন...", "Write a reply...")}
                    value={replyDraft[it.id] ?? it.admin_reply ?? ""}
                    onChange={(e) => setReplyDraft((d) => ({ ...d, [it.id]: e.target.value.slice(0, 2000) }))}
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => sendReply(it.id)} disabled={busy === it.id} className="gap-1.5">
                      <Send className="h-3.5 w-3.5" />
                      {t("উত্তর পাঠান + সমাধান", "Reply + Resolve")}
                    </Button>
                    {it.status !== "read" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(it.id, "read")} disabled={busy === it.id}>
                        {t("পঠিত", "Mark read")}
                      </Button>
                    )}
                    {it.status !== "resolved" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(it.id, "resolved")} disabled={busy === it.id}>
                        {t("সমাধান", "Resolve")}
                      </Button>
                    )}
                    {it.status !== "new" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(it.id, "new")} disabled={busy === it.id}>
                        {t("নতুন হিসেবে রাখুন", "Mark new")}
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => remove(it.id)} disabled={busy === it.id}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
