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

    // Parse body once: { month?: "YYYY-MM", eid?: boolean, backfill?: number }
    // - month: target a specific month (default = current month)
    // - backfill: also generate for the previous N months if missing (default 0; cron uses 3)
    let month = currentMonth();
    let eidOverride: boolean | undefined = undefined;
    let backfill = 0;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.month && /^\d{4}-\d{2}$/.test(body.month)) {
          month = body.month;
        }
        if (typeof body?.eid === "boolean") eidOverride = body.eid;
        if (typeof body?.backfill === "number" && body.backfill >= 0) {
          backfill = Math.min(12, Math.floor(body.backfill));
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
      const { data: userData, error: userErr } = await userClient.auth.getUser(token);
      if (!userErr && userData?.user?.id) {
        const userId = userData.user.id;
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

    // Load billing settings (single row).
    const { data: settings } = await admin
      .from("billing_settings")
      .select("eid_month_1, eid_month_2, eid_due_day_1, eid_due_day_2, regular_due_day")
      .maybeSingle();

    // Build the list of months to process: target month + backfill previous months.
    function prevMonth(m: string, n: number): string {
      const [y, mm] = m.split("-").map(Number);
      const d = new Date(Date.UTC(y, mm - 1 - n, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    const months: string[] = [];
    for (let i = 0; i <= backfill; i++) months.push(prevMonth(month, i));

    const { data: flats, error: flatsErr } = await admin
      .from("flats")
      .select("id, service_charge, gas_bill, parking, eid_bonus");
    if (flatsErr) throw flatsErr;

    const today = new Date().toISOString().slice(0, 10);
    const perMonth: Array<{ month: string; eid_included: boolean; inserted: number; already_billed: number }> = [];
    let totalInserted = 0;

    for (const m of months) {
      // Determine Eid inclusion + due day per month.
      let includeEid: boolean;
      let dueDay: number = settings?.regular_due_day ?? 10;
      if (eidOverride !== undefined && m === month) {
        includeEid = eidOverride;
      } else if (settings?.eid_month_1 === m) {
        includeEid = true;
        dueDay = settings.eid_due_day_1 ?? dueDay;
      } else if (settings?.eid_month_2 === m) {
        includeEid = true;
        dueDay = settings.eid_due_day_2 ?? dueDay;
      } else {
        includeEid = monthContainsEid(m);
      }

      const [yy, mm] = m.split("-").map(Number);
      const dueDate = `${yy}-${String(mm).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;

      const { data: existing, error: existingErr } = await admin
        .from("bills")
        .select("flat_id")
        .eq("month", m);
      if (existingErr) throw existingErr;

      const existingSet = new Set((existing ?? []).map((b) => b.flat_id));

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
            month: m,
            service_charge: service,
            gas_bill: gas,
            parking,
            eid_bonus: eid,
            other_charge: 0,
            total,
            paid_amount: 0,
            status: "unpaid" as const,
            generated_at: today,
            due_date: dueDate,
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
      totalInserted += inserted;
      perMonth.push({ month: m, eid_included: includeEid, inserted, already_billed: existingSet.size });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        month,
        backfill,
        flats_total: flats?.length ?? 0,
        inserted: totalInserted,
        months: perMonth,
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
