import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
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

type Item = { to: string; key: TKey; icon: React.ElementType };
type Group = { id: string; label: string; labelBn: string; items: Item[] };

// ============ Admin: grouped sidebar ============
const adminGroups: Group[] = [
  {
    id: "main",
    label: "Overview",
    labelBn: "সারসংক্ষেপ",
    items: [{ to: "/admin", key: "dashboard", icon: LayoutDashboard }],
  },
  {
    id: "property",
    label: "Property",
    labelBn: "সম্পত্তি",
    items: [
      { to: "/admin/flats", key: "flats", icon: Building },
      { to: "/admin/flats/table", key: "flatsTable" as TKey, icon: TableIcon },
      { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
      { to: "/admin/building", key: "buildingOverview" as TKey, icon: Building2 },
      { to: "/admin/building/3d", key: "building3D" as TKey, icon: Box },
      { to: "/admin/shops", key: "shops", icon: Store },
      { to: "/admin/parking", key: "parkingNav", icon: Car },
      { to: "/tenant-info", key: "tenantInfo" as TKey, icon: UserSquare2 },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    labelBn: "অর্থ",
    items: [
      { to: "/admin/dues", key: "dues", icon: Receipt },
      { to: "/admin/payment-requests", key: "paymentRequests" as TKey, icon: CreditCard },
      { to: "/admin/receipts", key: "ownerReceipts" as TKey, icon: ReceiptText },
      { to: "/admin/ledger", key: "ledger", icon: BookOpen },
      { to: "/admin/reconcile", key: "reconcile" as TKey, icon: ScanSearch },
      { to: "/admin/expenses", key: "expenses", icon: Wallet },
      { to: "/admin/loans", key: "loans" as TKey, icon: HandCoins },
      { to: "/admin/reports", key: "reports", icon: FileBarChart },
    ],
  },
  {
    id: "comms",
    label: "Community",
    labelBn: "কমিউনিটি",
    items: [
      { to: "/admin/notices", key: "notices", icon: Megaphone },
      { to: "/admin/committee", key: "committee" as TKey, icon: Users },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    labelBn: "অ্যাডমিন",
    items: [
      { to: "/admin/users", key: "staffRoles" as TKey, icon: UserCog },
      { to: "/admin/user-management", key: "userManagement" as TKey, icon: Users },
      { to: "/admin/settings", key: "settings", icon: SettingsIcon },
    ],
  },
  {
    id: "account",
    label: "Account",
    labelBn: "অ্যাকাউন্ট",
    items: [
      { to: "/account/profile", key: "myProfile" as TKey, icon: UserCircle },
      { to: "/account/password", key: "changePassword" as TKey, icon: KeyRound },
    ],
  },
];

const ownerNav: Item[] = [
  { to: "/owner", key: "dashboard", icon: LayoutDashboard },
  { to: "/owner/dues", key: "myDues", icon: CreditCard },
  { to: "/owner/payments", key: "myPayments", icon: History },
  { to: "/owner/receipts", key: "myReceipts" as TKey, icon: ReceiptText },
  { to: "/owner/ledger", key: "myLedger", icon: BookOpen },
  { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
  { to: "/admin/building", key: "buildingOverview" as TKey, icon: Building2 },
  { to: "/admin/building/3d", key: "building3D" as TKey, icon: Box },
  { to: "/owner/notices", key: "notices", icon: Megaphone },
  { to: "/owner/reports", key: "reports", icon: FileBarChart },
  { to: "/owner/finance-report", key: "financeReport" as TKey, icon: FileBarChart },
  { to: "/tenant-info", key: "tenantInfo" as TKey, icon: UserSquare2 },
  { to: "/account/profile", key: "myProfile" as TKey, icon: UserCircle },
  { to: "/account/password", key: "changePassword" as TKey, icon: KeyRound },
];

const accountantNav: Item[] = [
  { to: "/accountant", key: "dashboard", icon: LayoutDashboard },
  { to: "/admin/payment-requests", key: "paymentRequests" as TKey, icon: CreditCard },
  { to: "/admin/dues", key: "dues", icon: Receipt },
  { to: "/admin/receipts", key: "ownerReceipts" as TKey, icon: ReceiptText },
  { to: "/admin/ledger", key: "ledger", icon: BookOpen },
  { to: "/admin/reconcile", key: "reconcile" as TKey, icon: ScanSearch },
  { to: "/admin/expenses", key: "expenses", icon: Wallet },
  { to: "/admin/reports", key: "reports", icon: FileBarChart },
  { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
  { to: "/account/profile", key: "myProfile" as TKey, icon: UserCircle },
  { to: "/account/password", key: "changePassword" as TKey, icon: KeyRound },
];

const managerNav: Item[] = [
  { to: "/manager", key: "dashboard", icon: LayoutDashboard },
  { to: "/admin/flats", key: "flats", icon: Building },
  { to: "/admin/flats/table", key: "flatsTable" as TKey, icon: TableIcon },
  { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
  { to: "/admin/shops", key: "shops", icon: Store },
  { to: "/admin/parking", key: "parkingNav", icon: Car },
  { to: "/admin/dues", key: "dues", icon: Receipt },
  { to: "/admin/payment-requests", key: "paymentRequests" as TKey, icon: CreditCard },
  { to: "/admin/notices", key: "notices", icon: Megaphone },
  { to: "/admin/loans", key: "loans" as TKey, icon: HandCoins },
  { to: "/admin/reports", key: "reports", icon: FileBarChart },
  { to: "/tenant-info", key: "tenantInfo" as TKey, icon: UserSquare2 },
  { to: "/account/profile", key: "myProfile" as TKey, icon: UserCircle },
  { to: "/account/password", key: "changePassword" as TKey, icon: KeyRound },
];

function navFor(role: string | null): Item[] {
  if (role === "admin") return adminGroups.flatMap((g) => g.items);
  if (role === "manager") return managerNav;
  if (role === "accountant") return accountantNav;
  if (role === "tenant") return ownerNav.filter((n) => !n.to.startsWith("/admin/"));
  return ownerNav;
}

// Render a single nav item link (shared)
function NavItem({
  to, label, Icon, onClick,
}: { to: string; label: string; Icon: React.ElementType; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-base",
          isActive
            ? "gradient-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

// Collapsible section used in the admin sidebar
function GroupSection({
  group, lang, t, pathname, onNavigate,
}: {
  group: Group;
  lang: "bn" | "en";
  t: (k: TKey) => string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasActive = group.items.some(
    (i) => pathname === i.to || pathname.startsWith(i.to + "/"),
  );
  const storageKey = `sidenav.group.${group.id}`;
  const [open, setOpen] = useState<boolean>(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (v === "1") return true;
    if (v === "0") return false;
    return hasActive || group.id === "main";
  });
  // Auto-open when the active route is inside this group
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);
  const toggle = () => {
    setOpen((p) => {
      const next = !p;
      try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
      return next;
    });
  };

  // Single-item groups (e.g. Dashboard) render as plain link, no chevron
  if (group.items.length === 1) {
    const it = group.items[0];
    return <NavItem to={it.to} label={t(it.key)} Icon={it.icon} onClick={onNavigate} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider",
          hasActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span>{lang === "bn" ? group.labelBn : group.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((it) => (
            <NavItem
              key={it.to}
              to={it.to}
              label={t(it.key)}
              Icon={it.icon}
              onClick={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SideNav() {
  const { t, lang } = useLang();
  const { role } = useAuth();
  const { pathname } = useLocation();

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <nav className="sticky top-20 space-y-1.5 rounded-2xl bg-card p-3 shadow-soft border border-border max-h-[calc(100vh-6rem)] overflow-y-auto">
        {role === "admin" ? (
          adminGroups.map((g) => (
            <GroupSection key={g.id} group={g} lang={lang} t={t} pathname={pathname} />
          ))
        ) : (
          navFor(role).map((it) => (
            <NavItem key={it.to} to={it.to} label={t(it.key)} Icon={it.icon} />
          ))
        )}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const { t } = useLang();
  const { role } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const all = navFor(role);
  const primaryKeys: TKey[] =
    role === "admin" ? ["dashboard", "dues", "ledger", "expenses"]
    : role === "manager" ? ["dashboard", "flats", "dues", "notices"]
    : role === "accountant" ? ["dashboard", "paymentRequests" as TKey, "dues", "ownerReceipts" as TKey]
    : ["dashboard", "myDues", "myPayments", "myLedger"];
  const primary = primaryKeys
    .map((k) => all.find((i) => i.key === k))
    .filter((i): i is typeof all[number] => Boolean(i));
  const overflow = all.filter((i) => !primaryKeys.includes(i.key));

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
            <nav className="p-3 grid grid-cols-3 gap-2 overflow-y-auto">
              {overflow.map(({ to, key, icon: Icon }) => (
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
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

export function MobileSideNavTrigger() {
  const { t, lang } = useLang();
  const { role } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

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
        <nav className="p-3 space-y-1.5 overflow-y-auto h-[calc(100vh-4rem)]">
          {role === "admin" ? (
            adminGroups.map((g) => (
              <GroupSection
                key={g.id}
                group={g}
                lang={lang}
                t={t}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            ))
          ) : (
            navFor(role).map((it) => (
              <NavItem
                key={it.to}
                to={it.to}
                label={t(it.key)}
                Icon={it.icon}
                onClick={() => setOpen(false)}
              />
            ))
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
