import { ReactNode, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Rocket, Download as DownloadIcon, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LangContext";
import {
  AppRelease,
  fetchAppReleases,
  getInstalledReleaseId,
  getInstalledTag,
  getReleaseApk,
  getReleaseId,
  markReleaseDownloaded,
} from "@/lib/appRelease";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

function compareVersions(a: string, b: string): number {
  const parse = (s: string) => (s.match(/\d+/g) ?? []).map((n) => parseInt(n, 10));
  const av = parse(a);
  const bv = parse(b);
  if (av.length === 0 || bv.length === 0) return 0;
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const x = av[i] ?? 0;
    const y = bv[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export function ForceUpdateGate({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [checked, setChecked] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only enforce on native (APK) platforms. Web users are not blocked.
  const isNative = Capacitor.isNativePlatform();

  const load = async () => {
    setError(null);
    try {
      const { release: latest } = await fetchAppReleases(1);
      setRelease(latest ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setChecked(true);
    }
  };

  useEffect(() => {
    if (!isNative) {
      setChecked(true);
      return;
    }
    load();
    const id = setInterval(load, CHECK_INTERVAL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  if (!isNative) return <>{children}</>;

  const installed = getInstalledTag();
  const latestTag = release?.tag_name ?? null;
  const installedId = getInstalledReleaseId();
  const latestId = getReleaseId(release);
  const needsUpdate =
    !!latestTag &&
    (!installed ||
      (installedId && latestId && installedId !== latestId) ||
      (!installedId && !!latestId) ||
      compareVersions(latestTag, installed) > 0);

  if (!needsUpdate) return <>{children}</>;

  const apk = getReleaseApk(release);

  const handleDownload = () => {
    if (!release) return;
    if (!apk) {
      window.open(release.html_url, "_blank");
      return;
    }
    setDownloading(true);
    const a = document.createElement("a");
    a.href = apk.browser_download_url;
    a.download = apk.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    markReleaseDownloaded(release);
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 overflow-y-auto"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="w-full max-w-md space-y-5">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 shadow-elegant text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Rocket className="h-8 w-8 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold">
            {lang === "bn" ? "বাধ্যতামূলক আপডেট" : "Update required"}
          </h1>
          <p className="text-sm opacity-95 mt-2 leading-relaxed">
            {lang === "bn"
              ? "অ্যাপ ব্যবহার চালিয়ে যেতে নতুন ভার্সনে আপডেট করুন।"
              : "Please update to the latest version to continue using the app."}
          </p>
          {latestTag && (
            <div className="mt-4 inline-flex items-center gap-2 text-xs bg-white/15 rounded-full px-3 py-1.5">
              <span className="font-mono opacity-80">{installed ?? "—"}</span>
              <span className="opacity-70">→</span>
              <span className="font-mono font-bold">{latestTag}</span>
            </div>
          )}
        </div>

        {release?.body && (
          <div className="rounded-2xl bg-card border border-border p-4 max-h-48 overflow-y-auto">
            <h3 className="font-semibold text-foreground text-sm mb-2">
              {lang === "bn" ? "এই ভার্সনে যা আছে" : "What's new"}
            </h3>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {release.body}
            </pre>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 flex gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-destructive">{error}</span>
          </div>
        )}

        {release && !apk && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 p-3 flex gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-amber-700 dark:text-amber-300 leading-relaxed">
              {lang === "bn"
                ? "এই রিলিজে কোনো .apk ফাইল attach করা নেই। GitHub পেজে গিয়ে ম্যানুয়ালি ডাউনলোড করুন অথবা পরে আবার চেক করুন।"
                : "This release has no .apk file attached. Open the GitHub page to download manually or check again later."}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleDownload}
            disabled={!release || downloading}
            className="w-full gradient-primary text-primary-foreground gap-2 shadow-elegant"
            size="lg"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
            {apk
              ? lang === "bn"
                ? "এখনই আপডেট ডাউনলোড করুন"
                : "Download update now"
              : lang === "bn"
              ? "GitHub-এ রিলিজ দেখুন"
              : "Open release on GitHub"}
          </Button>
          <Button
            variant="outline"
            onClick={load}
            disabled={!checked}
            className="w-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {lang === "bn" ? "আবার চেক করুন" : "Check again"}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          {lang === "bn"
            ? "ডাউনলোডের পর ফাইলটি ওপেন করে ইনস্টল করুন। আপডেট ছাড়া অ্যাপ ব্যবহার করা যাবে না।"
            : "After downloading, open the file to install. The app cannot be used without updating."}
        </p>
      </div>
    </div>
  );
}
