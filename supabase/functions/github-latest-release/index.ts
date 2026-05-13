// Public edge function: fetches the latest GitHub APK release for this app.
// Runs server-side so it bypasses GitHub's per-IP rate limit (which hits
// mobile users sharing carrier NAT IPs) and avoids browser CORS issues
// from github.com's HTML/atom endpoints.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_OWNER = "zmenterprise13-ux";

type GithubAsset = { name: string; browser_download_url: string; size?: number; content_type?: string };
type GithubRepo = { name: string; full_name: string; html_url: string; updated_at?: string };
type GithubRelease = {
  tag_name: string;
  name?: string;
  prerelease?: boolean;
  draft?: boolean;
  html_url: string;
  published_at?: string;
  body?: string;
  assets?: GithubAsset[];
  repository?: GithubRepo;
};

function versionParts(tag: string): number[] | null {
  const normalized = tag.trim().replace(/^v/i, "");
  if (!/^\d+(\.\d+)+$/.test(normalized)) return null;
  return normalized.split(".").map((part) => Number(part));
}

function compareVersions(a: string, b: string): number {
  const av = versionParts(a);
  const bv = versionParts(b);
  if (av && !bv) return 1;
  if (!av && bv) return -1;
  if (!av || !bv) return 0;
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const x = av[i] ?? 0;
    const y = bv[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function hasApkAsset(release: GithubRelease): boolean {
  return (release.assets ?? []).some((asset) => asset.name.toLowerCase().endsWith(".apk"));
}

function releaseScore(release: GithubRelease): number {
  const body = `${release.name ?? ""} ${release.body ?? ""} ${(release.assets ?? []).map((a) => a.name).join(" ")}`.toLowerCase();
  let score = hasApkAsset(release) ? 100 : 0;
  if (body.includes("sheikh")) score += 20;
  if (body.includes("bachchu") || body.includes("bacchu")) score += 20;
  if (body.includes("tower")) score += 15;
  if (body.includes("app-release.apk")) score += 10;
  return score;
}

function withRepository(release: GithubRelease, repo: GithubRepo): GithubRelease {
  return { ...release, repository: { name: repo.name, full_name: repo.full_name, html_url: repo.html_url } };
}

function pickLatestRelease<T extends GithubRelease>(releases: T[]): T | null {
  const stable = releases.filter((release) => !release.draft && !release.prerelease);
  return stable.sort((a, b) => {
    const scoreCompare = releaseScore(b) - releaseScore(a);
    if (scoreCompare !== 0) return scoreCompare;
    const versionCompare = compareVersions(b.tag_name, a.tag_name);
    if (versionCompare !== 0) return versionCompare;
    return Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? "");
  })[0] ?? null;
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return await res.json();
}

async function fetchRepoReleases(repo: GithubRepo, headers: Record<string, string>, limit = 100): Promise<GithubRelease[]> {
  const data = await fetchJson<GithubRelease[]>(
    `https://api.github.com/repos/${repo.full_name}/releases?per_page=${limit}`,
    headers
  );
  return (data ?? []).map((release) => withRepository(release, repo));
}

async function findAccountReleases(owner: string, headers: Record<string, string>): Promise<GithubRelease[]> {
  const repos = await fetchJson<GithubRepo[]>(
    `https://api.github.com/users/${owner}/repos?per_page=100&sort=updated&type=owner`,
    headers
  );
  if (!repos?.length) return [];

  const batches = await Promise.all(
    repos.slice(0, 30).map((repo) => fetchRepoReleases(repo, headers, 10).catch(() => []))
  );

  return batches
    .flat()
    .filter((release) => !release.draft && !release.prerelease && hasApkAsset(release));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "sheikh-bachchu-tower-app",
      Accept: "application/vnd.github+json",
    };
    // Optional: if a GITHUB_TOKEN secret is set, use it for higher rate limits.
    const token = Deno.env.get("GITHUB_TOKEN");
    if (token) headers.Authorization = `Bearer ${token}`;

    const apiRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=100`,
      { headers }
    );

    if (apiRes.ok) {
      const data = await apiRes.json();
      const latest = pickLatestRelease(data) ?? data[0] ?? null;
      return new Response(JSON.stringify({ release: latest }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: parse the public atom feed (no rate limit, no auth).
    const atomRes = await fetch(
      `https://github.com/${OWNER}/${REPO}/releases.atom`,
      { headers: { "User-Agent": "sheikh-bachchu-tower-app" } }
    );
    if (!atomRes.ok) {
      return new Response(
        JSON.stringify({ error: `GitHub ${apiRes.status}/${atomRes.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const xml = await atomRes.text();
    const tagMatch = xml.match(/<link[^>]+href="([^"]+\/releases\/tag\/[^"]+)"/);
    const titleMatch = xml.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/);
    const updatedMatch = xml.match(/<entry>[\s\S]*?<updated>([^<]+)<\/updated>/);
    const contentMatch = xml.match(/<entry>[\s\S]*?<content[^>]*>([\s\S]*?)<\/content>/);
    const link = tagMatch?.[1] ?? "";
    const tag = link.split("/").pop() ?? "";
    if (!tag) {
      return new Response(JSON.stringify({ release: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apkUrl = `https://github.com/${OWNER}/${REPO}/releases/download/${tag}/app-release.apk`;
    const release = {
      tag_name: tag,
      name: titleMatch?.[1] ?? tag,
      prerelease: false,
      html_url: link,
      published_at: updatedMatch?.[1] ?? "",
      body: (contentMatch?.[1] ?? "").replace(/<[^>]+>/g, "").trim(),
      assets: [{ name: "app-release.apk", browser_download_url: apkUrl, size: 0 }],
    };
    return new Response(JSON.stringify({ release }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
