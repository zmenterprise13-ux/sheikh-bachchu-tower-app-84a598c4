import { useLang } from "@/i18n/LangContext";
import { Users } from "lucide-react";
import faruk from "@/assets/committee/faruk.jpg";
import mofizul from "@/assets/committee/mofizul.jpg";
import robin from "@/assets/committee/robin.jpg";
import fazlul from "@/assets/committee/fazlul.jpg";
import humayun from "@/assets/committee/humayun.jpg";
import harun from "@/assets/committee/harun.jpg";
import abul from "@/assets/committee/abul.jpg";
import ronju from "@/assets/committee/ronju.jpg";
import sudhanya from "@/assets/committee/sudhanya.jpg";
import nahid from "@/assets/committee/nahid.jpg";
import nazrul from "@/assets/committee/nazrul.jpg";

type Member = {
  name_bn: string;
  name_en: string;
  role_bn: string;
  role_en: string;
  img: string;
  accent: string; // tailwind color class for ring/border
};

const members: Member[] = [
  { name_bn: "আলহাজ্ব মোঃ ফারুক হোসেন", name_en: "Alhaj Md. Faruk Hossain", role_bn: "সভাপতি", role_en: "President", img: faruk, accent: "from-amber-400 to-yellow-600" },
  { name_bn: "মোঃ মফিজুল ইসলাম", name_en: "Md. Mofizul Islam", role_bn: "সহ-সভাপতি", role_en: "Vice President", img: mofizul, accent: "from-sky-400 to-blue-600" },
  { name_bn: "মোঃ রবিন হোসেন", name_en: "Md. Robin Hossain", role_bn: "সাধারণ সম্পাদক", role_en: "General Secretary", img: robin, accent: "from-emerald-400 to-teal-600" },
  { name_bn: "ইঞ্জিঃ মোঃ ফজলুল করিম", name_en: "Engr. Md. Fazlul Karim", role_bn: "যুগ্ম সম্পাদক", role_en: "Joint Secretary", img: fazlul, accent: "from-fuchsia-400 to-purple-600" },
  { name_bn: "এড. মোঃ হুমায়ুন কবির", name_en: "Adv. Md. Humayun Kabir", role_bn: "কোষাধ্যক্ষ", role_en: "Treasurer", img: humayun, accent: "from-rose-400 to-pink-600" },
  { name_bn: "মোঃ হারুন-অর-রশিদ", name_en: "Md. Harun-or-Rashid", role_bn: "সহকারী কোষাধ্যক্ষ", role_en: "Assistant Treasurer", img: harun, accent: "from-orange-400 to-red-600" },
  { name_bn: "মোঃ আবুল হোসেন সেলিম", name_en: "Md. Abul Hossain Selim", role_bn: "সাংগঠনিক সম্পাদক", role_en: "Organizing Secretary", img: abul, accent: "from-cyan-400 to-sky-600" },
  { name_bn: "মোঃ রঞ্জু খান", name_en: "Md. Ronju Khan", role_bn: "সহঃ সাংগঠনিক সম্পাদক", role_en: "Asst. Organizing Secretary", img: ronju, accent: "from-lime-400 to-green-600" },
  { name_bn: "সুধন্য কুমার সরকার", name_en: "Sudhanya Kumar Sarkar", role_bn: "সদস্য", role_en: "Member", img: sudhanya, accent: "from-indigo-400 to-violet-600" },
  { name_bn: "মোঃ নাহিদ তালুকদার", name_en: "Md. Nahid Talukder", role_bn: "সদস্য", role_en: "Member", img: nahid, accent: "from-teal-400 to-emerald-600" },
  { name_bn: "মোঃ নজরুল ইসলাম সরকার", name_en: "Md. Nazrul Islam Sarkar", role_bn: "সদস্য", role_en: "Member", img: nazrul, accent: "from-amber-400 to-orange-600" },
];

export function CommitteeSection() {
  const { lang } = useLang();
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* decorative bg */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-3 py-1 text-xs font-medium text-primary">
            <Users className="h-3.5 w-3.5" />
            {lang === "bn" ? "কার্যকরী কমিটি" : "Executive Committee"}
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-foreground">
            {lang === "bn" ? "বাচ্চু টাওয়ার সোসাইটি" : "Bachchu Tower Society"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {lang === "bn"
              ? "আমাদের কার্যকরী কমিটির সম্মানিত সদস্যবৃন্দ"
              : "Our esteemed executive committee members"}
          </p>
        </div>

        <div
          className="mt-14 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          style={{ perspective: "1200px" }}
        >
          {members.map((m, i) => (
            <div
              key={m.name_en}
              className="group relative animate-fade-in"
              style={{
                animationDelay: `${i * 80}ms`,
                animationFillMode: "backwards",
                transformStyle: "preserve-3d",
              }}
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
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                }}
              >
                {/* gradient ring */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${m.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-md`} />

                {/* photo */}
                <div className="relative mx-auto" style={{ transform: "translateZ(40px)" }}>
                  <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${m.accent} opacity-70 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all`} />
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 border-card bg-muted">
                    <img
                      src={m.img}
                      alt={lang === "bn" ? m.name_bn : m.name_en}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                </div>

                {/* text */}
                <div className="relative mt-4 text-center" style={{ transform: "translateZ(60px)" }}>
                  <div className="font-bold text-foreground leading-tight text-[15px]">
                    {lang === "bn" ? m.name_bn : m.name_en}
                  </div>
                  <div className={`mt-1.5 inline-block rounded-full bg-gradient-to-r ${m.accent} px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm`}>
                    {lang === "bn" ? m.role_bn : m.role_en}
                  </div>
                </div>

                {/* shine */}
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
