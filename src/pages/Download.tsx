import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download as DownloadIcon, Github, Package, FileArchive, Loader2, ExternalLink, Smartphone, AlertCircle, CheckCircle2, XCircle, CircleDashed, Clock, RefreshCw, Activity, Settings, ShieldCheck, FileDown, MousePointerClick, Rocket, Lock, Folder } from "lucide-react";
import { AppRelease as Release, ReleaseRepository, fetchAppReleases } from "@/lib/appRelease";

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
  const [repo, setRepo] = useState<ReleaseRepository | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [runs, setRuns] = useState<WorkflowRun[] | null>(null);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runsRefreshTick, setRunsRefreshTick] = useState(0);

  const repoConfigured = Boolean(repo);
  const repoUrl = repo?.html_url ?? "";
  const actionsUrl = repoConfigured ? `${repoUrl}/actions` : "";
  const releasesUrl = repoConfigured ? `${repoUrl}/releases` : "";

  useEffect(() => {
    setLoading(true);
    fetchAppReleases(5)
      .then((data) => {
        setReleases(data.releases);
        setRepo(data.repository ?? data.release?.repository ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Fetch latest workflow runs (build status) — auto refresh every 30s
  useEffect(() => {
    if (!repoConfigured) return;
    let cancelled = false;
    setRunsLoading(true);
    setRunsError(null);
    fetch(`https://api.github.com/repos/${repo?.full_name}/actions/runs?per_page=5`)
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
  }, [repoConfigured, repo?.full_name, runsRefreshTick]);

  useEffect(() => {
    if (!repoConfigured) return;
    const id = setInterval(() => setRunsRefreshTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [repoConfigured]);

  // Track latest seen release tag in localStorage to flag "নতুন ভার্সন"
  const SEEN_KEY = "sbt:lastSeenReleaseTag";
  const latestTag = useMemo(() => {
    const stable = releases?.find((r) => !r.prerelease) ?? releases?.[0];
    return stable?.tag_name ?? null;
  }, [releases]);
  const [seenTag, setSeenTag] = useState<string | null>(() => {
    try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
  });
  const hasNewVersion = Boolean(latestTag && latestTag !== seenTag);

  const markAsSeen = () => {
    if (!latestTag) return;
    try { localStorage.setItem(SEEN_KEY, latestTag); } catch {}
    setSeenTag(latestTag);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 flex-wrap">
              <DownloadIcon className="h-7 w-7" /> অ্যাপ ডাউনলোড
              {hasNewVersion && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 text-primary px-2 py-0.5 text-xs font-semibold animate-pulse">
                  <Rocket className="h-3 w-3" /> নতুন ভার্সন: {latestTag}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Sheikh Bachchu Tower — Android APK ও Play Store বান্ডল
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">← হোম</Link>
          </Button>
        </div>

        {hasNewVersion && (
          <Alert className="border-primary/40 bg-primary/5">
            <Rocket className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">নতুন ভার্সন উপলব্ধ — {latestTag}</AlertTitle>
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span>সর্বশেষ APK ডাউনলোড করে অ্যাপ আপডেট করুন।</span>
              <Button size="sm" variant="outline" onClick={markAsSeen}>
                দেখা হয়েছে চিহ্নিত করুন
              </Button>
            </AlertDescription>
          </Alert>
        )}

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

        {/* Build status (Actions workflow runs) */}
        {repoConfigured && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5" /> বিল্ড স্ট্যাটাস
                  </CardTitle>
                  <CardDescription>সর্বশেষ Actions ওয়ার্কফ্লো রান (প্রতি ৩০ সেকেন্ডে অটো রিফ্রেশ)</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRunsRefreshTick((t) => t + 1)}
                  disabled={runsLoading}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${runsLoading ? "animate-spin" : ""}`} />
                  রিফ্রেশ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {runsLoading && !runs && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> লোড হচ্ছে...
                </div>
              )}
              {runsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>বিল্ড স্ট্যাটাস লোড করা যায়নি: {runsError}</AlertDescription>
                </Alert>
              )}
              {runs && runs.length === 0 && (
                <p className="text-sm text-muted-foreground">এখনো কোনো ওয়ার্কফ্লো রান নেই।</p>
              )}
              {runs?.map((run) => (
                <a
                  key={run.id}
                  href={run.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 p-3 rounded-md border hover:bg-accent transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{run.name}</span>
                      <Badge variant="outline" className="text-[10px]">#{run.run_number}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{run.event}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {run.display_title} · <span className="font-mono">{run.head_branch}</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(run.updated_at).toLocaleString("bn-BD")}
                    </p>
                  </div>
                  <div className="shrink-0">{runStatusBadge(run)}</div>
                </a>
              ))}
            </CardContent>
          </Card>
        )}

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
                        {rel.tag_name === latestTag && !rel.prerelease && (
                          <Badge className="bg-primary text-primary-foreground">নতুন</Badge>
                        )}
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

        {/* Step-by-step install guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-5 w-5" /> APK ইনস্টল গাইড — ধাপে ধাপে
            </CardTitle>
            <CardDescription>প্রথমবার ইনস্টল করার সময় এই ৬টি ধাপ অনুসরণ করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {[
                { icon: FileDown, title: "১. APK ফাইল ডাউনলোড করুন", desc: "উপরের রিলিজ সেকশন থেকে app-release.apk ফাইলে ট্যাপ করুন। ব্রাউজার ফাইলটি Downloads ফোল্ডারে সেভ করবে।", hint: "নোটিফিকেশন বারে \"Download complete\" দেখলে সেটিতে ট্যাপ করতে পারেন।" },
                { icon: Folder, title: "২. ফাইল ম্যানেজার থেকে খুলুন", desc: "Files / My Files অ্যাপ খুলে Downloads ফোল্ডারে যান এবং app-release.apk ফাইলে ট্যাপ করুন।" },
                { icon: ShieldCheck, title: "৩. \"Unknown sources\" এর অনুমতি দিন", desc: "প্রথমবার একটি ডায়ালগ আসবে: \"For your security, your phone is not allowed to install unknown apps from this source.\" — Settings এ ট্যাপ করুন।", hint: "Android 8+: Settings → Apps → Special access → Install unknown apps → আপনার ব্রাউজার (Chrome) → \"Allow from this source\" চালু করুন।" },
                { icon: Settings, title: "৪. ফিরে এসে Install চাপুন", desc: "ব্যাক বাটন চেপে আবার APK ইনস্টল ডায়ালগে আসুন এবং নিচে \"Install\" বাটনে ট্যাপ করুন।" },
                { icon: Lock, title: "৫. Play Protect সতর্কতা (যদি আসে)", desc: "\"Blocked by Play Protect\" বার্তা এলে \"More details\" → \"Install anyway\" সিলেক্ট করুন। এটি স্বাভাবিক, কারণ অ্যাপটি Play Store এ নেই।" },
                { icon: Rocket, title: "৬. অ্যাপ খুলুন", desc: "ইনস্টল শেষ হলে \"Open\" চাপুন বা হোম স্ক্রিন থেকে Sheikh Bachchu Tower আইকনে ট্যাপ করুন।", hint: "প্রথমবার লগইন করতে আপনার ফোন নম্বর / OTP প্রয়োজন হবে।" },
              ].map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={i} className="flex gap-3">
                    <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pb-3 border-b last:border-b-0 last:pb-0">
                      <p className="font-semibold text-sm">{step.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                      {step.hint && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 rounded bg-muted/60 border border-border">
                          💡 {step.hint}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <Alert className="mt-5">
              <MousePointerClick className="h-4 w-4" />
              <AlertTitle>আপডেট কীভাবে করবেন?</AlertTitle>
              <AlertDescription>
                নতুন রিলিজ এলে শুধু নতুন APK ডাউনলোড করে আবার ইনস্টল করুন — পুরনো ডেটা মুছবে না।
              </AlertDescription>
            </Alert>

            <Alert variant="destructive" className="mt-3">
              <Package className="h-4 w-4" />
              <AlertTitle>AAB ফাইল?</AlertTitle>
              <AlertDescription>
                <code className="px-1 bg-muted rounded">app-release.aab</code> ফাইল সরাসরি ফোনে ইনস্টলযোগ্য নয় — এটি শুধুমাত্র Google Play Console এ আপলোডের জন্য।
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
