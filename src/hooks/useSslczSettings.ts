import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SslczSettings = {
  enabled: boolean;
  mode: "sandbox" | "live";
  fee_pct: number;       // 0..1, e.g. 0.025 = 2.5%
  min_amount: number;    // BDT
  max_amount: number;    // BDT (0 = no limit)
  store_id_display: string; // optional non-secret display value
};

export const SSLCZ_DEFAULTS: SslczSettings = {
  enabled: false,
  mode: "sandbox",
  fee_pct: 0,
  min_amount: 10,
  max_amount: 0,
  store_id_display: "",
};

const KEY = "sslcommerz_gateway";

export function useSslczSettings() {
  const [settings, setSettings] = useState<SslczSettings>(SSLCZ_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("value").eq("key", KEY).maybeSingle();
    const v = (data?.value as Partial<SslczSettings>) || {};
    setSettings({ ...SSLCZ_DEFAULTS, ...v });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (next: SslczSettings) => {
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", KEY).maybeSingle();
    const payload = { key: KEY, value: next as any };
    const { error } = existing
      ? await supabase.from("app_settings").update(payload).eq("id", existing.id)
      : await supabase.from("app_settings").insert(payload);
    if (!error) setSettings(next);
    return { error };
  };

  return { settings, loading, save, reload: load };
}
