import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BkashSettings = { number: string; fee_pct: number };

const DEFAULTS: BkashSettings = { number: "01613458260", fee_pct: 0.02 };
const KEY = "bkash_payment";

export function useBkashSettings() {
  const [settings, setSettings] = useState<BkashSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("value").eq("key", KEY).maybeSingle();
    if (data?.value) {
      const v = data.value as Partial<BkashSettings>;
      setSettings({
        number: v.number || DEFAULTS.number,
        fee_pct: typeof v.fee_pct === "number" ? v.fee_pct : DEFAULTS.fee_pct,
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (next: BkashSettings) => {
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
