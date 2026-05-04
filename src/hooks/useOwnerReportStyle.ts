import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OwnerReportStyle = "detailed" | "summary";

export function useOwnerReportStyle() {
  const [style, setStyle] = useState<OwnerReportStyle>("detailed");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "owner_report_style")
      .maybeSingle();
    const v = (data?.value as any)?.style;
    setStyle(v === "summary" ? "summary" : "detailed");
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const save = async (next: OwnerReportStyle) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "owner_report_style", value: { style: next } as any }, { onConflict: "key" });
    if (!error) setStyle(next);
    return { error };
  };

  return { style, loading, save, refresh };
}
