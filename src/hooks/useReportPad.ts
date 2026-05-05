import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReportPadSettings = { url: string | null; enabled: boolean };

const KEY = "report_pad";

export function useReportPad() {
  const [settings, setSettings] = useState<ReportPadSettings>({ url: null, enabled: false });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    const v = (data?.value as any) || {};
    setSettings({ url: v.url ?? null, enabled: !!v.enabled });
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async (next: ReportPadSettings) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: KEY, value: next as any }, { onConflict: "key" });
    if (!error) setSettings(next);
    return { error };
  };

  return { settings, loading, save, refresh };
}
