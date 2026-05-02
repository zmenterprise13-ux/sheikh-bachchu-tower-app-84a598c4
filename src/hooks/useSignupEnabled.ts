import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSignupEnabled() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "signup_enabled")
      .maybeSingle();
    // value is jsonb: true / false
    const v = (data?.value as unknown);
    setEnabled(v === false ? false : true);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const setSignupEnabled = async (next: boolean) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "signup_enabled", value: next as unknown as any },
        { onConflict: "key" },
      );
    if (!error) setEnabled(next);
    return { error };
  };

  return { enabled, loading, refresh, setSignupEnabled };
}
