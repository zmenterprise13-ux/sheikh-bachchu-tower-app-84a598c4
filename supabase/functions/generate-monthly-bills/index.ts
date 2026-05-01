// Generates monthly bills (service charge + gas + parking) per flat.
// - Idempotent: skips flats that already have a bill for that month.
// - Can be triggered by pg_cron (no auth) or by an admin (JWT validated in code).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

    // Parse body (optional): { month?: "YYYY-MM" }
    let month = currentMonth();
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.month && /^\d{4}-\d{2}$/.test(body.month)) {
          month = body.month;
        }
      } catch (_) { /* no body is fine */ }
    }

    // Authorization:
    //  - cron / server-to-server: header `x-cron-secret` matching CRON_SECRET, OR Bearer = service role key
    //  - admin user: valid JWT belonging to a user with role 'admin'
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    const providedCronSecret = req.headers.get("x-cron-secret") ?? "";

    let authorized = false;
    if (cronSecret && providedCronSecret && providedCronSecret === cronSecret) {
      authorized = true;
    } else if (token && token === serviceKey) {
      authorized = true;
    } else if (token) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
      if (!claimsErr && claims?.claims?.sub) {
        const userId = claims.claims.sub as string;
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: roleRow } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        authorized = !!roleRow;
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load all flats with their charge configuration.
    const { data: flats, error: flatsErr } = await admin
      .from("flats")
      .select("id, service_charge, gas_bill, parking");
    if (flatsErr) throw flatsErr;

    // Skip flats that already have a bill for this month.
    const { data: existing, error: existingErr } = await admin
      .from("bills")
      .select("flat_id")
      .eq("month", month);
    if (existingErr) throw existingErr;

    const existingSet = new Set((existing ?? []).map((b) => b.flat_id));
    const today = new Date().toISOString().slice(0, 10);

    const rows = (flats ?? [])
      .filter((f) => !existingSet.has(f.id))
      .map((f) => {
        const service = Number(f.service_charge ?? 0);
        const gas = Number(f.gas_bill ?? 0);
        const parking = Number(f.parking ?? 0);
        const total = service + gas + parking;
        return {
          flat_id: f.id,
          month,
          service_charge: service,
          gas_bill: gas,
          parking,
          total,
          paid_amount: 0,
          status: "unpaid" as const,
          generated_at: today,
        };
      });

    let inserted = 0;
    if (rows.length > 0) {
      const { error: insertErr, count } = await admin
        .from("bills")
        .insert(rows, { count: "exact" });
      if (insertErr) throw insertErr;
      inserted = count ?? rows.length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        month,
        flats_total: flats?.length ?? 0,
        already_billed: existingSet.size,
        inserted,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-monthly-bills error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
