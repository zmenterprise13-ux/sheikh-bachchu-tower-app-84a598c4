import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Activity, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Profile = { user_id: string; display_name: string | null; display_name_bn: string | null; phone: string | null };
type RoleRow = { user_id: string; role: string };
type ChangeRow = {
  id: string;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  changed_by: string | null;
  changed_at: string;
  changed_fields: string[];
};

const roleRank: Record<string, number> = { admin: 0, manager: 1, accountant: 2, owner: 3, tenant: 4 };

export default function AdminUserActivity() {
  const { lang } = useLang();
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: ch, error }, { data: pr }, { data: ur }] = await Promise.all([
        supabase.from("change_history")
          .select("id, table_name, operation, changed_by, changed_at, changed_fields")
          .order("changed_at", { ascending: false })
          .limit(2000),
        supabase.from("profiles").select("user_id, display_name, display_name_bn, phone"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) toast.error(error.message);
      setRows((ch || []) as ChangeRow[]);
      const pm: Record<string, Profile> = {};
      (pr || []).forEach((p: any) => { pm[p.user_id] = p; });
      setProfiles(pm);
      const rm: Record<string, string[]> = {};
      (ur as RoleRow[] || []).forEach(r => { (rm[r.user_id] ||= []).push(r.role); });
      setRoles(rm);
      setLoading(false);
    })();
  }, []);

  const roleLabel = (uid: string) => {
    const list = roles[uid] || [];
    const pick = list.sort((a, b) => (roleRank[a] ?? 99) - (roleRank[b] ?? 99))[0];
    if (!pick) return lang === "bn" ? "অজানা" : "Unknown";
    const map: Record<string, { en: string; bn: string }> = {
      admin: { en: "Admin", bn: "অ্যাডমিন" },
      manager: { en: "Manager", bn: "ম্যানেজার" },
      accountant: { en: "Accountant", bn: "অ্যাকাউন্ট্যান্ট" },
      owner: { en: "Owner", bn: "মালিক" },
      tenant: { en: "Tenant", bn: "ভাড়াটিয়া" },
    };
    return lang === "bn" ? map[pick]?.bn ?? pick : map[pick]?.en ?? pick;
  };

  const opLabel = (op: string) => {
    if (lang === "bn") return op === "INSERT" ? "নতুন" : op === "UPDATE" ? "আপডেট" : "ডিলিট";
    return op === "INSERT" ? "Created" : op === "UPDATE" ? "Updated" : "Deleted";
  };
  const opCls = (op: string) =>
    op === "INSERT" ? "bg-success/15 text-success border-success/30"
    : op === "UPDATE" ? "bg-primary/10 text-primary border-primary/30"
    : "bg-destructive/15 text-destructive border-destructive/30";

  const grouped = useMemo(() => {
    const map = new Map<string, { uid: string; rows: ChangeRow[]; lastAt: string; tables: Map<string, number>; ops: Record<string, number> }>();
    rows.forEach((r) => {
      const uid = r.changed_by || "_unknown";
      let g = map.get(uid);
      if (!g) {
        g = { uid, rows: [], lastAt: r.changed_at, tables: new Map(), ops: { INSERT: 0, UPDATE: 0, DELETE: 0 } };
        map.set(uid, g);
      }
      g.rows.push(r);
      if (r.changed_at > g.lastAt) g.lastAt = r.changed_at;
      g.tables.set(r.table_name, (g.tables.get(r.table_name) || 0) + 1);
      g.ops[r.operation] = (g.ops[r.operation] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [rows]);

  const filtered = useMemo(() => {
    if (!q.trim()) return grouped;
    const s = q.toLowerCase();
    return grouped.filter((g) => {
      const p = profiles[g.uid];
      const name = (p?.display_name || "") + " " + (p?.display_name_bn || "") + " " + (p?.phone || "");
      return name.toLowerCase().includes(s) || roleLabel(g.uid).toLowerCase().includes(s);
    });
  }, [grouped, q, profiles, roles, lang]);

  const nameOf = (uid: string) => {
    if (uid === "_unknown") return lang === "bn" ? "অজানা ইউজার" : "Unknown user";
    const p = profiles[uid];
    if (!p) return uid.slice(0, 8);
    return (lang === "bn" ? p.display_name_bn || p.display_name : p.display_name) || p.phone || uid.slice(0, 8);
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleString(lang === "bn" ? "bn-BD" : "en-US");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {lang === "bn" ? "ইউজার অ্যাক্টিভিটি" : "User Activity"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "bn"
                ? "প্রতিটি ইউজার অ্যাপে কী কী পরিবর্তন করেছেন তার সারাংশ"
                : "Summary of changes each user has made in the app"}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "bn" ? "নাম / রোল খুঁজুন" : "Search name / role"}
              className="pl-9 w-64"
            />
          </div>
        </div>

        {loading && (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        )}

        {!loading && filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            {lang === "bn" ? "কোনো অ্যাক্টিভিটি নেই" : "No activity found"}
          </CardContent></Card>
        )}

        {!loading && filtered.map((g) => {
          const isOpen = !!expanded[g.uid];
          return (
            <Card key={g.uid} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/40 transition-base py-4"
                onClick={() => setExpanded((s) => ({ ...s, [g.uid]: !s[g.uid] }))}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {nameOf(g.uid)}
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {roleLabel(g.uid)}
                      </span>
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {lang === "bn" ? "সর্বশেষ:" : "Last:"} {fmtTime(g.lastAt)}
                      {" · "}
                      {lang === "bn" ? "মোট" : "Total"} {g.rows.length} {lang === "bn" ? "অ্যাকশন" : "actions"}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(["INSERT", "UPDATE", "DELETE"] as const).map((op) =>
                        g.ops[op] > 0 ? (
                          <span key={op} className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", opCls(op))}>
                            {opLabel(op)} · {g.ops[op]}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="border-t border-border pt-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {g.rows.slice(0, 100).map((r) => (
                      <div key={r.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-border/50 last:border-0">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0", opCls(r.operation))}>
                          {opLabel(r.operation)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground">{r.table_name}</span>
                          {r.changed_fields?.length > 0 && (
                            <span className="text-muted-foreground"> · {r.changed_fields.join(", ")}</span>
                          )}
                        </div>
                        <span className="text-muted-foreground shrink-0">{fmtTime(r.changed_at)}</span>
                      </div>
                    ))}
                    {g.rows.length > 100 && (
                      <div className="text-xs text-muted-foreground text-center pt-2">
                        {lang === "bn" ? `আরো ${g.rows.length - 100} টি (সর্বশেষ ১০০ দেখানো হচ্ছে)` : `${g.rows.length - 100} more (showing latest 100)`}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
