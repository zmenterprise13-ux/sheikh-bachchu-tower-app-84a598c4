import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, X, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const GITHUB_OWNER = "zmenterprise13-ux";
const GITHUB_REPO = "sheikh-bachchu-tower-app-4d8f59dd";
const SEEN_KEY = "sbt:lastSeenReleaseTag";
const DISMISS_KEY = "sbt:dismissedReleaseTag";
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

type Asset = { name: string; browser_download_url: string };
type Release = {
  tag_name: string;
  name: string;
  prerelease: boolean;
  html_url: string;
  assets: Asset[];
};

export function UpdateBanner() {
  const [release, setRelease] = useState<Release | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=5`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data: Release[] = await res.json();
        const latest = data.find((r) => !r.prerelease) ?? data[0];
        if (!latest || cancelled) return;
        const seen = localStorage.getItem(SEEN_KEY);
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (latest.tag_name !== seen && latest.tag_name !== dismissed) {
          setRelease(latest);
        }
      } catch {
        // silent
      }
    };
    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  if (!release || hidden) return null;

  const apk = release.assets.find((a) => a.name.endsWith(".apk"));

  const handleUpdate = async () => {
    if (!apk) {
      window.open(release.html_url, "_blank");
      return;
    }
    setDownloading(true);
    // Trigger native download — Android browser will prompt to install
    const a = document.createElement("a");
    a.href = apk.browser_download_url;
    a.download = apk.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    localStorage.setItem(SEEN_KEY, release.tag_name);
    setTimeout(() => setDownloading(false), 1500);
  };

  const handleLater = () => {
    localStorage.setItem(DISMISS_KEY, release.tag_name);
    setHidden(true);
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md">
      <div className="container flex items-center gap-2 sm:gap-3 py-2 px-3 flex-wrap">
        <Rocket className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold leading-tight">
            নতুন ভার্সন উপলব্ধ — {release.tag_name}
          </p>
          <p className="text-[10px] sm:text-xs opacity-90 leading-tight truncate">
            এখনই আপডেট করুন সর্বশেষ ফিচার ও উন্নতির জন্য
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 sm:h-8 text-xs gap-1 shrink-0"
          onClick={handleUpdate}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <DownloadIcon className="h-3 w-3" />
          )}
          আপডেট
        </Button>
        <button
          onClick={handleLater}
          className="p-1 rounded hover:bg-white/20 shrink-0"
          aria-label="পরে"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
