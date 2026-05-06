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
      .select("id, flat_no, service_charge, gas_bill, parking, eid_bonus");
    if (flatsErr) throw flatsErr;

    const today = new Date().toISOString().slice(0, 10);
    type FlatRef = { id: string; flat_no: string };
    type MonthResult = {
      month: string;
      eid_included: boolean;
      inserted: number;
      already_billed: number;
      inserted_flats: FlatRef[];
      skipped_flats: FlatRef[];
      failed: boolean;
      error?: string;
    };
    const perMonth: MonthResult[] = [];
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

      const candidateFlats = (flats ?? []).filter((f) => !existingSet.has(f.id));
      const skippedFlats: FlatRef[] = (flats ?? [])
        .filter((f) => existingSet.has(f.id))
        .map((f) => ({ id: f.id, flat_no: f.flat_no }));

      // Compute arrears = sum of (total - paid_amount) of all previous unpaid/partial bills per flat
      const flatIds = candidateFlats.map((f) => f.id);
      const arrearsMap = new Map<string, number>();
      if (flatIds.length > 0) {
        const { data: prevBills, error: prevErr } = await admin
          .from("bills")
          .select("flat_id, total, paid_amount, month")
          .in("flat_id", flatIds)
          .lt("month", m);
        if (prevErr) throw prevErr;
        for (const b of prevBills ?? []) {
          const due = Number(b.total ?? 0) - Number(b.paid_amount ?? 0);
          if (due > 0) {
            arrearsMap.set(b.flat_id, (arrearsMap.get(b.flat_id) ?? 0) + due);
          }
        }
      }

      const rows = candidateFlats.map((f) => {
        const service = Number(f.service_charge ?? 0);
        const gas = Number(f.gas_bill ?? 0);
        const parking = Number(f.parking ?? 0);
        const eid = includeEid ? Number(f.eid_bonus ?? 0) : 0;
        const arrears = arrearsMap.get(f.id) ?? 0;
        const total = service + gas + parking + eid + arrears;
        return {
          flat_id: f.id,
          month: m,
          service_charge: service,
          gas_bill: gas,
          parking,
          eid_bonus: eid,
          other_charge: 0,
          arrears,
          total,
          paid_amount: 0,
          status: "unpaid" as const,
          generated_at: today,
          due_date: dueDate,
        };
      });

      let inserted = 0;
      let failed = false;
      let errorMsg: string | undefined;
      const insertedFlats: FlatRef[] = [];

      if (rows.length > 0) {
        const { error: insertErr, count } = await admin
          .from("bills")
          .insert(rows, { count: "exact" });
        if (insertErr) {
          failed = true;
          errorMsg = insertErr.message;
        } else {
          inserted = count ?? rows.length;
          for (const f of candidateFlats) insertedFlats.push({ id: f.id, flat_no: f.flat_no });
        }
      }
      totalInserted += inserted;
      perMonth.push({
        month: m,
        eid_included: includeEid,
        inserted,
        already_billed: existingSet.size,
        inserted_flats: insertedFlats,
        skipped_flats: skippedFlats,
        failed,
        error: errorMsg,
      });
    }

    // ============================================================
    // Auto due-reminder notice (in-app) for the target month.
    // Inserted once per month — idempotent via a marker tag in body.
    // ============================================================
    const reminderTag = `[auto-due-reminder:${month}]`;
    let reminderCreated = false;
    let reminderSkipped: string | null = null;
    try {
      const { data: existingNotice } = await admin
        .from("notices")
        .select("id")
        .ilike("body", `%${reminderTag}%`)
        .maybeSingle();

      if (existingNotice) {
        reminderSkipped = "already_exists";
      } else {
        // Find all flats with outstanding dues (any month up to & including target)
        const { data: dueBills } = await admin
          .from("bills")
          .select("flat_id, total, paid_amount")
          .lte("month", month);

        const dueMap = new Map<string, number>();
        for (const b of dueBills ?? []) {
          const d = Number(b.total ?? 0) - Number(b.paid_amount ?? 0);
          if (d > 0) dueMap.set(b.flat_id, (dueMap.get(b.flat_id) ?? 0) + d);
        }

        if (dueMap.size > 0) {
          const flatMap = new Map((flats ?? []).map((f) => [f.id, f.flat_no]));
          const lines = Array.from(dueMap.entries())
            .map(([fid, amt]) => ({ flat_no: flatMap.get(fid) ?? "?", amt }))
            .sort((a, b) => a.flat_no.localeCompare(b.flat_no, undefined, { numeric: true }))
            .map((x) => `• ফ্ল্যাট ${x.flat_no} — ৳${x.amt.toLocaleString("en-BD")}`);
          const linesEn = Array.from(dueMap.entries())
            .map(([fid, amt]) => ({ flat_no: flatMap.get(fid) ?? "?", amt }))
            .sort((a, b) => a.flat_no.localeCompare(b.flat_no, undefined, { numeric: true }))
            .map((x) => `• Flat ${x.flat_no} — BDT ${x.amt.toLocaleString("en-BD")}`);

          const totalDue = Array.from(dueMap.values()).reduce((s, n) => s + n, 0);
          const [yy, mm] = month.split("-");
          const monthLabel = `${mm}/${yy}`;

          const { error: noticeErr } = await admin.from("notices").insert({
            title: `বকেয়া পরিশোধের অনুরোধ — ${monthLabel}`,
            title_bn: `বকেয়া পরিশোধের অনুরোধ — ${monthLabel}`,
            body:
              `প্রিয় ফ্ল্যাট মালিকগণ, ${monthLabel} মাসের বিল জেনারেট হয়েছে। ` +
              `নিম্নলিখিত ফ্ল্যাটসমূহের বকেয়া রয়েছে। দ্রুত পরিশোধের অনুরোধ করা হলো।\n\n` +
              `${lines.join("\n")}\n\nমোট বকেয়া: ৳${totalDue.toLocaleString("en-BD")}\n\n${reminderTag}`,
            body_bn:
              `প্রিয় ফ্ল্যাট মালিকগণ, ${monthLabel} মাসের বিল জেনারেট হয়েছে। ` +
              `নিম্নলিখিত ফ্ল্যাটসমূহের বকেয়া রয়েছে। দ্রুত পরিশোধের অনুরোধ করা হলো।\n\n` +
              `${lines.join("\n")}\n\nমোট বকেয়া: ৳${totalDue.toLocaleString("en-BD")}`,
            important: true,
            date: today,
          });
          if (noticeErr) {
            reminderSkipped = `insert_error: ${noticeErr.message}`;
          } else {
            reminderCreated = true;
          }
        } else {
          reminderSkipped = "no_dues";
        }
      }
    } catch (e) {
      reminderSkipped = `error: ${(e as Error).message}`;
      console.error("auto due-reminder notice error", e);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        month,
        backfill,
        flats_total: flats?.length ?? 0,
        inserted: totalInserted,
        months: perMonth,
        reminder_notice: { created: reminderCreated, skipped_reason: reminderSkipped },
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
