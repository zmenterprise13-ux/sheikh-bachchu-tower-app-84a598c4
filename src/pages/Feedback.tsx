import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, CheckCircle2, Clock, Eye } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  category: z.enum(["suggestion", "complaint", "praise", "other"]),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(5).max(2000),
});

type Item = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export default function Feedback() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [category, setCategory] = useState<"suggestion" | "complaint" | "praise" | "other">("suggestion");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feedback")
      .select("id,category,subject,message,status,admin_reply,replied_at,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    const parsed = schema.safeParse({ category, subject, message });
    if (!parsed.success) {
      toast.error(t("বিষয় ও বার্তা সঠিকভাবে লিখুন", "Please fill subject and message correctly"));
      return;
    }
    if (!user) return;
    setSubmitting(true);

    // fetch profile snapshot
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name,display_name_bn,phone")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      message: parsed.data.message,
      submitter_name: prof?.display_name_bn || prof?.display_name || user.email,
      submitter_phone: prof?.phone ?? null,
      submitter_role: roleRow?.role ?? null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("মতামত পাঠানো হয়েছে। ধন্যবাদ!", "Feedback sent. Thank you!"));
    setSubject(""); setMessage(""); setCategory("suggestion");
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
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("মতামত ও পরামর্শ", "Feedback & Suggestions")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("আপনার মতামত, অভিযোগ বা পরামর্শ অ্যাডমিনকে জানান।", "Share your feedback, complaints or suggestions with admin.")}
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">{t("নতুন মতামত পাঠান", "Send new feedback")}</h2>
          </div>

          <div className="grid gap-3">
            <div>
              <Label>{t("ধরন", "Category")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggestion">{catLabel("suggestion")}</SelectItem>
                  <SelectItem value="complaint">{catLabel("complaint")}</SelectItem>
                  <SelectItem value="praise">{catLabel("praise")}</SelectItem>
                  <SelectItem value="other">{catLabel("other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("বিষয়", "Subject")}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 150))}
                placeholder={t("সংক্ষেপে বিষয়", "Brief subject")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>{t("বার্তা", "Message")}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                placeholder={t("আপনার মতামত বিস্তারিত লিখুন...", "Write your feedback in detail...")}
                rows={5}
                className="mt-1.5"
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">{message.length}/2000</div>
            </div>
            <Button onClick={submit} disabled={submitting} className="gap-2 w-full sm:w-auto">
              <Send className="h-4 w-4" />
              {submitting ? t("পাঠানো হচ্ছে...", "Sending...") : t("পাঠান", "Send")}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">{t("আমার পাঠানো মতামত", "My feedback")}</h2>
          {loading && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">
              {t("এখনো কোনো মতামত পাঠাননি", "No feedback sent yet")}
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
                    </div>
                    <h3 className="font-semibold mt-1.5 text-foreground">{it.subject}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(it.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{it.message}</p>
                {it.admin_reply && (
                  <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <div className="text-xs font-semibold text-primary mb-1">{t("অ্যাডমিনের উত্তর", "Admin reply")}</div>
                    <p className="text-sm whitespace-pre-wrap">{it.admin_reply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
