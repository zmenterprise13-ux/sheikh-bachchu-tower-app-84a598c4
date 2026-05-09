import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const GITHUB_OWNER = "zmenterprise13-ux";
const GITHUB_REPO = "sheikh-bachchu-tower-app-4d8f59dd";
const SEEN_KEY = "sbt:lastSeenReleaseTag";
const DISMISS_KEY = "sbt:dismissedReleaseTag";
const INSTALLED_KEY = "sbt:installedReleaseTag";
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

type Asset = { name: string; browser_download_url: string };
type Release = {
  tag_name: string;
  name: string;
  prerelease: boolean;
  html_url: string;
  assets: Asset[];
};

/**
 * Strict version comparator.
 * Extracts numeric segments from a tag (e.g. "build-25" → [25], "v1.2.3" → [1,2,3])
 * and returns 1 if a > b, -1 if a < b, 0 if equal.
 * Returns 0 when either tag has no numeric content (cannot determine).
 */
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

function isNewerThanInstalled(latestTag: string): boolean {
  const installed = localStorage.getItem(INSTALLED_KEY);
  // No installed record yet — assume outdated, prompt the user
  if (!installed) return true;
  return compareVersions(latestTag, installed) > 0;
}

export function UpdateBanner() {
  const [release, setRelease] = useState<Release | null>(null);
  const [hidden, setHidden] = useState(false);
  const navigate = useNavigate();

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

  const handleViewDetails = () => {
    navigate("/update");
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
            বিস্তারিত দেখুন এবং আপডেট করুন
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 sm:h-8 text-xs gap-1 shrink-0"
          onClick={handleViewDetails}
        >
          <Info className="h-3 w-3" />
          বিস্তারিত
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
