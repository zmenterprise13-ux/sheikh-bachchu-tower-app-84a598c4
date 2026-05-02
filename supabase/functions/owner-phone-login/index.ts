// Public: sign in an owner using their 11-digit phone + password.
// Maps phone -> {phone}@owner.local and signs in with password.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PHONE_RE = /^\d{11}$/;
const EMAIL_DOMAIN = "owner.local";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");

    if (!PHONE_RE.test(phone)) {
      return json({ error: "Phone must be exactly 11 digits" }, 400);
    }
    if (!password) return json({ error: "Password required" }, 400);

    const email = `${phone}@${EMAIL_DOMAIN}`;
    const client = createClient(SUPABASE_URL, ANON);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return json({ error: "Invalid phone or password" }, 401);
    }

    return json({
      ok: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
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
