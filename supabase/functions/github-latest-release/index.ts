// Public edge function: fetches the latest GitHub APK release for this app.
// Runs server-side so it bypasses GitHub's per-IP rate limit (which hits
// mobile users sharing carrier NAT IPs) and avoids browser CORS issues
// from github.com's HTML/atom endpoints.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

async function findAccountReleases(owner: string, headers: Record<string, string>, hasToken: boolean): Promise<GithubRelease[]> {
  const reposUrl = hasToken
    ? "https://api.github.com/user/repos?per_page=100&sort=updated&visibility=all&affiliation=owner"
    : `https://api.github.com/users/${owner}/repos?per_page=100&sort=updated&type=owner`;
  const reposData = await fetchJson<GithubRepo[]>(reposUrl, headers);
  const repos = (reposData ?? []).filter((repo) =>
    repo.full_name.toLowerCase().startsWith(`${owner.toLowerCase()}/`)
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
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const owner = Deno.env.get("GITHUB_OWNER") ?? DEFAULT_OWNER;
    const configuredRepo = Deno.env.get("GITHUB_REPO") ?? "";
    const limit = Math.min(Math.max(Number(body.limit ?? 5), 1), 20);
    const headers: Record<string, string> = {
      "User-Agent": "sheikh-bachchu-tower-app-updater",
      Accept: "application/vnd.github+json",
    };
    // Optional: if a GITHUB_TOKEN secret is set, use it for higher rate limits.
    const token = Deno.env.get("GITHUB_TOKEN");
    if (token) headers.Authorization = `Bearer ${token}`;

    const accountReleases = await findAccountReleases(owner, headers, Boolean(token));
    if (accountReleases.length) {
      const sorted = [...accountReleases].sort((a, b) => {
        const scoreCompare = releaseScore(b) - releaseScore(a);
        if (scoreCompare !== 0) return scoreCompare;
        const versionCompare = compareVersions(b.tag_name, a.tag_name);
        if (versionCompare !== 0) return versionCompare;
        return Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? "");
      });
      const latest = sorted[0] ?? null;
      return new Response(JSON.stringify({
        release: latest,
        releases: sorted.slice(0, limit),
        repository: latest?.repository ?? null,
        source: "account-scan",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (configuredRepo) {
      const repo: GithubRepo = {
        name: configuredRepo,
        full_name: `${owner}/${configuredRepo}`,
        html_url: `https://github.com/${owner}/${configuredRepo}`,
      };
      const releases = await fetchRepoReleases(repo, headers);
      if (releases.length) {
        const latest = pickLatestRelease(releases) ?? releases[0] ?? null;
        return new Response(JSON.stringify({
          release: latest,
          releases: releases.filter((r) => !r.draft && !r.prerelease).slice(0, limit),
          repository: latest?.repository ?? repo,
          source: "configured-repo",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: parse the configured public atom feed if a fixed repo exists.
    if (!configuredRepo) {
      return new Response(JSON.stringify({ release: null, releases: [], repository: null, source: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const atomRes = await fetch(
      `https://github.com/${owner}/${configuredRepo}/releases.atom`,
      { headers: { "User-Agent": "sheikh-bachchu-tower-app-updater" } }
    );
    if (!atomRes.ok) {
      return new Response(
        JSON.stringify({ error: `GitHub release not found` }),
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
    const apkUrl = `https://github.com/${owner}/${configuredRepo}/releases/download/${tag}/app-release.apk`;
    const repository = {
      name: configuredRepo,
      full_name: `${owner}/${configuredRepo}`,
      html_url: `https://github.com/${owner}/${configuredRepo}`,
    };
    const release = {
      tag_name: tag,
      name: titleMatch?.[1] ?? tag,
      prerelease: false,
      html_url: link,
      published_at: updatedMatch?.[1] ?? "",
      body: (contentMatch?.[1] ?? "").replace(/<[^>]+>/g, "").trim(),
      assets: [{ name: "app-release.apk", browser_download_url: apkUrl, size: 0 }],
      repository,
    };
    return new Response(JSON.stringify({ release, releases: [release], repository, source: "atom-fallback" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
