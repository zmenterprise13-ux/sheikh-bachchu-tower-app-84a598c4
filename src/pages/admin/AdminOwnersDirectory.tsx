import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Input } from "@/components/ui/input";
import { Search, Phone, Home, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getAvatarGradient } from "@/lib/avatar";
import { InitialsFallback } from "@/components/InitialsFallback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Flat = {
  id: string;
  flat_no: string;
  floor: number;
  owner_name: string | null;
  owner_name_bn: string | null;
  phone: string | null;
  owner_photo_url: string | null;
  occupant_type: string;
  occupant_name: string | null;
  occupant_name_bn: string | null;
  occupant_phone: string | null;
  occupant_photo_url: string | null;
};

type OwnerGroup = {
  key: string;
  owner_name: string;
  owner_name_bn: string | null;
  phone: string | null;
  owner_photo_url: string | null;
  flats: Flat[];
};

const sideOf = (flat_no: string): "east" | "west" => {
  // strip non-digits, take last digit
  const digits = flat_no.replace(/\D/g, "");
  const last = digits.slice(-1);
  return last === "1" ? "east" : "west";
};

export default function AdminOwnersDirectory() {
  const { lang } = useLang();
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "tenant" | "owner">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("flats")
        .select(
          "id, flat_no, floor, owner_name, owner_name_bn, phone, owner_photo_url, occupant_type, occupant_name, occupant_name_bn, occupant_phone, occupant_photo_url"
        )
        .order("floor")
        .order("flat_no");
      setFlats((data as Flat[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const ownerName = (f: Flat) =>
    (lang === "bn" ? f.owner_name_bn || f.owner_name : f.owner_name) || (lang === "bn" ? "অজানা" : "Unknown");
  const occName = (f: Flat) =>
    (lang === "bn" ? f.occupant_name_bn || f.occupant_name : f.occupant_name) || "";

  const groupBySide = (side: "east" | "west") => {
    const filtered = flats.filter((f) => sideOf(f.flat_no) === side);
    const map = new Map<string, OwnerGroup>();
    for (const f of filtered) {
      const key = (f.phone && f.phone.trim()) || `name:${(f.owner_name || "").trim().toLowerCase()}` || f.id;
      if (!map.has(key)) {
        map.set(key, {
          key,
          owner_name: ownerName(f),
          owner_name_bn: f.owner_name_bn,
          phone: f.phone,
          owner_photo_url: f.owner_photo_url,
          flats: [],
        });
      }
      map.get(key)!.flats.push(f);
    }
    return Array.from(map.values()).sort((a, b) => b.flats.length - a.flats.length);
  };

  const east = useMemo(() => groupBySide("east"), [flats, lang]);
  const west = useMemo(() => groupBySide("west"), [flats, lang]);

  const matches = (g: OwnerGroup) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      g.owner_name.toLowerCase().includes(s) ||
      (g.phone || "").includes(q) ||
      g.flats.some(
        (f) =>
          f.flat_no.toLowerCase().includes(s) ||
          (f.occupant_name || "").toLowerCase().includes(s) ||
          (f.occupant_phone || "").includes(q)
      )
    );
  };

  const renderGroup = (g: OwnerGroup) => {
    const tenantCount = g.flats.filter(isTenantFlat).length;
    const ownerOccCount = g.flats.length - tenantCount;
    return (
      <div
        key={g.key}
        className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:shadow-elevated hover:-translate-y-0.5"
      >
        {/* Gradient header strip */}
        <div
          className={cn(
            "h-16 bg-gradient-to-br relative",
            getAvatarGradient(g.key),
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_60%)]" />
        </div>

        <div className="px-4 pb-4 -mt-8 relative">
          <div className="flex items-end gap-3">
            <Avatar className="h-16 w-16 ring-4 ring-card shadow-lg shrink-0">
              {g.owner_photo_url ? <AvatarImage src={g.owner_photo_url} /> : null}
              <InitialsFallback name={g.owner_name} seed={g.key} className="text-base" />
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <h3 className="font-semibold text-foreground truncate leading-tight">{g.owner_name}</h3>
              {g.phone ? (
                <a
                  href={`tel:${g.phone}`}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-0.5"
                >
                  <Phone className="h-3 w-3" />
                  {g.phone}
                </a>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {lang === "bn" ? "ফোন নেই" : "No phone"}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="gap-1 text-[10px] py-0.5">
              <Home className="h-2.5 w-2.5" />
              {g.flats.length} {lang === "bn" ? "টি ফ্ল্যাট" : "flats"}
            </Badge>
            {ownerOccCount > 0 && (
              <Badge variant="outline" className="gap-1 text-[10px] py-0.5 border-success/40 text-success">
                {ownerOccCount} {lang === "bn" ? "নিজে" : "self"}
              </Badge>
            )}
            {tenantCount > 0 && (
              <Badge variant="outline" className="gap-1 text-[10px] py-0.5 border-accent/40 text-accent">
                {tenantCount} {lang === "bn" ? "ভাড়াটিয়া" : "tenant"}
              </Badge>
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            {g.flats.map((f) => {
              const isTenant = isTenantFlat(f);
              return (
                <div
                  key={f.id}
                  className={cn(
                    "rounded-xl border p-2 flex items-center gap-2.5 transition-colors",
                    isTenant
                      ? "border-accent/20 bg-accent/5 hover:bg-accent/10"
                      : "border-border bg-muted/30 hover:bg-muted/50",
                  )}
                >
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center select-none cursor-help"
                          aria-label={`Flat ${f.flat_no}`}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "absolute inset-0 rotate-45 rounded-md bg-gradient-to-br shadow-soft",
                              getAvatarGradient(`flat:${f.flat_no}`),
                            )}
                          />
                          <span
                            aria-hidden
                            className="absolute inset-0 rotate-45 rounded-md bg-gradient-to-b from-white/30 to-transparent pointer-events-none"
                          />
                          <span className="relative text-white font-semibold text-[11px] leading-none tracking-tight drop-shadow-sm">
                            {f.flat_no}
                          </span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-semibold">
                            {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {f.flat_no}
                          </div>
                          <div className="text-muted-foreground">
                            {isTenant
                              ? lang === "bn" ? "ভাড়াটিয়া" : "Tenant"
                              : lang === "bn" ? "মালিক নিজে থাকেন" : "Owner-occupied"}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {isTenant ? (
                    <>
                      <Avatar className="h-7 w-7 ring-2 ring-background shrink-0">
                        {f.occupant_photo_url ? <AvatarImage src={f.occupant_photo_url} /> : null}
                        <InitialsFallback name={occName(f) || "Tenant"} seed={f.id} className="text-[10px]" />
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-wide text-accent font-medium leading-none">
                          {lang === "bn" ? "ভাড়াটিয়া" : "Tenant"}
                        </div>
                        <div className="text-sm font-medium truncate leading-tight mt-0.5">
                          {occName(f) || "—"}
                        </div>
                      </div>
                      {f.occupant_phone ? (
                        <a
                          href={`tel:${f.occupant_phone}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                        >
                          <Phone className="h-3 w-3" />
                          {f.occupant_phone}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                          <Phone className="h-3 w-3" />
                          {lang === "bn" ? "মোবাইল নেই" : "N/A"}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-success font-medium inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      {lang === "bn" ? "মালিক নিজে থাকেন" : "Owner-occupied"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const isTenantFlat = (f: Flat) =>
    Boolean(f.occupant_name && f.occupant_name.trim()) ||
    (f.occupant_type === "tenant" && Boolean(f.occupant_phone));

  const renderList = (groups: OwnerGroup[]) => {
    const visible = groups
      .map((g) => {
        if (filter === "all") return g;
        const flats = g.flats.filter((f) => (filter === "tenant" ? isTenantFlat(f) : !isTenantFlat(f)));
        return flats.length ? { ...g, flats } : null;
      })
      .filter((g): g is OwnerGroup => g !== null)
      .filter(matches);
    if (visible.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-8">
          {lang === "bn" ? "কোনো তথ্য নেই" : "No data"}
        </p>
      );
    }
    return <div className="grid gap-3 md:grid-cols-2">{visible.map(renderGroup)}</div>;
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {lang === "bn" ? "ফ্ল্যাট মালিকদের তালিকা" : "Flat Owners Directory"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "bn"
                ? "সকল মালিক ও তাদের ফ্ল্যাট – ফোন নম্বরে ক্লিক করলেই কল করতে পারবেন।"
                : "All owners and their flats – tap a phone number to call."}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "bn" ? "নাম, ফোন বা ফ্ল্যাট খুঁজুন..." : "Search name, phone, flat..."}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <Tabs defaultValue="east" className="w-full">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="east" className="gap-2">
                <Users className="h-4 w-4" />
                {lang === "bn" ? "পূর্ব পাশ" : "East Side"}
                <Badge variant="secondary" className="ml-1">{east.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="west" className="gap-2">
                <Users className="h-4 w-4" />
                {lang === "bn" ? "পশ্চিম পাশ" : "West Side"}
                <Badge variant="secondary" className="ml-1">{west.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <div className="mt-3 flex justify-end">
              <ToggleGroup
                type="single"
                value={filter}
                onValueChange={(v) => v && setFilter(v as any)}
                className="bg-muted rounded-md p-1"
              >
                <ToggleGroupItem value="all" className="text-xs px-3">
                  {lang === "bn" ? "সব" : "All"}
                </ToggleGroupItem>
                <ToggleGroupItem value="owner" className="text-xs px-3">
                  {lang === "bn" ? "মালিক-নিজে" : "Owner-occupied"}
                </ToggleGroupItem>
                <ToggleGroupItem value="tenant" className="text-xs px-3">
                  {lang === "bn" ? "ভাড়াটিয়া" : "Tenant"}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <TabsContent value="east" className="mt-4">{renderList(east)}</TabsContent>
            <TabsContent value="west" className="mt-4">{renderList(west)}</TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
