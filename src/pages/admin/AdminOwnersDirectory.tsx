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

  const renderGroup = (g: OwnerGroup) => (
    <div key={g.key} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          {g.owner_photo_url ? <AvatarImage src={g.owner_photo_url} /> : null}
          <InitialsFallback name={g.owner_name} seed={g.key} />
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{g.owner_name}</h3>
            <Badge variant="secondary" className="gap-1">
              <Home className="h-3 w-3" />
              {g.flats.length} {lang === "bn" ? "টি ফ্ল্যাট" : "flats"}
            </Badge>
          </div>
          {g.phone ? (
            <a
              href={`tel:${g.phone}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
            >
              <Phone className="h-3.5 w-3.5" />
              {g.phone}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "bn" ? "ফোন নেই" : "No phone"}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {g.flats.map((f) => {
          const isTenant = isTenantFlat(f);
          return (
            <div
              key={f.id}
              className="rounded-lg border border-border/60 bg-background/40 p-2.5 flex flex-wrap items-center gap-3"
            >
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center select-none cursor-help"
                      aria-label={`Flat ${f.flat_no}`}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-0 rotate-45 rounded-md bg-gradient-to-br shadow-soft",
                          getAvatarGradient(`flat:${f.flat_no}`)
                        )}
                      />
                      <span
                        aria-hidden
                        className="absolute inset-0 rotate-45 rounded-md bg-gradient-to-b from-white/25 to-transparent pointer-events-none"
                      />
                      <span className="relative text-white font-semibold text-[11px] tracking-wide drop-shadow-sm">
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
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="h-7 w-7">
                    {f.occupant_photo_url ? <AvatarImage src={f.occupant_photo_url} /> : null}
                    <InitialsFallback name={occName(f) || "Tenant"} seed={f.id} className="text-[10px]" />
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                      {lang === "bn" ? "ভাড়াটিয়া" : "Tenant"}
                    </div>
                    <div className="text-sm font-medium truncate">{occName(f) || "—"}</div>
                  </div>
                  {f.occupant_phone ? (
                    <a
                      href={`tel:${f.occupant_phone}`}
                      className="ml-auto inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {f.occupant_phone}
                    </a>
                  ) : (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {lang === "bn" ? "মোবাইল নেই" : "N/A"}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {lang === "bn" ? "মালিক নিজে থাকেন" : "Owner-occupied"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

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
