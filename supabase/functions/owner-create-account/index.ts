// Admin-only: create an auth user for an owner using their 11-digit phone.
// Internal email = {phone}@owner.local, default password = 12345678.
// Also links the auth user to the flat (sets flats.owner_user_id, phone).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PHONE_RE = /^\d{11}$/;
const DEFAULT_PASSWORD = "12345678";
const EMAIL_DOMAIN = "owner.local";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
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
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    // 2. Validate input
    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").trim();
    const flatId = String(body.flat_id ?? "").trim();
    if (!PHONE_RE.test(phone)) {
      return json({ error: "Phone must be exactly 11 digits" }, 400);
    }
    if (!flatId) return json({ error: "flat_id required" }, 400);

    const email = `${phone}@${EMAIL_DOMAIN}`;

    // 3. Find or create the auth user
    let userId: string | null = null;
    // Try to find existing user
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );

    if (found) {
      userId = found.id;
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: phone, phone, owner_login: true },
      });
      if (cErr || !created.user) {
        return json({ error: cErr?.message ?? "Failed to create user" }, 400);
      }
      userId = created.user.id;
    }

    // 4. Ensure 'owner' role exists (handle_new_user trigger usually does this,
    //    but be safe in case the user already existed without a role).
    await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "owner" }, { onConflict: "user_id,role" });

    // 5. Link the auth user to the flat & set phone
    const { error: flatErr } = await admin
      .from("flats")
      .update({ owner_user_id: userId, phone })
      .eq("id", flatId);
    if (flatErr) return json({ error: flatErr.message }, 400);

    return json({
      ok: true,
      user_id: userId,
      email,
      phone,
      default_password: DEFAULT_PASSWORD,
      created: !found,
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
