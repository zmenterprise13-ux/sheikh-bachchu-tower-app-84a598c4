import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TKey } from "@/i18n/translations";
import {
  LayoutDashboard,
  Building,
  Store,
  Car,
  Receipt,
  ReceiptText,
  Wallet,
  HandCoins,
  FileBarChart,
  Megaphone,
  CreditCard,
  History,
  Settings as SettingsIcon,
  BookOpen,
  Menu,
  MoreHorizontal,
  Users,
  Table as TableIcon,
  Building2,
  Box,
  ScanSearch,
  KeyRound,
  UserCircle,
  UserSquare2,
  UserCog,
  ChevronDown,
  MessageSquare,
  Rocket,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelectedFlatId } from "@/hooks/useSelectedFlatId";
import { usePendingPaymentRequests } from "@/hooks/usePendingPaymentRequests";

type NavItem = { to: string; key: TKey; icon: React.ElementType };
type NavGroup = { label: TKey; items: NavItem[] };

const adminGroups: NavGroup[] = [
  {
    label: "groupOverview" as TKey,
    items: [
      { to: "/admin", key: "dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "groupProperties" as TKey,
    items: [
      { to: "/admin/flats", key: "flats", icon: Building },
      { to: "/admin/flats/table", key: "flatsTable" as TKey, icon: TableIcon },
      { to: "/admin/building", key: "buildingOverview" as TKey, icon: Building2 },
      { to: "/admin/building/3d", key: "building3D" as TKey, icon: Box },
      { to: "/admin/shops", key: "shops", icon: Store },
      { to: "/admin/parking", key: "parkingNav", icon: Car },
    ],
  },
  {
    label: "groupFinance" as TKey,
    items: [
      { to: "/admin/dues", key: "dues", icon: Receipt },
      { to: "/admin/payment-requests", key: "paymentRequests" as TKey, icon: CreditCard },
      { to: "/admin/receipts", key: "ownerReceipts" as TKey, icon: ReceiptText },
      { to: "/admin/ledger", key: "ledger", icon: BookOpen },
      { to: "/admin/reconcile", key: "reconcile" as TKey, icon: ScanSearch },
      { to: "/admin/expenses", key: "expenses", icon: Wallet },
      { to: "/admin/loans", key: "loans" as TKey, icon: HandCoins },
    ],
  },
  {
    label: "groupReports" as TKey,
    items: [
      { to: "/admin/reports", key: "reports", icon: FileBarChart },
      { to: "/admin/bills-report", key: "billsReport" as TKey, icon: FileBarChart },
      { to: "/admin/notices", key: "notices", icon: Megaphone },
    ],
  },
  {
    label: "groupPeople" as TKey,
    items: [
      { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
      { to: "/admin/committee", key: "committee" as TKey, icon: Users },
      { to: "/tenant-info", key: "tenantInfo" as TKey, icon: UserSquare2 },
      { to: "/owner-info", key: "ownerDetailedInfo" as TKey, icon: UserSquare2 },
      { to: "/admin/users", key: "staffRoles" as TKey, icon: UserCog },
      { to: "/admin/user-management", key: "userManagement" as TKey, icon: Users },
    ],
  },
  {
    label: "groupSystem" as TKey,
    items: [
      { to: "/admin/feedback", key: "userFeedback" as TKey, icon: MessageSquare },
      { to: "/admin/user-activity", key: "userActivity" as TKey, icon: Activity },
      { to: "/admin/change-history", key: "changeHistory" as TKey, icon: History },
      { to: "/admin/settings", key: "settings", icon: SettingsIcon },
    ],
  },
  {
    label: "groupAccount" as TKey,
    items: [
      { to: "/account/profile", key: "myProfile" as TKey, icon: UserCircle },
      { to: "/account/password", key: "changePassword" as TKey, icon: KeyRound },
    ],
  },
];

const ownerGroups: NavGroup[] = [
  {
    label: "groupOverview" as TKey,
    items: [
      { to: "/owner", key: "dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "groupFinance" as TKey,
    items: [
      { to: "/owner/dues", key: "myDues", icon: CreditCard },
      { to: "/owner/payments", key: "myPayments", icon: History },
      { to: "/owner/receipts", key: "myReceipts" as TKey, icon: ReceiptText },
      { to: "/owner/ledger", key: "myLedger", icon: BookOpen },
    ],
  },
  {
    label: "groupProperties" as TKey,
    items: [
      { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
      { to: "/admin/building", key: "buildingOverview" as TKey, icon: Building2 },
      { to: "/admin/building/3d", key: "building3D" as TKey, icon: Box },
    ],
  },
  {
    label: "groupReports" as TKey,
    items: [
      { to: "/owner/notices", key: "notices", icon: Megaphone },
      { to: "/owner/committee", key: "committee" as TKey, icon: Users },
      { to: "/owner/reports", key: "reports", icon: FileBarChart },
      { to: "/owner/finance-report", key: "financeReport" as TKey, icon: FileBarChart },
    ],
  },
  {
    label: "groupPeople" as TKey,
    items: [
      { to: "/owner-info", key: "ownerDetailedInfo" as TKey, icon: UserSquare2 },
      { to: "/tenant-info", key: "tenantInfo" as TKey, icon: UserSquare2 },
    ],
  },
  {
    label: "groupAccount" as TKey,
    items: [
      { to: "/feedback", key: "feedback" as TKey, icon: MessageSquare },
      { to: "/account/profile", key: "myProfile" as TKey, icon: UserCircle },
      { to: "/account/password", key: "changePassword" as TKey, icon: KeyRound },
    ],
  },
];

const accountantGroups: NavGroup[] = [
  {
    label: "groupOverview" as TKey,
    items: [{ to: "/accountant", key: "dashboard", icon: LayoutDashboard }],
  },
  {
    label: "groupFinance" as TKey,
    items: [
      { to: "/admin/payment-requests", key: "paymentRequests" as TKey, icon: CreditCard },
      { to: "/admin/dues", key: "dues", icon: Receipt },
      { to: "/admin/receipts", key: "ownerReceipts" as TKey, icon: ReceiptText },
      { to: "/admin/ledger", key: "ledger", icon: BookOpen },
      { to: "/admin/reconcile", key: "reconcile" as TKey, icon: ScanSearch },
      { to: "/admin/expenses", key: "expenses", icon: Wallet },
    ],
  },
  {
    label: "groupReports" as TKey,
    items: [{ to: "/admin/reports", key: "reports", icon: FileBarChart }],
  },
  {
    label: "groupPeople" as TKey,
    items: [{ to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users }],
  },
  {
    label: "groupAccount" as TKey,
    items: [
      { to: "/feedback", key: "feedback" as TKey, icon: MessageSquare },
      { to: "/account/profile", key: "myProfile" as TKey, icon: UserCircle },
      { to: "/account/password", key: "changePassword" as TKey, icon: KeyRound },
    ],
  },
];

const managerGroups: NavGroup[] = [
  {
    label: "groupOverview" as TKey,
    items: [{ to: "/manager", key: "dashboard", icon: LayoutDashboard }],
  },
  {
    label: "groupProperties" as TKey,
    items: [
      { to: "/admin/flats", key: "flats", icon: Building },
      { to: "/admin/flats/table", key: "flatsTable" as TKey, icon: TableIcon },
      { to: "/admin/shops", key: "shops", icon: Store },
      { to: "/admin/parking", key: "parkingNav", icon: Car },
    ],
  },
  {
    label: "groupFinance" as TKey,
    items: [
      { to: "/admin/dues", key: "dues", icon: Receipt },
      { to: "/admin/payment-requests", key: "paymentRequests" as TKey, icon: CreditCard },
      { to: "/admin/loans", key: "loans" as TKey, icon: HandCoins },
    ],
  },
  {
    label: "groupReports" as TKey,
    items: [
      { to: "/admin/notices", key: "notices", icon: Megaphone },
      { to: "/admin/reports", key: "reports", icon: FileBarChart },
      { to: "/admin/feedback", key: "userFeedback" as TKey, icon: MessageSquare },
    ],
  },
  {
    label: "groupPeople" as TKey,
    items: [
      { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
      { to: "/tenant-info", key: "tenantInfo" as TKey, icon: UserSquare2 },
    ],
  },
  {
    label: "groupAccount" as TKey,
    items: [
      { to: "/feedback", key: "feedback" as TKey, icon: MessageSquare },
      { to: "/account/profile", key: "myProfile" as TKey, icon: UserCircle },
      { to: "/account/password", key: "changePassword" as TKey, icon: KeyRound },
    ],
  },
];

function groupsFor(role: string | null): NavGroup[] {
  if (role === "admin") return adminGroups;
  if (role === "manager") return managerGroups;
  if (role === "accountant") return accountantGroups;
  if (role === "tenant") {
    return ownerGroups
      .map((g) => ({ ...g, items: g.items.filter((i) => !i.to.startsWith("/admin/")) }))
      .filter((g) => g.items.length > 0);
  }
  return ownerGroups;
}

function flattenGroups(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

type FlatLite = {
  id: string;
  flat_no: string;
  owner_name: string | null;
  owner_name_bn: string | null;
  occupant_name: string | null;
  occupant_name_bn: string | null;
  occupant_phone: string | null;
  tenant_user_id: string | null;
};

/** Hook to load the current user's display name from profiles + selected/auto-picked flat. */
function useAccountName() {
  const { user, role } = useAuth();
  const { lang } = useLang();
  const { selectedFlatId, setSelectedFlatId } = useSelectedFlatId();
  const [name, setName] = useState<string>("");
  const [flats, setFlats] = useState<FlatLite[]>([]);
  const [chosenId, setChosenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setName(""); setFlats([]); setChosenId(null);
      return;
    }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, display_name_bn, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      const profileName = lang === "bn"
        ? (profile?.display_name_bn || profile?.display_name)
        : (profile?.display_name || profile?.display_name_bn);
      const phone = (profile?.phone || user.user_metadata?.phone || profileName || "").trim();

      const flatCols = "id, flat_no, floor, updated_at, owner_name, owner_name_bn, phone, occupant_type, occupant_name, occupant_name_bn, occupant_phone, owner_user_id, tenant_user_id";

      let { data: rows } = await supabase
        .from("flats")
        .select(flatCols)
        .or(`owner_user_id.eq.${user.id},tenant_user_id.eq.${user.id}`);

      if ((!rows || rows.length === 0) && phone) {
        const byPhone = await supabase
          .from("flats")
          .select(flatCols)
          .or(`phone.eq.${phone},occupant_phone.eq.${phone}`);
        rows = byPhone.data;
      }

      let chosen: any = null;
      if (rows && rows.length > 0) {
        if (selectedFlatId) chosen = rows.find((r: any) => r.id === selectedFlatId) || null;
        if (!chosen) {
          if (rows.length === 1) {
            chosen = rows[0];
          } else {
            const ids = rows.map((f: any) => f.id);
            const { data: bills } = await supabase
              .from("bills")
              .select("flat_id, status, total, paid_amount, arrears, updated_at")
              .in("flat_id", ids)
              .neq("status", "paid");
            const dueMap = new Map<string, { due: number; latest: number }>();
            (bills || []).forEach((b: any) => {
              const due = Number(b.total || 0) + Number(b.arrears || 0) - Number(b.paid_amount || 0);
              const ts = b.updated_at ? new Date(b.updated_at).getTime() : 0;
              const cur = dueMap.get(b.flat_id) || { due: 0, latest: 0 };
              dueMap.set(b.flat_id, { due: cur.due + Math.max(0, due), latest: Math.max(cur.latest, ts) });
            });
            const scored = rows.map((f: any) => {
              const d = dueMap.get(f.id) || { due: 0, latest: 0 };
              return { flat: f, due: d.due, activity: Math.max(d.latest, f.updated_at ? new Date(f.updated_at).getTime() : 0) };
            });
            scored.sort((a, b) => (b.due - a.due) || (b.activity - a.activity));
            chosen = scored[0].flat;
          }
        }
      }

      const isTenantUser = chosen?.tenant_user_id === user.id || (!!phone && chosen?.occupant_phone === phone);
      const flatName = chosen
        ? (lang === "bn"
            ? ((isTenantUser ? (chosen.occupant_name_bn || chosen.occupant_name) : null)
                || chosen.owner_name_bn || chosen.owner_name)
            : ((isTenantUser ? (chosen.occupant_name || chosen.occupant_name_bn) : null)
                || chosen.owner_name || chosen.owner_name_bn))
        : null;

      if (cancelled) return;
      const isJustPhone = !!profileName && !!phone && profileName.trim() === phone;
      const finalName = (!profileName || isJustPhone) && flatName ? flatName : (profileName || flatName);
      setName(finalName || user.email || "");
      setFlats((rows || []) as FlatLite[]);
      setChosenId(chosen?.id || null);
    })();
    return () => { cancelled = true; };
  }, [user, lang, role, selectedFlatId]);

  return { name, flats, chosenId, setSelectedFlatId };
}

function AccountHeader() {
  const { name, flats, chosenId, setSelectedFlatId } = useAccountName();
  const { role } = useAuth();
  const { t, lang } = useLang();
  if (!name) return null;
  const roleText = role ? t(role as TKey) : "";
  const hasMulti = flats.length > 1;
  return (
    <div className="px-3 py-2.5 rounded-lg bg-secondary/60 border border-border space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground">
          <UserCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-sm font-semibold text-foreground truncate">{name}</div>
          {roleText && (
            <div className="text-[11px] text-muted-foreground truncate">{roleText}</div>
          )}
        </div>
      </div>
      {hasMulti && chosenId && (
        <Select value={chosenId} onValueChange={(v) => setSelectedFlatId(v)}>
          <SelectTrigger className="h-7 text-xs px-2 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {flats.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-xs">
                {lang === "bn" ? "ফ্ল্যাট" : "Flat"} {f.flat_no}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function NavGroupBlock({ group, t, onNavigate, badges }: { group: NavGroup; t: (k: TKey) => string; onNavigate?: () => void; badges?: Partial<Record<string, number>> }) {
  const { pathname } = useLocation();
  const hasActive = group.items.some((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
  const [open, setOpen] = useState<boolean>(true);
  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-1">
      <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-3 pt-1 pb-1 text-sm font-bold tracking-wide text-foreground hover:text-primary transition-base">
        <span>{t(group.label)}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-0" : "-rotate-90")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        {group.items.map(({ to, key, icon: Icon }) => {
          const badge = badges?.[key as string] ?? 0;
          return (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-base",
                isActive
                  ? "gradient-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{t(key)}</span>
            {badge > 0 && (
              <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-pulse">
                {badge}
              </span>
            )}
          </NavLink>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Footer block shown at the bottom of every SideNav drawer (mobile + desktop).
 * Reads the locally-tracked installed release tag and links to the Update page.
 */
function VersionFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { lang } = useLang();
  const installed = typeof window !== "undefined"
    ? (localStorage.getItem("sbt:installedReleaseTag") || localStorage.getItem("sbt:lastSeenReleaseTag"))
    : null;
  return (
    <NavLink
      to="/version"
      onClick={onNavigate}
      className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-base"
    >
      <Rocket className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="flex-1 truncate">
        {lang === "bn" ? "অ্যাপ ভার্সন" : "App version"}
      </span>
      <span className="font-mono font-semibold text-foreground">
        {installed || "—"}
      </span>
    </NavLink>
  );
}

export function SideNav() {
  const { t } = useLang();
  const { role } = useAuth();
  const groups = groupsFor(role);
  const pendingPR = usePendingPaymentRequests();
  const badges = { paymentRequests: pendingPR };

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <nav className="sticky top-20 space-y-3 rounded-2xl bg-card p-3 shadow-soft border border-border max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain">
        <AccountHeader />
        {groups.map((group) =>
          group.label === ("groupOverview" as TKey) ? (
            <div key={group.label} className="space-y-1">
              {group.items.map(({ to, key, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-base",
                      isActive
                        ? "gradient-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{t(key)}</span>
                </NavLink>
              ))}
            </div>
          ) : (
            <NavGroupBlock key={group.label} group={group} t={t} badges={badges} />
          )
        )}
        <VersionFooter />
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const { t } = useLang();
  const { role } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const groups = groupsFor(role);
  const all = flattenGroups(groups);
  const pendingPR = usePendingPaymentRequests();
  const badges: Partial<Record<string, number>> = { paymentRequests: pendingPR };
  const primaryKeys: TKey[] =
    role === "admin" ? ["dashboard", "dues", "ledger", "expenses"]
    : role === "manager" ? ["dashboard", "flats", "dues", "notices"]
    : role === "accountant" ? ["dashboard", "paymentRequests" as TKey, "dues", "ownerReceipts" as TKey]
    : ["dashboard", "myDues", "myPayments", "myLedger"];
  const primary = primaryKeys
    .map((k) => all.find((i) => i.key === k))
    .filter((i): i is NavItem => Boolean(i));
  const overflowGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !primaryKeys.includes(i.key)) }))
    .filter((g) => g.items.length > 0);

  return (
    <nav
      className="lg:hidden sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {primary.map(({ to, key, icon: Icon }) => {
          const badge = badges[key as string] ?? 0;
          return (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-base",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold animate-pulse">
                  {badge}
                </span>
              )}
            </div>
            <span className="truncate max-w-full px-1">{t(key)}</span>
          </NavLink>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-base"
              aria-label="More menu"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="truncate max-w-full px-1">{t("more" as TKey)}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[85dvh] h-[85dvh] flex flex-col">
            <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
              <SheetTitle>{t("more" as TKey)}</SheetTitle>
            </SheetHeader>
            <div
              className="p-3 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0"
              style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            >
              {overflowGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(group.label)}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map(({ to, key, icon: Icon }) => {
                      const badge = badges[key as string] ?? 0;
                      return (
                      <NavLink
                        key={to}
                        to={to}
                        end
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "relative flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-xs font-medium transition-base",
                            isActive
                              ? "gradient-primary text-primary-foreground border-transparent shadow-md"
                              : "text-foreground hover:bg-secondary"
                          )
                        }
                      >
                        {badge > 0 && (
                          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold animate-pulse">
                            {badge}
                          </span>
                        )}
                        <Icon className="h-5 w-5" />
                        <span className="text-center leading-tight">{t(key)}</span>
                      </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

export function MobileSideNavTrigger() {
  const { t } = useLang();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const groups = groupsFor(role);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden h-9 w-9" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col h-[100dvh]">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle>{t("appName")}</SheetTitle>
        </SheetHeader>
        <nav
          className="p-3 space-y-3 overflow-y-auto overscroll-contain flex-1 min-h-0"
          style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
        >
          <AccountHeader />
          {groups.map((group) => (
            <NavGroupBlock key={group.label} group={group} t={t} onNavigate={() => setOpen(false)} />
          ))}
          <VersionFooter onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
