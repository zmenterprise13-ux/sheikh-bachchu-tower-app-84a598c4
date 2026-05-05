import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "notice_ticker_speed";
const DIR_KEY = "notice_ticker_direction";
const DEFAULT_SPEED = 20; // seconds for one full loop (lower = faster)
const MIN = 5;
const MAX = 120;
export type TickerDirection = "left" | "right";
const DEFAULT_DIRECTION: TickerDirection = "left";

export function useTickerSpeed() {
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const [direction, setDirection] = useState<TickerDirection>(DEFAULT_DIRECTION);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [KEY, DIR_KEY]);
    for (const row of data ?? []) {
      const v = (row as any).value as unknown;
      if ((row as any).key === KEY) {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n) && n >= MIN && n <= MAX) setSpeed(n);
      } else if ((row as any).key === DIR_KEY) {
        const s = typeof v === "string" ? v : String(v);
        if (s === "left" || s === "right") setDirection(s);
      }
    }
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

  const saveDirection = async (next: TickerDirection) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: DIR_KEY, value: next as unknown as any }, { onConflict: "key" });
    if (!error) setDirection(next);
    return { error };
  };

  return { speed, direction, loading, refresh, save, saveDirection, MIN, MAX, DEFAULT: DEFAULT_SPEED };
}
