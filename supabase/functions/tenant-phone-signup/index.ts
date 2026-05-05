// Public: tenant self-signup using their 11-digit phone.
// Verifies that the phone matches a flat's occupant_phone where occupant_type='tenant'.
// Creates the auth user (if not existing), sets tenant role, links flat.tenant_user_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PHONE_RE = /^\d{11}$/;
const EMAIL_DOMAIN = "tenant.local";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");

    if (!PHONE_RE.test(phone)) return json({ error: "Phone must be exactly 11 digits" }, 400);
    if (password.length < 6 || password.length > 72) {
      return json({ error: "Password must be 6-72 characters" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Respect global signup toggle
    const { data: signupRow } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "signup_enabled")
      .maybeSingle();
    if (signupRow && signupRow.value === false) {
      return json({ error: "Sign up is currently disabled" }, 403);
    }

    // Find tenant flat(s) for this phone
    const { data: flats, error: fErr } = await admin
      .from("flats")
      .select("id, tenant_user_id, occupant_type, occupant_phone")
      .eq("occupant_phone", phone)
      .eq("occupant_type", "tenant");
    if (fErr) return json({ error: fErr.message }, 400);
    if (!flats || flats.length === 0) {
      return json({
        error:
          "এই মোবাইল নম্বরের জন্য কোনো ভাড়াটিয়া ফ্ল্যাট খুঁজে পাওয়া যায়নি। অনুগ্রহ করে আপনার ফ্ল্যাটের মালিক/অ্যাডমিনের সাথে যোগাযোগ করুন।",
      }, 404);
    }

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
        password,
        email_confirm: true,
        user_metadata: { display_name: phone, phone, tenant_login: true },
      });
      if (cErr || !createdRes.user) {
        return json({ error: cErr?.message ?? "Failed to create user" }, 400);
      }
      userId = createdRes.user.id;
      created = true;
    } else {
      // Existing user — update password so the tenant can log in with what they set
      const { error: uErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (uErr) return json({ error: uErr.message }, 400);
    }

    // Ensure tenant role
    await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "tenant" }, { onConflict: "user_id,role" });

    // Link all matching tenant flats
    const ids = flats.map((f) => f.id as string);
    const { error: linkErr } = await admin
      .from("flats")
      .update({ tenant_user_id: userId })
      .in("id", ids);
    if (linkErr) return json({ error: linkErr.message }, 400);

    return json({
      ok: true,
      user_id: userId,
      phone,
      created,
      linked_flat_count: ids.length,
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
