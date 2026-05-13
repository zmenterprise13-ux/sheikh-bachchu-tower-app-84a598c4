import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LangContext";
import {
  Tag,
  Hash,
  Smartphone,
  Globe,
  Rocket,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { fetchAppReleases, INSTALLED_KEY, LEGACY_SEEN_KEY } from "@/lib/appRelease";

/** Extract numeric build number from a tag like "build-31" or "v1.2.3" → "31" / "1.2.3" */
function extractBuildNumber(tag: string | null): string {
  if (!tag) return "—";
  const m = tag.match(/\d+(?:\.\d+)*/);
  return m ? m[0] : tag;
}

export default function VersionInfo() {
  const { lang } = useLang();
  const installed =
    localStorage.getItem(INSTALLED_KEY) ||
    localStorage.getItem(LEGACY_SEEN_KEY);
  const buildNumber = extractBuildNumber(installed);

  const [latestTag, setLatestTag] = useState<string | null>(null);
  const [latestUrl, setLatestUrl] = useState<string | null>(null);
  const [latestRepo, setLatestRepo] = useState<string | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [nativeVersionName, setNativeVersionName] = useState<string | null>(null);
  const [nativeVersionCode, setNativeVersionCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        setNativeVersionName(info.version ?? null);
        setNativeVersionCode(String(info.build ?? ""));
      } catch {
        // web / not native — leave as null
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { release: latest } = await fetchAppReleases(1);
        if (latest) {
          setLatestTag(latest.tag_name);
          setLatestUrl(latest.html_url);
          setLatestRepo(latest.repository?.full_name ?? null);
        }
      } catch {
        // silent
      } finally {
        setLoadingLatest(false);
      }
    })();
  }, []);

  const isUpToDate = installed && latestTag && installed === latestTag;
  const platform =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? "iOS"
      : lang === "bn"
      ? "ওয়েব"
      : "Web";

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {lang === "bn" ? "ভার্সন তথ্য" : "Version info"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? "এই ডিভাইসে ইনস্টল করা অ্যাপের বর্তমান অবস্থা"
              : "Current state of this app on this device"}
          </p>
        </div>

        {/* Hero card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 shadow-elegant">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Rocket className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide opacity-80">
                {lang === "bn" ? "ইনস্টল করা ভার্সন" : "Installed version"}
              </p>
              <h2 className="text-3xl font-bold mt-1 font-mono">
                {installed || "—"}
              </h2>
              <p className="text-xs opacity-90 mt-1">
                {lang === "bn" ? "বিল্ড নম্বর" : "Build number"}:{" "}
                <span className="font-mono font-semibold">{buildNumber}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="rounded-2xl bg-card border border-border p-5 space-y-3 shadow-soft">
          <Row
            icon={<Tag className="h-4 w-4" />}
            label={lang === "bn" ? "ভার্সন ট্যাগ" : "Version tag"}
            value={installed || "—"}
            mono
          />
          <Row
            icon={<Hash className="h-4 w-4" />}
            label={lang === "bn" ? "বিল্ড নম্বর" : "Build number"}
            value={buildNumber}
            mono
          />
          <Row
            icon={<Tag className="h-4 w-4" />}
            label={lang === "bn" ? "ভার্সন নাম" : "versionName"}
            value={nativeVersionName || "—"}
            mono
          />
          <Row
            icon={<Hash className="h-4 w-4" />}
            label={lang === "bn" ? "ভার্সন কোড" : "versionCode"}
            value={nativeVersionCode || "—"}
            mono
          />
          <Row
            icon={<Smartphone className="h-4 w-4" />}
            label={lang === "bn" ? "প্ল্যাটফর্ম" : "Platform"}
            value={platform}
          />
          <Row
            icon={<Globe className="h-4 w-4" />}
            label={lang === "bn" ? "ভাষা" : "Language"}
            value={lang === "bn" ? "বাংলা" : "English"}
          />
          <Row
            icon={
              loadingLatest ? (
                <AlertCircle className="h-4 w-4 animate-pulse" />
              ) : isUpToDate ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )
            }
            label={lang === "bn" ? "সর্বশেষ রিলিজ" : "Latest release"}
            value={loadingLatest ? "…" : latestTag || "—"}
            mono
          />
          <Row
            icon={
              isUpToDate ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )
            }
            label={lang === "bn" ? "অবস্থা" : "Status"}
            value={
              !installed
                ? lang === "bn"
                  ? "অজানা"
                  : "Unknown"
                : isUpToDate
                ? lang === "bn"
                  ? "সর্বশেষ ভার্সনে আছেন"
                  : "Up to date"
                : lang === "bn"
                ? "নতুন আপডেট উপলব্ধ"
                : "Update available"
            }
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="gradient-primary text-primary-foreground gap-2 flex-1" size="lg">
            <Link to="/update">
              <Rocket className="h-4 w-4" />
              {lang === "bn" ? "আপডেট পেজে যান" : "Go to Update page"}
            </Link>
          </Button>
        </div>

        {/* Developer credit */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-4 sm:p-5 shadow-soft text-center">
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary mb-1.5">
            {lang === "bn" ? "ডেভেলপার" : "Developer"}
          </p>
          <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
            {lang === "bn"
              ? "এই অ্যাপটি ডেভেলপ করেছেন"
              : "This app is developed by"}
            {" — "}
            <span className="font-extrabold text-primary">মো. রবিন হোসেন</span>
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {lang === "bn" ? "সাধারণ সম্পাদক — শেখ বাচ্চু টাওয়ার" : "General Secretary — Sheikh Bachchu Tower"}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <a
              href="tel:01613458260"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/15 border border-primary/30 px-3 py-1 text-xs sm:text-sm font-bold text-primary tabular-nums transition-colors"
            >
              <Smartphone className="h-3.5 w-3.5" />
              01613458260
            </a>
            <a
              href={`https://wa.me/8801613458260?text=${encodeURIComponent(
                lang === "bn"
                  ? "আসসালামু আলাইকুম, শেখ বাচ্চু টাওয়ার অ্যাপ সম্পর্কে জানতে চাই।"
                  : "Assalamu Alaikum, I would like to know about the Sheikh Bachchu Tower app."
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-success/15 hover:bg-success/25 border border-success/40 px-3 py-1 text-xs sm:text-sm font-bold text-success transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span
        className={`font-medium text-foreground truncate ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
