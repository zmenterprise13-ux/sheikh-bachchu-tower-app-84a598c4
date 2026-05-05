import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
      { to: "/admin/notices", key: "notices", icon: Megaphone },
    ],
  },
  {
    label: "groupPeople" as TKey,
    items: [
      { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
      { to: "/admin/committee", key: "committee" as TKey, icon: Users },
      { to: "/tenant-info", key: "tenantInfo" as TKey, icon: UserSquare2 },
      { to: "/admin/users", key: "staffRoles" as TKey, icon: UserCog },
      { to: "/admin/user-management", key: "userManagement" as TKey, icon: Users },
    ],
  },
  {
    label: "groupSystem" as TKey,
    items: [
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
    items: [{ to: "/owner", key: "dashboard", icon: LayoutDashboard }],
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
      { to: "/owner/reports", key: "reports", icon: FileBarChart },
      { to: "/owner/finance-report", key: "financeReport" as TKey, icon: FileBarChart },
    ],
  },
  {
    label: "groupPeople" as TKey,
    items: [{ to: "/tenant-info", key: "tenantInfo" as TKey, icon: UserSquare2 }],
  },
  {
    label: "groupAccount" as TKey,
    items: [
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

/** Hook to load the current user's display name from profiles. */
function useAccountName() {
  const { user, role } = useAuth();
  const { lang } = useLang();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setName("");
      return;
    }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, display_name_bn, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      // Try to get a real name from flats (owner or tenant) as fallback
      const { data: flats } = await supabase
        .from("flats")
        .select("owner_name, owner_name_bn, occupant_type, occupant_name, occupant_name_bn, owner_user_id, tenant_user_id")
        .or(`owner_user_id.eq.${user.id},tenant_user_id.eq.${user.id}`)
        .limit(1);
      const flat = flats?.[0];
      const isTenantUser = flat?.tenant_user_id === user.id;
      const flatName = flat
        ? (lang === "bn"
            ? ((isTenantUser ? (flat.occupant_name_bn || flat.occupant_name) : null)
                || flat.owner_name_bn || flat.owner_name)
            : ((isTenantUser ? (flat.occupant_name || flat.occupant_name_bn) : null)
                || flat.owner_name || flat.owner_name_bn))
        : null;

      if (cancelled) return;
      const profileName = lang === "bn"
        ? (profile?.display_name_bn || profile?.display_name)
        : (profile?.display_name || profile?.display_name_bn);
      // If profile name is just the phone number (or empty), prefer the flat's real name
      const isJustPhone = profileName && profile?.phone && profileName.trim() === profile.phone.trim();
      const finalName = (!profileName || isJustPhone) && flatName ? flatName : (profileName || flatName);
      setName(finalName || user.email || "");
    })();
    return () => { cancelled = true; };
  }, [user, lang, role]);

  return name;
}

function AccountHeader() {
  const name = useAccountName();
  const { role } = useAuth();
  const { t, lang } = useLang();
  if (!name) return null;
  const roleText = role ? t(role as TKey) : "";
  return (
    <div className="px-3 py-2.5 rounded-lg bg-secondary/60 border border-border">
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
    </div>
  );
}

function NavGroupBlock({ group, t, onNavigate }: { group: NavGroup; t: (k: TKey) => string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-1">
      <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-3 pt-1 pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-base">
        <span>{t(group.label)}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-0" : "-rotate-90")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1">
        {group.items.map(({ to, key, icon: Icon }) => (
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
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SideNav() {
  const { t } = useLang();
  const { role } = useAuth();
  const groups = groupsFor(role);

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <nav className="sticky top-20 space-y-3 rounded-2xl bg-card p-3 shadow-soft border border-border max-h-[calc(100vh-6rem)] overflow-y-auto">
        <AccountHeader />
        {groups.map((group) => (
          <NavGroupBlock key={group.label} group={group} t={t} />
        ))}
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
    <nav className="lg:hidden sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="grid grid-cols-5">
        {primary.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-base",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="truncate max-w-full px-1">{t(key)}</span>
          </NavLink>
        ))}

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
          <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[80vh]">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle>{t("more" as TKey)}</SheetTitle>
            </SheetHeader>
            <div className="p-3 space-y-4 overflow-y-auto">
              {overflowGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(group.label)}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map(({ to, key, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-xs font-medium transition-base",
                            isActive
                              ? "gradient-primary text-primary-foreground border-transparent shadow-md"
                              : "text-foreground hover:bg-secondary"
                          )
                        }
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-center leading-tight">{t(key)}</span>
                      </NavLink>
                    ))}
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
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>{t("appName")}</SheetTitle>
        </SheetHeader>
        <nav className="p-3 space-y-3 overflow-y-auto h-[calc(100vh-4rem)]">
          <AccountHeader />
          {groups.map((group) => (
            <NavGroupBlock key={group.label} group={group} t={t} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
