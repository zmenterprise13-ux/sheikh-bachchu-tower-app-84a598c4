import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { History, Search } from "lucide-react";
import { toast } from "sonner";

type Flat = { id: string; flat_no: string; floor: number; owner_name: string | null };
type Profile = { user_id: string; display_name: string | null; phone: string | null };
type ChangeRow = {
  id: string;
  table_name: string;
  record_id: string;
  flat_id: string | null;
  operation: "INSERT" | "UPDATE" | "DELETE";
  changed_by: string | null;
  changed_at: string;
  changed_fields: string[];
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
};

const TABLE_LABELS: Record<string, string> = {
  flats: "মালিক / ফ্ল্যাট",
  tenant_info: "ভাড়াটিয়া",
};

const OP_VARIANT: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  UPDATE: "bg-blue-100 text-blue-700 border-blue-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};
const OP_LABEL: Record<string, string> = { INSERT: "নতুন", UPDATE: "আপডেট", DELETE: "ডিলিট" };

// Fields we don't want to surface
const HIDDEN_FIELDS = new Set(["id", "created_at", "updated_at", "updated_by", "created_by"]);

const fmtVal = (v: any): string => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export default function AdminChangeHistory() {
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [flatFilter, setFlatFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: ch, error }, { data: fl }, { data: pr }] = await Promise.all([
        supabase.from("change_history").select("*").order("changed_at", { ascending: false }).limit(500),
        supabase.from("flats").select("id, flat_no, floor, owner_name").order("floor").order("flat_no"),
        supabase.from("profiles").select("user_id, display_name, phone"),
      ]);
      if (error) toast.error(error.message);
      setRows((ch || []) as ChangeRow[]);
      setFlats((fl || []) as Flat[]);
      const map: Record<string, Profile> = {};
      (pr || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
      setLoading(false);
    })();
  }, []);

  const flatMap = useMemo(() => {
    const m: Record<string, Flat> = {};
    flats.forEach((f) => { m[f.id] = f; });
    return m;
  }, [flats]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tableFilter !== "all" && r.table_name !== tableFilter) return false;
      if (flatFilter !== "all" && r.flat_id !== flatFilter) return false;
      if (!q) return true;
      const flat = r.flat_id ? flatMap[r.flat_id] : undefined;
      const who = r.changed_by ? profiles[r.changed_by]?.display_name ?? "" : "";
      const hay = [
        flat?.flat_no, flat?.owner_name, who,
        r.changed_fields.join(" "),
        r.new_data?.tenant_name, r.new_data?.owner_name,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, tableFilter, flatFilter, search, flatMap, profiles]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" /> পরিবর্তন ইতিহাস
          </h1>
          <p className="text-sm text-muted-foreground">
            মালিক ও ভাড়াটিয়ার তথ্যের সকল পরিবর্তনের লগ। সর্বশেষ ৫০০টি এন্ট্রি দেখানো হচ্ছে।
          </p>
        </div>

        <Card>
          <CardContent className="pt-4 grid gap-3 sm:grid-cols-3">
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger><SelectValue placeholder="টেবিল" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব টেবিল</SelectItem>
                <SelectItem value="flats">মালিক / ফ্ল্যাট</SelectItem>
                <SelectItem value="tenant_info">ভাড়াটিয়া</SelectItem>
              </SelectContent>
            </Select>
            <Select value={flatFilter} onValueChange={setFlatFilter}>
              <SelectTrigger><SelectValue placeholder="ফ্ল্যাট" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ফ্ল্যাট</SelectItem>
                {flats.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    ফ্ল্যাট {f.flat_no} {f.owner_name ? `— ${f.owner_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="খুঁজুন (নাম, ফিল্ড...)" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Skeleton className="h-96" />
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">কোনো পরিবর্তন পাওয়া যায়নি।</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const flat = r.flat_id ? flatMap[r.flat_id] : undefined;
              const who = r.changed_by ? profiles[r.changed_by]?.display_name ?? "—" : "সিস্টেম";
              const fields = (r.changed_fields || []).filter((f) => !HIDDEN_FIELDS.has(f));
              return (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline" className={OP_VARIANT[r.operation]}>{OP_LABEL[r.operation]}</Badge>
                      <Badge variant="outline">{TABLE_LABELS[r.table_name] || r.table_name}</Badge>
                      {flat && <span className="font-medium">ফ্ল্যাট {flat.flat_no}{flat.owner_name ? ` — ${flat.owner_name}` : ""}</span>}
                      <span className="text-muted-foreground ml-auto">
                        {new Date(r.changed_at).toLocaleString("bn-BD")} • {who}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {r.operation === "UPDATE" && fields.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="border px-2 py-1 text-left">ফিল্ড</th>
                              <th className="border px-2 py-1 text-left">পুরাতন</th>
                              <th className="border px-2 py-1 text-left">নতুন</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fields.map((f) => (
                              <tr key={f}>
                                <td className="border px-2 py-1 font-medium">{f}</td>
                                <td className="border px-2 py-1 text-muted-foreground line-through break-all">{fmtVal(r.old_data?.[f])}</td>
                                <td className="border px-2 py-1 break-all">{fmtVal(r.new_data?.[f])}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : r.operation === "INSERT" ? (
                      <p className="text-sm text-muted-foreground">নতুন রেকর্ড তৈরি হয়েছে।</p>
                    ) : r.operation === "DELETE" ? (
                      <p className="text-sm text-muted-foreground">রেকর্ড মুছে ফেলা হয়েছে।</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">কোনো গুরুত্বপূর্ণ পরিবর্তন নেই।</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
