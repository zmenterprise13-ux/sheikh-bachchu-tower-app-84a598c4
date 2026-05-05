import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | { action: "list" }
  | { action: "assign"; email: string; role: "accountant" | "manager" | "admin" }
  | { action: "revoke"; user_id: string; role: "accountant" | "manager" | "admin" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Action;

    if ((body as any).action === "list_all") {
      // Fetch all auth users (paginated up to 2000)
      const users: any[] = [];
      let page = 1;
      while (page <= 10) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        users.push(...data.users);
        if (data.users.length < 200) break;
        page++;
      }
      const ids = users.map((u) => u.id);
      const safeIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];

      const [{ data: profiles }, { data: roles }, { data: flats }] = await Promise.all([
        admin.from("profiles").select("user_id, display_name, display_name_bn, phone, avatar_url").in("user_id", safeIds),
        admin.from("user_roles").select("user_id, role").in("user_id", safeIds),
        admin.from("flats").select("id, flat_no, owner_user_id, owner_name, owner_name_bn").in("owner_user_id", safeIds),
      ]);

      const profileMap = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      const flatMap = new Map<string, any[]>();
      (flats ?? []).forEach((f: any) => {
        const arr = flatMap.get(f.owner_user_id) ?? [];
        arr.push({ id: f.id, flat_no: f.flat_no, owner_name: f.owner_name, owner_name_bn: f.owner_name_bn });
        flatMap.set(f.owner_user_id, arr);
      });

      const result = users.map((u) => ({
        user_id: u.id,
        email: u.email ?? null,
        phone: u.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        confirmed: !!(u.email_confirmed_at || u.phone_confirmed_at),
        banned_until: (u as any).banned_until ?? null,
        display_name: profileMap.get(u.id)?.display_name ?? null,
        display_name_bn: profileMap.get(u.id)?.display_name_bn ?? null,
        profile_phone: profileMap.get(u.id)?.phone ?? null,
        avatar_url: profileMap.get(u.id)?.avatar_url ?? null,
        roles: roleMap.get(u.id) ?? [],
        flats: flatMap.get(u.id) ?? [],
      }));

      result.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((body as any).action === "delete_user") {
      const uid = (body as any).user_id as string;
      if (!uid) throw new Error("user_id required");
      if (uid === userRes.user.id) throw new Error("Cannot delete yourself");
      await admin.from("user_roles").delete().eq("user_id", uid);
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((body as any).action === "set_ban") {
      const uid = (body as any).user_id as string;
      const banned = !!(body as any).banned;
      if (!uid) throw new Error("user_id required");
      if (uid === userRes.user.id) throw new Error("Cannot ban yourself");
      const { error } = await admin.auth.admin.updateUserById(uid, {
        ban_duration: banned ? "100000h" : "none",
      } as any);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((body as any).action === "assign_by_id") {
      const uid = (body as any).user_id as string;
      const role = (body as any).role as string;
      if (!uid || !role) throw new Error("user_id and role required");
      if (!["owner", "accountant", "manager", "admin"].includes(role)) throw new Error("Invalid role");
      const { error } = await admin.from("user_roles").insert({ user_id: uid, role });
      if (error && !String(error.message).includes("duplicate")) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "list") {
      // Get all role rows except plain owners (we still include accountant/manager/admin)
      const { data: roles, error } = await admin
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .in("role", ["admin", "accountant", "manager"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

      // Fetch emails via auth admin
      const emailMap = new Map<string, string>();
      for (const id of ids) {
        try {
          const { data } = await admin.auth.admin.getUserById(id);
          if (data?.user?.email) emailMap.set(id, data.user.email);
        } catch (_) {}
      }

      const profileMap = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

      const result = (roles ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        created_at: r.created_at,
        email: emailMap.get(r.user_id) ?? null,
        display_name: profileMap.get(r.user_id)?.display_name ?? null,
        phone: profileMap.get(r.user_id)?.phone ?? null,
      }));

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "assign") {
      const email = body.email.trim().toLowerCase();
      if (!email) throw new Error("Email required");
      if (!["accountant", "manager", "admin"].includes(body.role)) throw new Error("Invalid role");

      // Find user by email - paginate through up to 1000
      let foundId: string | null = null;
      let page = 1;
      while (page <= 10 && !foundId) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email);
        if (u) foundId = u.id;
        if (data.users.length < 200) break;
        page++;
      }
      if (!foundId) throw new Error("User with this email not found. They must register first.");

      const { error: insErr } = await admin
        .from("user_roles")
        .insert({ user_id: foundId, role: body.role });
      if (insErr && !String(insErr.message).includes("duplicate")) throw insErr;

      return new Response(JSON.stringify({ ok: true, user_id: foundId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "revoke") {
      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", body.user_id)
        .eq("role", body.role);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
