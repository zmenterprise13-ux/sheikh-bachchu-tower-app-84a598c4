import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download as DownloadIcon, Github, Package, FileArchive, Loader2, ExternalLink, Smartphone, AlertCircle, CheckCircle2, XCircle, CircleDashed, Clock, RefreshCw, Activity } from "lucide-react";

// === GitHub repo config — update these after connecting your repo ===
const GITHUB_OWNER = ""; // e.g. "your-username"
const GITHUB_REPO = "";  // e.g. "sheikh-bachchu-tower"
// ====================================================================

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
};

type Release = {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  body: string;
  prerelease: boolean;
  assets: ReleaseAsset[];
};

type WorkflowRun = {
  id: number;
  name: string;
  display_title: string;
  status: string; // queued, in_progress, completed
  conclusion: string | null; // success, failure, cancelled, skipped, null
  html_url: string;
  head_branch: string;
  event: string;
  created_at: string;
  updated_at: string;
  run_number: number;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

const assetIcon = (name: string) => {
  if (name.endsWith(".apk")) return <Smartphone className="h-5 w-5" />;
  if (name.endsWith(".aab")) return <Package className="h-5 w-5" />;
  return <FileArchive className="h-5 w-5" />;
};

const runStatusBadge = (run: WorkflowRun) => {
  if (run.status !== "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/15 text-warning-foreground px-2 py-0.5 text-xs font-semibold">
        <Loader2 className="h-3 w-3 animate-spin" /> {run.status === "queued" ? "queued" : "running"}
      </span>
    );
  }
  if (run.conclusion === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 text-success px-2 py-0.5 text-xs font-semibold">
        <CheckCircle2 className="h-3 w-3" /> success
      </span>
    );
  }
  if (run.conclusion === "failure") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/15 text-destructive px-2 py-0.5 text-xs font-semibold">
        <XCircle className="h-3 w-3" /> failure
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted text-muted-foreground px-2 py-0.5 text-xs font-semibold">
      <CircleDashed className="h-3 w-3" /> {run.conclusion ?? "unknown"}
    </span>
  );
};

export default function Download() {
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [runs, setRuns] = useState<WorkflowRun[] | null>(null);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runsRefreshTick, setRunsRefreshTick] = useState(0);

  const repoConfigured = Boolean(GITHUB_OWNER && GITHUB_REPO);
  const repoUrl = repoConfigured ? `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}` : "";
  const actionsUrl = repoConfigured ? `${repoUrl}/actions` : "";
  const releasesUrl = repoConfigured ? `${repoUrl}/releases` : "";

  useEffect(() => {
    if (!repoConfigured) return;
    setLoading(true);
    fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=5`)
      .then((r) => {
        if (!r.ok) throw new Error(`GitHub API ${r.status}`);
        return r.json();
      })
      .then((data: Release[]) => setReleases(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoConfigured]);

  // Fetch latest workflow runs (build status) — auto refresh every 30s
  useEffect(() => {
    if (!repoConfigured) return;
    let cancelled = false;
    setRunsLoading(true);
    setRunsError(null);
    fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?per_page=5`)
      .then((r) => {
        if (!r.ok) throw new Error(`GitHub API ${r.status}`);
        return r.json();
      })
      .then((data: { workflow_runs: WorkflowRun[] }) => {
        if (!cancelled) setRuns(data.workflow_runs ?? []);
      })
      .catch((e) => { if (!cancelled) setRunsError(e.message); })
      .finally(() => { if (!cancelled) setRunsLoading(false); });
    return () => { cancelled = true; };
  }, [repoConfigured, runsRefreshTick]);

  useEffect(() => {
    if (!repoConfigured) return;
    const id = setInterval(() => setRunsRefreshTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [repoConfigured]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <DownloadIcon className="h-7 w-7" /> অ্যাপ ডাউনলোড
            </h1>
            <p className="text-muted-foreground mt-1">
              Sheikh Bachchu Tower — Android APK ও Play Store বান্ডল
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">← হোম</Link>
          </Button>
        </div>

        {!repoConfigured && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>সেটআপ প্রয়োজন</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                GitHub repo এর সাথে কানেক্ট করার পর{" "}
                <code className="px-1 py-0.5 bg-muted rounded">src/pages/Download.tsx</code> ফাইলে{" "}
                <code className="px-1 py-0.5 bg-muted rounded">GITHUB_OWNER</code> ও{" "}
                <code className="px-1 py-0.5 bg-muted rounded">GITHUB_REPO</code> আপডেট করুন। তারপর
                সর্বশেষ APK / AAB এখানে অটো-লোড হবে।
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Github className="h-5 w-5" /> GitHub Actions Artifacts
              </CardTitle>
              <CardDescription>প্রতিটি বিল্ডের ডিবাগ APK</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" disabled={!repoConfigured}>
                <a href={actionsUrl} target="_blank" rel="noreferrer">
                  Actions খুলুন <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5" /> GitHub Releases
              </CardTitle>
              <CardDescription>সাইন্ড রিলিজ APK + AAB</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full" disabled={!repoConfigured}>
                <a href={releasesUrl} target="_blank" rel="noreferrer">
                  সব রিলিজ দেখুন <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Releases list */}
        {repoConfigured && (
          <Card>
            <CardHeader>
              <CardTitle>সর্বশেষ রিলিজসমূহ</CardTitle>
              <CardDescription>সরাসরি ডাউনলোড লিঙ্ক</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> লোড হচ্ছে...
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>রিলিজ লোড করা যায়নি: {error}</AlertDescription>
                </Alert>
              )}

              {releases && releases.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  এখনো কোনো রিলিজ নেই। একটি ট্যাগ পুশ করুন (যেমন{" "}
                  <code className="px-1 bg-muted rounded">v1.0.0</code>) — Workflow অটো বিল্ড করবে।
                </p>
              )}

              {releases?.map((rel) => (
                <div key={rel.tag_name} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{rel.name || rel.tag_name}</h3>
                        <Badge variant="outline">{rel.tag_name}</Badge>
                        {rel.prerelease && <Badge variant="secondary">pre-release</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(rel.published_at).toLocaleString("bn-BD")}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <a href={rel.html_url} target="_blank" rel="noreferrer">
                        Release page <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  </div>

                  {rel.assets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">কোনো ফাইল নেই।</p>
                  ) : (
                    <div className="grid gap-2">
                      {rel.assets.map((a) => (
                        <a
                          key={a.name}
                          href={a.browser_download_url}
                          className="flex items-center justify-between gap-3 p-3 rounded-md border hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {assetIcon(a.name)}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{a.name}</p>
                              <p className="text-xs text-muted-foreground">{formatBytes(a.size)}</p>
                            </div>
                          </div>
                          <DownloadIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ইনস্টল গাইড</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>APK:</strong> ফোনে ডাউনলোড করে ফাইলটি ট্যাপ করুন। প্রথমবার "Unknown sources"
              থেকে ইনস্টলের অনুমতি দিতে হতে পারে।
            </p>
            <p>
              <strong>AAB:</strong> এটি Google Play Console এ আপলোডের জন্য — সরাসরি ফোনে ইনস্টলযোগ্য নয়।
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
