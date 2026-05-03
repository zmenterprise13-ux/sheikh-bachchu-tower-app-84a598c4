import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "notice_ticker_speed";
const DEFAULT_SPEED = 20; // seconds for one full loop (lower = faster)
const MIN = 5;
const MAX = 120;

export function useTickerSpeed() {
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    const v = data?.value as unknown;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n >= MIN && n <= MAX) setSpeed(n);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const save = async (next: number) => {
    const clamped = Math.max(MIN, Math.min(MAX, Math.round(next)));
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: KEY, value: clamped as unknown as any }, { onConflict: "key" });
    if (!error) setSpeed(clamped);
    return { error };
  };

  return { speed, loading, refresh, save, MIN, MAX, DEFAULT: DEFAULT_SPEED };
}
