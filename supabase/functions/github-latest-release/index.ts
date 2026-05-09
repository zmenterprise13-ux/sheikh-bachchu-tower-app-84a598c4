// Public edge function: fetches the latest GitHub release for the app repo.
// Runs server-side so it bypasses GitHub's per-IP rate limit (which hits
// mobile users sharing carrier NAT IPs) and avoids browser CORS issues
// from github.com's HTML/atom endpoints.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OWNER = "zmenterprise13-ux";
const REPO = "sheikh-bachchu-tower-app-4d8f59dd";

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

function pickLatestRelease<T extends { tag_name: string; published_at?: string; prerelease?: boolean; draft?: boolean }>(releases: T[]): T | null {
  const stable = releases.filter((release) => !release.draft && !release.prerelease);
  return stable.sort((a, b) => {
    const versionCompare = compareVersions(b.tag_name, a.tag_name);
    if (versionCompare !== 0) return versionCompare;
    return Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? "");
  })[0] ?? null;
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
