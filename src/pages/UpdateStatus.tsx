import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/i18n/LangContext";
import {
  Rocket,
  Download as DownloadIcon,
  CheckCircle2,
  Calendar,
  Tag,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";

const GITHUB_OWNER = "zmenterprise13-ux";
const GITHUB_REPO = "sheikh-bachchu-tower-app-4d8f59dd";
const INSTALLED_KEY = "sbt:installedReleaseTag";

type Asset = { name: string; browser_download_url: string; size: number };
type Release = {
  tag_name: string;
  name: string;
  prerelease: boolean;
  html_url: string;
  published_at: string;
  body: string;
  assets: Asset[];
};

export default function UpdateStatus() {
  const { lang } = useLang();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const installedTag = localStorage.getItem(INSTALLED_KEY);

  // Fallback: parse GitHub's public releases.atom feed (no API rate limit).
  // Used when api.github.com returns 403 (rate limited by shared mobile IPs).
  const loadFromAtom = async (): Promise<Release> => {
    const res = await fetch(
      `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases.atom`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`Atom feed ${res.status}`);
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const entry = doc.querySelector("entry");
    if (!entry) throw new Error(lang === "bn" ? "কোনো রিলিজ পাওয়া যায়নি" : "No release found");
    const link = entry.querySelector("link")?.getAttribute("href") || "";
    const tag = link.split("/").pop() || "";
    const title = entry.querySelector("title")?.textContent || tag;
    const updated = entry.querySelector("updated")?.textContent || "";
    const body = entry.querySelector("content")?.textContent || "";
    // Predictable APK URL based on the build workflow's output filename.
    const apkUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/app-release.apk`;
    return {
      tag_name: tag,
      name: title,
      prerelease: false,
      html_url: link,
      published_at: updated,
      body: body.replace(/<[^>]+>/g, "").trim(),
      assets: [{ name: "app-release.apk", browser_download_url: apkUrl, size: 0 }],
    };
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let latest: Release | null = null;
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=5`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data: Release[] = await res.json();
          latest = data.find((r) => !r.prerelease) ?? data[0] ?? null;
        } else if (res.status !== 403 && res.status !== 429) {
          throw new Error(`GitHub API ${res.status}`);
        }
      } catch (apiErr) {
        // network / CORS — try atom fallback below
      }
      if (!latest) {
        latest = await loadFromAtom();
      }
      if (!latest) {
        throw new Error(lang === "bn" ? "কোনো রিলিজ পাওয়া যায়নি" : "No release found");
      }
      setRelease(latest);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const apk = release?.assets.find((a) => a.name.endsWith(".apk"));
  const isUpToDate = release && installedTag === release.tag_name;

  const formatBytes = (bytes: number) => {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(lang === "bn" ? "bn-BD" : "en-US", {
        dateStyle: "long",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

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
    localStorage.setItem(INSTALLED_KEY, release.tag_name);
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {lang === "bn" ? "অ্যাপ আপডেট" : "App Update"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "bn"
                ? "ডাউনলোডের আগে সর্বশেষ ভার্সনের তথ্য দেখুন"
                : "Review the latest version before downloading"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
          </Button>
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">
                {lang === "bn" ? "তথ্য আনা যায়নি" : "Could not fetch update info"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && release && (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 shadow-elegant">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  {isUpToDate ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Rocket className="h-6 w-6 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide opacity-80">
                    {isUpToDate
                      ? lang === "bn"
                        ? "আপনি সর্বশেষ ভার্সনে আছেন"
                        : "You're on the latest version"
                      : lang === "bn"
                      ? "নতুন ভার্সন উপলব্ধ"
                      : "New version available"}
                  </p>
                  <h2 className="text-2xl font-bold mt-1">{release.tag_name}</h2>
                  {release.name && release.name !== release.tag_name && (
                    <p className="text-sm opacity-90 mt-0.5">{release.name}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-5 space-y-3 shadow-soft">
              <div className="flex items-center gap-3 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-32">
                  {lang === "bn" ? "ভার্সন ট্যাগ" : "Version tag"}
                </span>
                <span className="font-medium text-foreground">{release.tag_name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-32">
                  {lang === "bn" ? "প্রকাশের তারিখ" : "Release date"}
                </span>
                <span className="font-medium text-foreground">{formatDate(release.published_at)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <DownloadIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-32">
                  {lang === "bn" ? "ফাইল সাইজ" : "File size"}
                </span>
                <span className="font-medium text-foreground">{formatBytes(apk?.size ?? 0)}</span>
              </div>
              {installedTag && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-32">
                    {lang === "bn" ? "ইনস্টল করা" : "Installed"}
                  </span>
                  <span className="font-medium text-foreground">{installedTag}</span>
                </div>
              )}
            </div>

            {release.body && (
              <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
                <h3 className="font-semibold text-foreground mb-2">
                  {lang === "bn" ? "এই ভার্সনে যা আছে" : "What's in this release"}
                </h3>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {release.body}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleDownload}
                disabled={downloading || !apk}
                className="gradient-primary text-primary-foreground gap-2 shadow-elegant flex-1"
                size="lg"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DownloadIcon className="h-4 w-4" />
                )}
                {apk
                  ? lang === "bn"
                    ? "APK ডাউনলোড করুন"
                    : "Download APK"
                  : lang === "bn"
                  ? "APK পাওয়া যায়নি"
                  : "APK not available"}
              </Button>
              <Button variant="outline" asChild className="gap-2" size="lg">
                <a href={release.html_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {lang === "bn" ? "GitHub-এ দেখুন" : "View on GitHub"}
                </a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {lang === "bn"
                ? "ডাউনলোডের পর ফাইলটি ওপেন করে ইনস্টল করুন। 'Unknown sources' allow করতে হতে পারে।"
                : "After downloading, open the file to install. You may need to allow 'Unknown sources'."}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
