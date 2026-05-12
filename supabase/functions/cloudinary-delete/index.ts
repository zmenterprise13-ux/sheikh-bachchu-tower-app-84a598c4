import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CLOUD_NAME = "dbwc5vwyf";

function parseCloudinaryUrl(url: string): { publicId: string; resourceType: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("cloudinary.com")) return null;
    // /{cloud}/{resource_type}/upload/v123/folder/file.ext
    const parts = u.pathname.split("/").filter(Boolean);
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx < 0) return null;
    const resourceType = parts[uploadIdx - 1]; // image | raw | video
    let after = parts.slice(uploadIdx + 1);
    if (after[0] && /^v\d+$/.test(after[0])) after = after.slice(1);
    let publicId = after.join("/");
    if (resourceType === "image" || resourceType === "video") {
      publicId = publicId.replace(/\.[^/.]+$/, "");
    }
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const url: string | undefined = body?.url;
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseCloudinaryUrl(url);
    if (!parsed) {
      // Not a Cloudinary URL (e.g. legacy Supabase storage) — nothing to do.
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: "Cloudinary credentials missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await sha1Hex(
      `public_id=${parsed.publicId}&timestamp=${timestamp}${apiSecret}`,
    );

    const fd = new FormData();
    fd.append("public_id", parsed.publicId);
    fd.append("timestamp", String(timestamp));
    fd.append("api_key", apiKey);
    fd.append("signature", signature);

    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${parsed.resourceType}/destroy`,
      { method: "POST", body: fd },
    );
    const json = await resp.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: true, cloudinary: json }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
