import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Building2, LogIn, ArrowRight } from "lucide-react";
import heroImg from "@/assets/tower-hero.jpg";
import { NoticeTicker } from "@/components/NoticeTicker";
import { CommitteeSection } from "@/components/CommitteeSection";

export default function Index() {
  const { t, lang } = useLang();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "admin" ? "/admin" : "/owner", { replace: true });
    }
  }, [user, role, loading, navigate]);

  const features = [
    { icon: Building2, key: "flats" as const, desc: { bn: "৬০টি ফ্ল্যাট, পার্কিং ও ওনারের তথ্য", en: "60 flats, parking & owner records" } },
    { icon: Receipt,   key: "dues" as const,  desc: { bn: "প্রতি ১ তারিখে অটো বিল জেনারেশন", en: "Auto bill generation on the 1st" } },
    { icon: Wallet,    key: "expenses" as const, desc: { bn: "খাত ভিত্তিক মাসিক খরচ", en: "Category-wise monthly expenses" } },
    { icon: FileBarChart, key: "reports" as const, desc: { bn: "মাসিক আয়-ব্যায়ের পূর্ণ হিসাব", en: "Full monthly income–expense report" } },
    { icon: Megaphone, key: "notices" as const, desc: { bn: "ওনারদের জন্য জরুরি নোটিশ", en: "Important notices for owners" } },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar (lite) */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur border border-white/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight text-white">
              <div className="font-bold text-sm">{t("appName")}</div>
              <div className="text-[11px] opacity-90">{t("appTagline")}</div>
            </div>
          </div>
          <div className="ml-auto">
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Notice ticker pinned just under the header */}
      <div className="absolute top-16 inset-x-0 z-20">
        <NoticeTicker />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[100svh] flex items-center">
        {/* Background image with parallax-style scaling */}
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt=""
            width={1600}
            height={900}
            className="h-full w-full object-cover scale-110 animate-[fade-in_1.2s_ease-out]"
          />
          {/* Layered gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/60 to-accent/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
          {/* Decorative orbs */}
          <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative container py-20 sm:py-28 lg:py-32 text-primary-foreground w-full">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/30 px-4 py-1.5 text-xs font-medium shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {lang === "bn" ? "নতুন ম্যানেজমেন্ট ড্যাশবোর্ড" : "New management dashboard"}
            </div>

            <h1 className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] drop-shadow-2xl">
              <span className="bg-gradient-to-r from-white via-white to-accent bg-clip-text text-transparent">
                {t("appName")}
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-xl opacity-95 max-w-2xl mx-auto leading-relaxed">
              {lang === "bn"
                ? "সার্ভিস চার্জ আদায়, খরচের হিসাব ও মাসিক রিপোর্ট — এক জায়গায়, এক প্ল্যাটফর্মে।"
                : "Service charge collection, expense tracking and monthly reports — all in one platform."}
            </p>

            <div className="mt-10 flex flex-wrap gap-3 justify-center">
              <Link to="/auth">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow gap-2 px-7 h-12 text-base font-semibold">
                  <LogIn className="h-5 w-5" />
                  {lang === "bn" ? "লগইন / সাইন আপ" : "Log in / Sign up"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Stats pills */}
            <div className="mt-12 grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
              {[
                { icon: "🏢", label: lang === "bn" ? "ফ্ল্যাট" : "Flats", value: "৬০+" },
                { icon: "🅿️", label: lang === "bn" ? "পার্কিং" : "Parking", value: "✓" },
                { icon: "📊", label: lang === "bn" ? "রিপোর্ট" : "Reports", value: lang === "bn" ? "মাসিক" : "Monthly" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-3 py-3 sm:px-4 sm:py-4 hover:bg-white/15 transition-all hover:-translate-y-0.5"
                >
                  <div className="text-2xl sm:text-3xl mb-1">{s.icon}</div>
                  <div className="text-base sm:text-lg font-bold">{s.value}</div>
                  <div className="text-[10px] sm:text-xs opacity-80">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      <CommitteeSection />

      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground space-y-1">
          <div>
            {lang === "bn" ? "ডিজাইন ও ডেভেলপ করেছেন" : "Designed & developed by"}{" "}
            <span className="font-semibold text-foreground">
              {lang === "bn" ? "মো. রবিন হোসেন" : "Md. Robin Hossain"}
            </span>
          </div>
          <div>
            © {new Date().getFullYear()} {t("appName")} · {t("appTagline")}
          </div>
        </div>
      </footer>
    </div>
  );
}
