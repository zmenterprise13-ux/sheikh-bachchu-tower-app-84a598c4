import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import capacitorConfig from "../../capacitor.config";

const LAST_LOAD_KEY = "ota:lastLoadAt";
const LAST_URL_KEY = "ota:lastUrl";

export default function OtaStatus() {
  const configuredUrl = (capacitorConfig as any)?.server?.url ?? "(not set)";
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [lastLoadAt, setLastLoadAt] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [loadOk, setLoadOk] = useState<boolean>(true);
  const [isNative, setIsNative] = useState<boolean>(false);
  const [versionName, setVersionName] = useState<string | null>(null);
  const [versionCode, setVersionCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        setVersionName(info.version ?? null);
        setVersionCode(String(info.build ?? ""));
      } catch {
        // web — not available
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const href = window.location.href;
      const origin = window.location.origin;
      setCurrentUrl(origin);
      setIsNative(
        window.location.protocol === "file:" ||
          window.location.protocol === "capacitor:" ||
          // @ts-ignore
          !!(window as any).Capacitor?.isNativePlatform?.(),
      );

      // Record this successful load
      const now = new Date().toISOString();
      localStorage.setItem(LAST_LOAD_KEY, now);
      localStorage.setItem(LAST_URL_KEY, origin);

      setLastLoadAt(localStorage.getItem(LAST_LOAD_KEY));
      setLastUrl(localStorage.getItem(LAST_URL_KEY));
      setLoadOk(!!href);
    } catch {
      setLoadOk(false);
    }
  }, []);

  const expectedHost = (() => {
    try {
      return new URL(configuredUrl).host;
    } catch {
      return "";
    }
  })();
  const currentHost = (() => {
    try {
      return new URL(currentUrl).host;
    } catch {
      return "";
    }
  })();
  const otaActive = isNative && expectedHost && currentHost === expectedHost;

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString() : "—";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">OTA Update Status</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Server URL (configured)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-mono text-sm break-all">{configuredUrl}</div>
            <div className="text-xs text-muted-foreground">
              capacitor.config.ts → server.url
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Native App Version (APK)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">versionName: </span>
              <span className="font-mono">{versionName || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">versionCode: </span>
              <span className="font-mono">{versionCode || "—"}</span>
            </div>
            <div className="text-xs text-muted-foreground pt-1">
              নতুন APK ইনস্টল করলে এই সংখ্যা পরিবর্তন হবে। OTA আপডেটে এটি বদলায় না।
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Currently Loaded From</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-mono text-sm break-all">{currentUrl || "—"}</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={isNative ? "default" : "secondary"}>
                {isNative ? "Native app" : "Web browser"}
              </Badge>
              {isNative && (
                <Badge variant={otaActive ? "default" : "destructive"}>
                  {otaActive ? "OTA active" : "OTA not active"}
                </Badge>
              )}
              <Badge variant={loadOk ? "default" : "destructive"}>
                {loadOk ? "Latest bundle loaded ✓" : "Load failed ✗"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last Successful Load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Time: </span>
              {fmt(lastLoadAt)}
            </div>
            <div className="break-all">
              <span className="text-muted-foreground">URL: </span>
              <span className="font-mono">{lastUrl || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload now</Button>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem(LAST_LOAD_KEY);
              localStorage.removeItem(LAST_URL_KEY);
              window.location.reload();
            }}
          >
            Clear cache & reload
          </Button>
        </div>

        {isNative && !otaActive && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-sm">
              অ্যাপ এখনো OTA সার্ভার থেকে লোড হচ্ছে না। নতুন APK ইনস্টল করার পর
              এই স্ক্রিনে "OTA active" দেখাবে।
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
