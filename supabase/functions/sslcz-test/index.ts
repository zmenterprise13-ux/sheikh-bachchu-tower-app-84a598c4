// SSLCommerz credential / connectivity test
// Calls SSLCommerz init endpoint with a dummy session to verify Store ID + Password,
// and returns a clean log of success/failure WITHOUT creating any payment_request.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SSLCZ_URLS = {
  sandbox: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
  live: "https://securepay.sslcommerz.com/gwprocess/v4/api.php",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = new Date().toISOString();

  try {
    const STORE_ID = Deno.env.get("SSLCOMMERZ_STORE_ID");
    const STORE_PASS = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD");
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth: must be admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SB_URL, SB_SERVICE);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ ok: false, error: "Admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!STORE_ID || !STORE_PASS) {
      return new Response(JSON.stringify({
        ok: false,
        startedAt,
        step: "secrets",
        error: "SSLCOMMERZ_STORE_ID or SSLCOMMERZ_STORE_PASSWORD secret not set",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Read mode from app_settings (or accept override from body)
    const body = await req.json().catch(() => ({}));
    const overrideMode = body?.mode === "live" ? "live" : body?.mode === "sandbox" ? "sandbox" : null;
    let mode: "sandbox" | "live" = "sandbox";
    if (overrideMode) {
      mode = overrideMode;
    } else {
      const { data: setRow } = await admin.from("app_settings").select("value").eq("key", "sslcommerz_gateway").maybeSingle();
      const cfg = (setRow?.value as any) || {};
      mode = cfg.mode === "live" ? "live" : "sandbox";
    }

    const amount = Number(body?.amount) > 0 ? Number(body.amount) : 10;
    const tran_id = `BCT-TEST-${Date.now()}`;

    const form = new URLSearchParams();
    form.set("store_id", STORE_ID);
    form.set("store_passwd", STORE_PASS);
    form.set("total_amount", amount.toFixed(2));
    form.set("currency", "BDT");
    form.set("tran_id", tran_id);
    form.set("success_url", "https://example.com/success");
    form.set("fail_url", "https://example.com/fail");
    form.set("cancel_url", "https://example.com/cancel");
    form.set("shipping_method", "NO");
    form.set("product_name", "Connectivity Test");
    form.set("product_category", "Test");
    form.set("product_profile", "non-physical-goods");
    form.set("cus_name", "Test User");
    form.set("cus_email", user.email || "test@example.com");
    form.set("cus_add1", "Test");
    form.set("cus_city", "Dhaka");
    form.set("cus_country", "Bangladesh");
    form.set("cus_phone", "01700000000");
    form.set("num_of_item", "1");

    const res = await fetch(SSLCZ_URLS[mode], { method: "POST", body: form });
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    const ok = data?.status === "SUCCESS" && !!data?.GatewayPageURL;
    const finishedAt = new Date().toISOString();
    return new Response(JSON.stringify({
      ok,
      startedAt,
      finishedAt,
      mode,
      httpStatus: res.status,
      tran_id,
      gatewayPageURL: data?.GatewayPageURL ?? null,
      sessionkey: data?.sessionkey ?? null,
      status: data?.status ?? null,
      failedreason: data?.failedreason ?? null,
      storeIdPreview: STORE_ID.slice(0, 4) + "****" + STORE_ID.slice(-3),
      raw: data,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), startedAt }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
