import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Users, Sparkles, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Member = {
  id: string;
  name: string;
  name_bn: string;
  role: string;
  role_bn: string;
  photo_url: string | null;
  accent: string;
  bio: string | null;
  bio_bn: string | null;
  phone: string | null;
  category?: string;
};

export default function OwnerCommittee() {
  const { lang } = useLang();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Member | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_published_committee");
      if (!active) return;
      setMembers((data ?? []) as Member[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const advisors = members.filter(m => m.category === "advisor");
  const committee = members.filter(m => m.category !== "advisor");

  const renderMemberCard = (m: Member) => (
    <button
      key={m.id}
      type="button"
      onClick={() => setSelected(m)}
      className="group relative overflow-hidden rounded-2xl bg-card border border-border p-3 text-left shadow-soft transition-all hover:shadow-elegant hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${m.accent}`} />
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className={`absolute -inset-0.5 rounded-full bg-gradient-to-br ${m.accent} opacity-70 blur-sm`} />
          <div className="relative h-14 w-14 rounded-full ring-2 ring-card overflow-hidden bg-muted">
            {m.photo_url ? (
              <img src={m.photo_url} alt={lang === "bn" ? m.name_bn : m.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-foreground leading-tight truncate">
            {lang === "bn" ? m.name_bn : m.name}
          </div>
          <div className={`mt-1 inline-block rounded-full bg-gradient-to-r ${m.accent} px-2 py-0.5 text-[10px] font-semibold text-white`}>
            {lang === "bn" ? m.role_bn : m.role}
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {lang === "bn" ? "উপদেষ্টা ও কমিটি" : "Advisors & Committee"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn" ? "উপদেষ্টা ও কার্যকরী কমিটির সদস্যদের তালিকা" : "Advisors and executive committee members"}
          </p>
        </div>

        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        )}

        {!loading && advisors.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> {lang === "bn" ? "উপদেষ্টা পরিষদ" : "Advisory Council"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {advisors.map(renderMemberCard)}
            </div>
          </section>
        )}

        {!loading && committee.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> {lang === "bn" ? "কার্যকরী কমিটি" : "Executive Committee"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {committee.map(renderMemberCard)}
            </div>
          </section>
        )}

        {!loading && advisors.length === 0 && committee.length === 0 && (
          <div className="rounded-2xl bg-card border border-border p-12 text-center text-sm text-muted-foreground">
            {lang === "bn" ? "কোনো সদস্য নেই" : "No members"}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
          {selected && (
            <>
              <div className={`relative h-32 bg-gradient-to-br ${selected.accent}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              </div>
              <div className="px-6 -mt-14 relative">
                <div className="mx-auto h-24 w-24 rounded-full ring-4 ring-background overflow-hidden bg-muted shadow-lg">
                  {selected.photo_url ? (
                    <img src={selected.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Users className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="text-center mt-3">
                  <h2 className="text-xl font-bold text-foreground">{lang === "bn" ? selected.name_bn : selected.name}</h2>
                  <div className={`mt-1.5 inline-block rounded-full bg-gradient-to-r ${selected.accent} px-3 py-1 text-xs font-semibold text-white`}>
                    {lang === "bn" ? selected.role_bn : selected.role}
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                {(lang === "bn" ? selected.bio_bn : selected.bio) ? (
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{lang === "bn" ? selected.bio_bn : selected.bio}</p>
                ) : (
                  <div className="text-center text-xs text-muted-foreground italic">
                    {lang === "bn" ? "বায়ো নেই" : "No bio"}
                  </div>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`} className={`mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${selected.accent} text-white px-4 py-2.5 text-sm font-semibold`}>
                    <Phone className="h-4 w-4" /> {selected.phone}
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
