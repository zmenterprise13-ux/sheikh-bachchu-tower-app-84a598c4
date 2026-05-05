// Admin-only: create an auth user for a tenant using their 11-digit phone.
// Internal email = {phone}@tenant.local, default password = 12345678.
// Links the auth user to the flat as tenant_user_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PHONE_RE = /^\d{11}$/;
const DEFAULT_PASSWORD = "12345678";
const EMAIL_DOMAIN = "tenant.local";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const callerId = claimsData.claims.sub as string;
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin", "manager"])
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin/Manager only" }, 403);

    const { data: signupRow } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "signup_enabled")
      .maybeSingle();
    if (signupRow && signupRow.value === false) {
      return json({ error: "Sign up is currently disabled" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").trim();
    const flatId = String(body.flat_id ?? "").trim();
    if (!PHONE_RE.test(phone)) return json({ error: "Phone must be exactly 11 digits" }, 400);
    if (!flatId) return json({ error: "flat_id required" }, 400);

    const email = `${phone}@${EMAIL_DOMAIN}`;

    // Find or create the auth user
    let userId: string | null = null;
    let page = 1;
    while (page <= 10 && !userId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email.toLowerCase());
      if (u) userId = u.id;
      if (data.users.length < 200) break;
      page++;
    }

    let created = false;
    if (!userId) {
      const { data: createdRes, error: cErr } = await admin.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: phone, phone, tenant_login: true },
      });
      if (cErr || !createdRes.user) return json({ error: cErr?.message ?? "Failed to create user" }, 400);
      userId = createdRes.user.id;
      created = true;
    }

    // Ensure tenant role
    await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "tenant" }, { onConflict: "user_id,role" });

    // Link this flat as tenant; also stamp occupant_phone
    const { error: linkErr } = await admin
      .from("flats")
      .update({ tenant_user_id: userId, occupant_phone: phone, occupant_type: "tenant" })
      .eq("id", flatId);
    if (linkErr) return json({ error: linkErr.message }, 400);

    return json({
      ok: true,
      user_id: userId,
      email,
      phone,
      default_password: DEFAULT_PASSWORD,
      created,
      flat_id: flatId,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
