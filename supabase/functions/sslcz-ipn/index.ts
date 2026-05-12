// SSLCommerz IPN + success-confirm endpoint (sandbox)
// Validates a transaction with SSLCommerz validation API, then approves the linked payment_request.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const VALIDATOR_URLS = {
  sandbox: "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php",
  live: "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php",
};
const LOOKUP_URLS = {
  sandbox: "https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php",
  live: "https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const STORE_ID = Deno.env.get("SSLCOMMERZ_STORE_ID")!;
    const STORE_PASS = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD")!;
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Accept either IPN POST (form) OR client confirmation GET (?tran_id=...)
    let tran_id = "";
    let val_id = "";
    if (req.method === "GET") {
      const u = new URL(req.url);
      tran_id = u.searchParams.get("tran_id") || "";
      val_id = u.searchParams.get("val_id") || "";
    } else {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await req.json();
        tran_id = j.tran_id || ""; val_id = j.val_id || "";
      } else {
        const form = await req.formData();
        tran_id = String(form.get("tran_id") || "");
        val_id = String(form.get("val_id") || "");
      }
    }

    if (!tran_id) {
      return new Response(JSON.stringify({ error: "tran_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SB_URL, SB_SERVICE);
    const { data: pr } = await admin.from("payment_requests")
      .select("id, status, amount, gateway_tran_id")
      .eq("gateway_tran_id", tran_id).maybeSingle();
    if (!pr) {
      return new Response(JSON.stringify({ error: "Unknown tran_id" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (pr.status === "approved") {
      return new Response(JSON.stringify({ ok: true, already: true, status: "approved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve mode (sandbox/live) from app_settings
    const { data: setRow } = await admin.from("app_settings").select("value").eq("key", "sslcommerz_gateway").maybeSingle();
    const mode: "sandbox" | "live" = ((setRow?.value as any)?.mode === "live") ? "live" : "sandbox";

    // Need val_id to validate. If IPN gave it, use it; else look it up via tran query.
    if (!val_id) {
      const q = new URL(LOOKUP_URLS[mode]);
      q.searchParams.set("tran_id", tran_id);
      q.searchParams.set("store_id", STORE_ID);
      q.searchParams.set("store_passwd", STORE_PASS);
      q.searchParams.set("format", "json");
      const lookup = await fetch(q.toString());
      const lj = await lookup.json();
      const el = (lj?.element || [])[0];
      val_id = el?.val_id || "";
      if (!val_id) {
        return new Response(JSON.stringify({ ok: false, error: "No val_id found for tran", lookup: lj }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const v = new URL(VALIDATOR_URLS[mode]);
    v.searchParams.set("val_id", val_id);
    v.searchParams.set("store_id", STORE_ID);
    v.searchParams.set("store_passwd", STORE_PASS);
    v.searchParams.set("format", "json");
    const vres = await fetch(v.toString());
    const vdata = await vres.json();

    const okStatus = vdata?.status === "VALID" || vdata?.status === "VALIDATED";
    const amountOk = Number(vdata?.amount || 0) >= Number(pr.amount) - 0.01;
    const tranOk = vdata?.tran_id === tran_id;

    if (okStatus && amountOk && tranOk) {
      const { error: upErr } = await admin.from("payment_requests")
        .update({
          status: "approved",
          gateway_val_id: val_id,
          gateway_raw: vdata,
          review_note: "Auto-approved via SSLCommerz",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", pr.id);
      if (upErr) {
        return new Response(JSON.stringify({ ok: false, error: upErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, status: "approved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Not valid — record raw, leave pending
    await admin.from("payment_requests").update({ gateway_raw: vdata, gateway_val_id: val_id }).eq("id", pr.id);
    return new Response(JSON.stringify({ ok: false, status: vdata?.status, raw: vdata }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
