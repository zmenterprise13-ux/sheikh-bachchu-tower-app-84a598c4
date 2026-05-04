import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LangContext";
import { Users, Sparkles, Phone, MessageCircle, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
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
  flat_id: string | null;
  flats?: { phone: string | null; owner_photo_url: string | null } | null;
};

export function CommitteeSection() {
  const { lang } = useLang();
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("committee_members")
        .select("id, name, name_bn, role, role_bn, photo_url, accent, bio, bio_bn, phone, flat_id, flats(phone, owner_photo_url)")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      // Resolve effective phone & photo, then hide members with no phone number
      const enriched = ((data ?? []) as any[])
        .map((m) => ({
          ...m,
          phone: (m.flats?.phone || m.phone || "").trim() || null,
          photo_url: m.photo_url || m.flats?.owner_photo_url || null,
        }))
        .filter((m) => !!m.phone) as Member[];
      if (active) setMembers(enriched);
    })();
    return () => { active = false; };
  }, []);

  if (members.length === 0) return null;

  const Header = (
    <div className="text-center max-w-2xl mx-auto px-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {lang === "bn" ? "কার্যকরী কমিটি" : "Executive Committee"}
      </div>
      <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-foreground">
        {lang === "bn" ? "বাচ্চু টাওয়ার সোসাইটি" : "Bachchu Tower Society"}
      </h2>
      <p className="mt-3 text-muted-foreground text-sm sm:text-base">
        {lang === "bn"
          ? "আমাদের কার্যকরী কমিটির সম্মানিত সদস্যবৃন্দ"
          : "Our esteemed executive committee members"}
      </p>
    </div>
  );

  const Background = (
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
    </div>
  );

  // ---------- MOBILE VIEW: horizontal snap carousel ----------
  if (isMobile) {
    return (
      <>
      <MemberModal m={selected} lang={lang} onClose={() => setSelected(null)} />
      <section className="relative overflow-hidden py-14">
        {Background}
        {Header}

        <div className="mt-8 -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-4 pb-4">
            {members.map((m, i) => (
              <div
                key={m.id}
                className="snap-center shrink-0 w-[78%] max-w-[300px] animate-fade-in"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
              >
                <button type="button" onClick={() => setSelected(m)} className="block w-full text-left relative rounded-3xl bg-card border border-border shadow-soft overflow-hidden active:scale-[0.98] transition-transform">
                  <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${m.accent} opacity-90`} />
                  <div className="relative pt-8 px-5">
                    <div className="mx-auto w-28 h-28 rounded-full ring-4 ring-card overflow-hidden bg-muted shadow-lg">
                      {m.photo_url ? (
                        <img
                          src={m.photo_url}
                          alt={lang === "bn" ? m.name_bn : m.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Users className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-5 pb-6 pt-4 text-center">
                    <div className="font-bold text-foreground text-base leading-tight">
                      {lang === "bn" ? m.name_bn : m.name}
                    </div>
                    <div className={`mt-2 inline-block rounded-full bg-gradient-to-r ${m.accent} px-3 py-1 text-[11px] font-semibold text-white shadow-sm`}>
                      {lang === "bn" ? m.role_bn : m.role}
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-1.5 mt-2">
          {members.slice(0, Math.min(members.length, 8)).map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
          ))}
        </div>
      </section>
      </>
    );
  }

  return (
    <>
    <MemberModal m={selected} lang={lang} onClose={() => setSelected(null)} />
    <section className="relative overflow-hidden py-20 sm:py-28">
      {Background}

      <div className="container">
        {Header}

        <div className="mt-16 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <div
              key={m.id}
              onClick={() => setSelected(m)}
              className="group relative animate-fade-in cursor-pointer"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
            >
              {/* Floating gradient backdrop */}
              <div className={`absolute -inset-2 rounded-[2rem] bg-gradient-to-br ${m.accent} opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500`} />

              {/* Card */}
              <div className="relative rounded-[1.75rem] bg-card border border-border overflow-hidden shadow-soft transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-elegant">
                {/* Top accent bar */}
                <div className={`h-2 bg-gradient-to-r ${m.accent}`} />

                {/* Photo container with gradient ring */}
                <div className="relative pt-8 pb-4 px-6">
                  <div className="relative mx-auto w-32 h-32">
                    {/* Spinning gradient ring */}
                    <div
                      className={`absolute -inset-1.5 rounded-full bg-gradient-to-br ${m.accent} opacity-80 group-hover:opacity-100 transition-opacity`}
                      style={{ background: undefined }}
                    />
                    <div className="absolute inset-0 rounded-full overflow-hidden ring-4 ring-card bg-muted">
                      {m.photo_url ? (
                        <img
                          src={m.photo_url}
                          alt={lang === "bn" ? m.name_bn : m.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Users className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    {/* Decorative dot */}
                    <div className={`absolute bottom-1 right-1 h-5 w-5 rounded-full bg-gradient-to-br ${m.accent} ring-4 ring-card shadow-md`} />
                  </div>
                </div>

                {/* Info */}
                <div className="px-5 pb-6 text-center">
                  <h3 className="font-bold text-foreground text-base leading-tight min-h-[2.5rem] flex items-center justify-center">
                    {lang === "bn" ? m.name_bn : m.name}
                  </h3>
                  <div className={`mt-2 inline-block rounded-full bg-gradient-to-r ${m.accent} px-3 py-1 text-[11px] font-semibold text-white shadow-sm`}>
                    {lang === "bn" ? m.role_bn : m.role}
                  </div>
                  <div className="mt-3 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {lang === "bn" ? "বিস্তারিত দেখুন →" : "View details →"}
                  </div>
                </div>

                {/* Shine */}
                <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] overflow-hidden">
                  <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1/4 group-hover:translate-y-1/4 transition-all duration-1000" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}

function MemberModal({ m, lang, onClose }: { m: Member | null; lang: "bn" | "en"; onClose: () => void }) {
  const bio = m ? (lang === "bn" ? m.bio_bn : m.bio) : null;
  const fullName = m ? (lang === "bn" ? m.name_bn : m.name) : "";
  const role = m ? (lang === "bn" ? m.role_bn : m.role) : "";
  const phone = m?.phone?.trim();
  const cleanPhone = phone?.replace(/[^\d+]/g, "");

  return (
    <Dialog open={!!m} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border-0 shadow-elegant">
        {m && (
          <>
            {/* Header banner */}
            <div className={`relative h-44 bg-gradient-to-br ${m.accent} overflow-hidden`}>
              {m.photo_url && (
                <img
                  src={m.photo_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm scale-110"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
              {/* Decorative orbs */}
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            </div>

            {/* Avatar overlapping banner */}
            <div className="px-6 -mt-16 relative">
              <div className="relative mx-auto w-28 h-28">
                <div className={`absolute -inset-1 rounded-full bg-gradient-to-br ${m.accent} blur-md opacity-70`} />
                <div className="relative w-28 h-28 rounded-full ring-4 ring-background overflow-hidden bg-muted shadow-xl">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Users className="h-10 w-10" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name & role */}
              <div className="mt-4 text-center">
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                  {fullName}
                </h2>
                <div className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${m.accent} px-3.5 py-1 text-xs font-bold text-white shadow-md`}>
                  <Sparkles className="h-3 w-3" />
                  {role}
                </div>
              </div>
            </div>

            {/* Bio block */}
            <div className="px-6 mt-5">
              {bio ? (
                <div className="relative rounded-2xl bg-muted/50 border border-border p-4 pl-10">
                  <Quote className={`absolute top-3 left-3 h-5 w-5 text-transparent bg-gradient-to-br ${m.accent} bg-clip-text`} fill="currentColor" />
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                    {bio}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground italic">
                  {lang === "bn" ? "এই সদস্যের বায়ো এখনো যোগ করা হয়নি" : "No bio added yet for this member"}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-6 mt-5 grid grid-cols-2 gap-2.5">
              {cleanPhone ? (
                <>
                  <a
                    href={`tel:${cleanPhone}`}
                    className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${m.accent} text-white px-4 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all`}
                  >
                    <Phone className="h-4 w-4" />
                    {lang === "bn" ? "কল" : "Call"}
                  </a>
                  <a
                    href={`sms:${cleanPhone}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-card border border-border text-foreground px-4 py-2.5 text-sm font-semibold hover:bg-muted hover:-translate-y-0.5 transition-all"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {lang === "bn" ? "মেসেজ" : "Message"}
                  </a>
                </>
              ) : (
                <div className="col-span-2 rounded-xl bg-muted/40 border border-dashed border-border px-4 py-2.5 text-center text-xs text-muted-foreground">
                  {lang === "bn" ? "যোগাযোগের নম্বর নেই" : "No contact number available"}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
