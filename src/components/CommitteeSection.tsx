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

  // ---------- DESKTOP VIEW: 3D tilt grid ----------
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {Background}

      <div className="container">
        {Header}

        <div className="mt-14 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ perspective: "1200px" }}>
          {members.map((m, i) => (
            <div
              key={m.id}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards", transformStyle: "preserve-3d" }}
            >
              <div
                className="relative rounded-3xl bg-card border border-border p-5 shadow-soft transition-all duration-500 ease-out will-change-transform hover:-translate-y-2 hover:shadow-elegant"
                style={{ transformStyle: "preserve-3d" }}
                onMouseMove={(e) => {
                  const el = e.currentTarget;
                  const r = el.getBoundingClientRect();
                  const x = (e.clientX - r.left) / r.width - 0.5;
                  const y = (e.clientY - r.top) / r.height - 0.5;
                  el.style.transform = `translateY(-8px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
                }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${m.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-md`} />

                <div className="relative mx-auto" style={{ transform: "translateZ(40px)" }}>
                  <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${m.accent} opacity-70 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all`} />
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 border-card bg-muted">
                    {m.photo_url && (
                      <img
                        src={m.photo_url}
                        alt={lang === "bn" ? m.name_bn : m.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                </div>

                <div className="relative mt-4 text-center" style={{ transform: "translateZ(60px)" }}>
                  <div className="font-bold text-foreground leading-tight text-[15px]">
                    {lang === "bn" ? m.name_bn : m.name}
                  </div>
                  <div className={`mt-1.5 inline-block rounded-full bg-gradient-to-r ${m.accent} px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm`}>
                    {lang === "bn" ? m.role_bn : m.role}
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
                  <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1/4 group-hover:translate-y-1/4 transition-all duration-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
