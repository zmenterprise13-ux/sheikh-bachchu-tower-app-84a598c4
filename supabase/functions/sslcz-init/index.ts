// SSLCommerz session initialization (sandbox)
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

  try {
    const STORE_ID = Deno.env.get("SSLCOMMERZ_STORE_ID");
    const STORE_PASS = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD");
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!STORE_ID || !STORE_PASS) {
      return new Response(JSON.stringify({ error: "SSLCommerz credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const bill_id = String(body.bill_id || "");
    const flat_id = String(body.flat_id || "");
    const amount = Number(body.amount);
    const return_origin = String(body.return_origin || "");
    if (!bill_id || !flat_id || !(amount > 0) || !return_origin) {
      return new Response(JSON.stringify({ error: "bill_id, flat_id, amount, return_origin required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SB_URL, SB_SERVICE);

    // Verify user owns/tenants the flat
    const { data: flat } = await admin.from("flats").select("id, owner_user_id, tenant_user_id, flat_no, owner_name, phone").eq("id", flat_id).maybeSingle();
    if (!flat || (flat.owner_user_id !== user.id && flat.tenant_user_id !== user.id)) {
      return new Response(JSON.stringify({ error: "Flat access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify bill belongs to flat
    const { data: bill } = await admin.from("bills").select("id, flat_id, month, total, paid_amount").eq("id", bill_id).maybeSingle();
    if (!bill || bill.flat_id !== flat_id) {
      return new Response(JSON.stringify({ error: "Bill mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load gateway settings (mode/enabled/limits)
    const { data: setRow } = await admin.from("app_settings").select("value").eq("key", "sslcommerz_gateway").maybeSingle();
    const cfg = (setRow?.value as any) || {};
    const mode: "sandbox" | "live" = cfg.mode === "live" ? "live" : "sandbox";
    if (cfg.enabled === false) {
      return new Response(JSON.stringify({ error: "Online payment is disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof cfg.min_amount === "number" && amount < cfg.min_amount) {
      return new Response(JSON.stringify({ error: `Minimum amount is ${cfg.min_amount}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof cfg.max_amount === "number" && cfg.max_amount > 0 && amount > cfg.max_amount) {
      return new Response(JSON.stringify({ error: `Maximum amount is ${cfg.max_amount}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tran_id = `BCT-${bill_id.slice(0, 8)}-${Date.now()}`;

    // Insert pending payment_request linked via gateway_tran_id
    const { data: pr, error: prErr } = await admin.from("payment_requests").insert({
      bill_id, flat_id, submitted_by: user.id,
      amount, method: "sslcommerz",
      reference: tran_id, note: `SSLCommerz online payment (${mode}) — ${bill.month}`,
      status: "pending", gateway_tran_id: tran_id,
    }).select("id").single();
    if (prErr) {
      return new Response(JSON.stringify({ error: prErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fnBase = `${SB_URL}/functions/v1`;
    const ipn_url = `${fnBase}/sslcz-ipn`;
    const success_url = `${return_origin}/payment/success?tran_id=${encodeURIComponent(tran_id)}`;
    const fail_url = `${return_origin}/payment/fail?tran_id=${encodeURIComponent(tran_id)}`;
    const cancel_url = `${return_origin}/payment/cancel?tran_id=${encodeURIComponent(tran_id)}`;

    const form = new URLSearchParams();
    form.set("store_id", STORE_ID);
    form.set("store_passwd", STORE_PASS);
    form.set("total_amount", amount.toFixed(2));
    form.set("currency", "BDT");
    form.set("tran_id", tran_id);
    form.set("success_url", success_url);
    form.set("fail_url", fail_url);
    form.set("cancel_url", cancel_url);
    form.set("ipn_url", ipn_url);
    form.set("shipping_method", "NO");
    form.set("product_name", `Bill ${bill.month} - Flat ${flat.flat_no}`);
    form.set("product_category", "Service");
    form.set("product_profile", "non-physical-goods");
    form.set("cus_name", flat.owner_name || "Resident");
    form.set("cus_email", user.email || "noemail@example.com");
    form.set("cus_add1", `Flat ${flat.flat_no}`);
    form.set("cus_city", "Dhaka");
    form.set("cus_country", "Bangladesh");
    form.set("cus_phone", flat.phone || "01700000000");
    form.set("num_of_item", "1");
    form.set("value_a", pr.id);
    form.set("value_b", bill_id);

    const res = await fetch(SSLCZ_URLS[mode], { method: "POST", body: form });
    const data = await res.json();

    if (data?.status !== "SUCCESS" || !data?.GatewayPageURL) {
      return new Response(JSON.stringify({ error: data?.failedreason || "Gateway init failed", raw: data }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ url: data.GatewayPageURL, tran_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
