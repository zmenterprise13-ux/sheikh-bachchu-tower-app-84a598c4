import { Link } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Building2, LogIn, Receipt, Wallet, FileBarChart, Megaphone, ArrowRight } from "lucide-react";
import heroImg from "@/assets/tower-hero.jpg";

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

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" width={1600} height={900} className="h-full w-full object-cover" />
          <div className="absolute inset-0 gradient-hero opacity-90" />
        </div>

        <div className="relative container py-24 sm:py-32 lg:py-40 text-primary-foreground">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              {lang === "bn" ? "নতুন ম্যানেজমেন্ট ড্যাশবোর্ড" : "New management dashboard"}
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {t("appName")}
            </h1>
            <p className="mt-3 text-lg sm:text-xl opacity-90 max-w-xl">
              {lang === "bn"
                ? "সার্ভিস চার্জ আদায়, খরচের হিসাব ও মাসিক রিপোর্ট — এক জায়গায়।"
                : "Service charge collection, expense tracking and monthly reports — all in one place."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow gap-2">
                  <LogIn className="h-4 w-4" />
                  {lang === "bn" ? "লগইন / সাইন আপ" : "Log in / Sign up"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-90">
              <span>🏢 {lang === "bn" ? "৬০টি ফ্ল্যাট" : "60 Flats"}</span>
              <span>🅿️ {lang === "bn" ? "পার্কিং ম্যানেজমেন্ট" : "Parking Management"}</span>
              <span>📊 {lang === "bn" ? "মাসিক রিপোর্ট" : "Monthly Reports"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            {lang === "bn" ? "যা যা আছে" : "Everything you need"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {lang === "bn"
              ? "বিল্ডিং পরিচালনার সব দিক একটি প্ল্যাটফর্মে।"
              : "Every aspect of building management on a single platform."}
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, key, desc }) => (
            <div key={key} className="group rounded-2xl gradient-card border border-border p-6 shadow-soft hover:shadow-elegant hover:-translate-y-0.5 transition-smooth">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-glow group-hover:scale-110 transition-base">
                <Icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{t(key)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc[lang]}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {t("appName")} · {t("appTagline")}
        </div>
      </footer>
    </div>
  );
}
