import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReceiptSettings = {
  header_title: string;
  header_address: string;
  receipt_title: string;
  billing_period_label: string;
  footer_line1: string;
  footer_line2: string;
};

export const RECEIPT_DEFAULTS: ReceiptSettings = {
  header_title: "SHEIKH BACCHU TOWER SOCIETY",
  header_address: "14/2, Sheikh Bacchu Tower, Mokterbari Road, Tongi, Gazipur",
  receipt_title: "PAYMENT RECEIPT",
  billing_period_label: "For Month",
  footer_line1: "This is a system-generated receipt and does not require a signature.",
  footer_line2: "Thank you for your payment.",
};

const KEY = "receipt_template";

export async function loadReceiptSettings(): Promise<ReceiptSettings> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", KEY).maybeSingle();
  const v = (data?.value as Partial<ReceiptSettings>) || {};
  return { ...RECEIPT_DEFAULTS, ...v };
}

export function useReceiptSettings() {
  const [settings, setSettings] = useState<ReceiptSettings>(RECEIPT_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setSettings(await loadReceiptSettings());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (next: ReceiptSettings) => {
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
