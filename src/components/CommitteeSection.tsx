import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LangContext";
import { Users, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

type Member = {
  id: string;
  name: string;
  name_bn: string;
  role: string;
  role_bn: string;
  photo_url: string | null;
  accent: string;
};

export function CommitteeSection() {
  const { lang } = useLang();
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("committee_members")
        .select("id, name, name_bn, role, role_bn, photo_url, accent")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (active) setMembers((data ?? []) as Member[]);
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
                <div className="relative rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
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
                </div>
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
    );
  }

  // ---------- DESKTOP VIEW: hover-expand horizontal panels ----------
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {Background}

      <div className="container">
        {Header}

        <div className="mt-14 flex gap-3 h-[460px] w-full">
          {members.map((m, i) => (
            <div
              key={m.id}
              className="group relative flex-1 hover:flex-[3] transition-all duration-700 ease-out rounded-3xl overflow-hidden cursor-pointer shadow-soft hover:shadow-elegant animate-fade-in border border-border"
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
            >
              {/* Image */}
              <div className="absolute inset-0 bg-muted">
                {m.photo_url && (
                  <img
                    src={m.photo_url}
                    alt={lang === "bn" ? m.name_bn : m.name}
                    className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    loading="lazy"
                  />
                )}
              </div>

              {/* Accent gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${m.accent} opacity-60 group-hover:opacity-30 transition-opacity duration-700`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Collapsed: vertical role badge */}
              <div className="absolute inset-x-0 bottom-0 p-4 text-center group-hover:opacity-0 transition-opacity duration-300">
                <div className="text-white font-bold text-sm [writing-mode:vertical-rl] rotate-180 mx-auto h-32 flex items-center justify-center tracking-wider">
                  {lang === "bn" ? m.name_bn : m.name}
                </div>
              </div>

              {/* Expanded: full info */}
              <div className="absolute inset-x-0 bottom-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200 translate-y-4 group-hover:translate-y-0">
                <div className={`inline-block rounded-full bg-gradient-to-r ${m.accent} px-3 py-1 text-[11px] font-semibold text-white shadow-md mb-2`}>
                  {lang === "bn" ? m.role_bn : m.role}
                </div>
                <div className="text-white font-bold text-2xl leading-tight drop-shadow-lg">
                  {lang === "bn" ? m.name_bn : m.name}
                </div>
              </div>

              {/* Shine */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] bg-gradient-to-br from-white/0 via-white/15 to-white/0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1/4 group-hover:translate-y-1/4 transition-all duration-1000" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
