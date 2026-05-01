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

// Returns true if any day of the given Gregorian month (YYYY-MM) falls on
// the 1st of Shawwal (Eid-ul-Fitr) or 10th of Dhul-Hijjah (Eid-ul-Adha).
// Uses islamic-umalqura calendar via Intl.
function monthContainsEid(monthStr: string): boolean {
  const [y, m] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric", month: "numeric", timeZone: "UTC",
  });
  for (let day = 1; day <= daysInMonth; day++) {
    const parts = fmt.formatToParts(new Date(Date.UTC(y, m - 1, day)));
    const hDay = Number(parts.find((p) => p.type === "day")?.value);
    const hMonth = Number(parts.find((p) => p.type === "month")?.value);
    // Shawwal = 10 (Eid-ul-Fitr on 1st), Dhul-Hijjah = 12 (Eid-ul-Adha on 10th)
    if ((hMonth === 10 && hDay === 1) || (hMonth === 12 && hDay === 10)) {
      return true;
    }
  }
  return false;
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

    // Parse body once: { month?: "YYYY-MM", eid?: boolean }
    let month = currentMonth();
    let eidOverride: boolean | undefined = undefined;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.month && /^\d{4}-\d{2}$/.test(body.month)) {
          month = body.month;
        }
        if (typeof body?.eid === "boolean") eidOverride = body.eid;
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

    // Auto-detect Eid month (Eid-ul-Fitr / Eid-ul-Adha). Body { eid: true|false } overrides.
    const includeEid = eidOverride ?? monthContainsEid(month);

    const { data: flats, error: flatsErr } = await admin
      .from("flats")
      .select("id, service_charge, gas_bill, parking, eid_bonus");
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
        const eid = includeEid ? Number(f.eid_bonus ?? 0) : 0;
        const total = service + gas + parking + eid;
        return {
          flat_id: f.id,
          month,
          service_charge: service,
          gas_bill: gas,
          parking,
          eid_bonus: eid,
          other_charge: 0,
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
        eid_included: includeEid,
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
