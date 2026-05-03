import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { TKey } from "@/i18n/translations";
import {
  LayoutDashboard,
  Building,
  Store,
  Car,
  Receipt,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const adminNav: { to: string; key: TKey; icon: React.ElementType }[] = [
  { to: "/admin", key: "dashboard", icon: LayoutDashboard },
  { to: "/admin/flats", key: "flats", icon: Building },
  { to: "/admin/flats/table", key: "flatsTable" as TKey, icon: TableIcon },
  { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
  { to: "/admin/building", key: "buildingOverview" as TKey, icon: Building2 },
  { to: "/admin/building/3d", key: "building3D" as TKey, icon: Box },
  { to: "/admin/shops", key: "shops", icon: Store },
  { to: "/admin/parking", key: "parkingNav", icon: Car },
  { to: "/admin/dues", key: "dues", icon: Receipt },
  { to: "/admin/payment-requests", key: "paymentRequests" as TKey, icon: CreditCard },
  { to: "/admin/ledger", key: "ledger", icon: BookOpen },
  { to: "/admin/reconcile", key: "reconcile" as TKey, icon: ScanSearch },
  { to: "/admin/expenses", key: "expenses", icon: Wallet },
  { to: "/admin/loans", key: "loans" as TKey, icon: HandCoins },
  { to: "/admin/reports", key: "reports", icon: FileBarChart },
  { to: "/admin/notices", key: "notices", icon: Megaphone },
  { to: "/admin/committee", key: "committee" as TKey, icon: Users },
  { to: "/admin/settings", key: "settings", icon: SettingsIcon },
];

const ownerNav: { to: string; key: TKey; icon: React.ElementType }[] = [
  { to: "/owner", key: "dashboard", icon: LayoutDashboard },
  { to: "/owner/dues", key: "myDues", icon: CreditCard },
  { to: "/owner/payments", key: "myPayments", icon: History },
  { to: "/owner/ledger", key: "myLedger", icon: BookOpen },
  { to: "/admin/flats/owners", key: "ownersDirectory" as TKey, icon: Users },
  { to: "/admin/building", key: "buildingOverview" as TKey, icon: Building2 },
  { to: "/admin/building/3d", key: "building3D" as TKey, icon: Box },
  { to: "/owner/notices", key: "notices", icon: Megaphone },
  { to: "/owner/reports", key: "reports", icon: FileBarChart },
];

export function SideNav() {
  const { t } = useLang();
  const { role } = useAuth();
  const items = role === "admin" ? adminNav : ownerNav;

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <nav className="sticky top-20 space-y-1 rounded-2xl bg-card p-3 shadow-soft border border-border">
        {items.map(({ to, key, icon: Icon }) => (
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
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const { t } = useLang();
  const { role } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const all = role === "admin" ? adminNav : ownerNav;
  // Mobile bottom-nav: show the 4 most-used pages; rest go under "More"
  const primaryKeys: TKey[] = role === "admin"
    ? ["dashboard", "dues", "ledger", "expenses"]
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
  const { t } = useLang();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const items = role === "admin" ? adminNav : ownerNav;

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
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {items.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={() => setOpen(false)}
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
        </nav>
      </SheetContent>
    </Sheet>
  );
}
