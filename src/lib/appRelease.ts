import { supabase } from "@/integrations/supabase/client";

export type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
  content_type?: string;
};

export type ReleaseRepository = {
  name: string;
  full_name: string;
  html_url: string;
};

export type AppRelease = {
  tag_name: string;
  name: string;
  prerelease: boolean;
  html_url: string;
  published_at: string;
  body: string;
  assets: ReleaseAsset[];
  repository?: ReleaseRepository;
};

export type AppReleaseResponse = {
  release: AppRelease | null;
  releases: AppRelease[];
  repository: ReleaseRepository | null;
  source: "configured-repo" | "account-scan" | "atom-fallback" | null;
};

export const INSTALLED_KEY = "sbt:installedReleaseTag";
export const INSTALLED_RELEASE_ID_KEY = "sbt:installedReleaseId";
export const LEGACY_SEEN_KEY = "sbt:lastSeenReleaseTag";

export async function fetchAppReleases(limit = 5): Promise<AppReleaseResponse> {
  const { data, error } = await supabase.functions.invoke("github-latest-release", {
    body: { limit },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const release: AppRelease | null = data?.release ?? null;
  const releases: AppRelease[] = data?.releases ?? (release ? [release] : []);
  return {
    release,
    releases,
    repository: data?.repository ?? release?.repository ?? null,
    source: data?.source ?? null,
  };
}

export function getReleaseApk(release: AppRelease | null | undefined) {
  return release?.assets?.find((asset) => asset.name.toLowerCase().endsWith(".apk")) ?? null;
}

export function getReleaseId(release: AppRelease | null | undefined): string | null {
  if (!release?.tag_name) return null;
  return `${release.repository?.full_name ?? "unknown-repo"}@${release.tag_name}`;
}

export function getInstalledReleaseId(): string | null {
  return localStorage.getItem(INSTALLED_RELEASE_ID_KEY);
}

export function getInstalledTag(): string | null {
  let installed = localStorage.getItem(INSTALLED_KEY);
  if (!installed) {
    const legacy = localStorage.getItem(LEGACY_SEEN_KEY);
    if (legacy) {
      localStorage.setItem(INSTALLED_KEY, legacy);
      localStorage.removeItem(LEGACY_SEEN_KEY);
      installed = legacy;
    }
  }
  return installed;
}

export function markReleaseDownloaded(release: AppRelease) {
  localStorage.setItem(INSTALLED_KEY, release.tag_name);
  const releaseId = getReleaseId(release);
  if (releaseId) localStorage.setItem(INSTALLED_RELEASE_ID_KEY, releaseId);
}
