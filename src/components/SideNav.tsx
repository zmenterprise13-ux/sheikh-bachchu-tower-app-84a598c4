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
  FileBarChart,
  Megaphone,
  CreditCard,
  History,
  Settings as SettingsIcon,
  BookOpen,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const adminNav: { to: string; key: TKey; icon: React.ElementType }[] = [
  { to: "/admin", key: "dashboard", icon: LayoutDashboard },
  { to: "/admin/flats", key: "flats", icon: Building },
  { to: "/admin/shops", key: "shops", icon: Store },
  { to: "/admin/parking", key: "parkingNav", icon: Car },
  { to: "/admin/dues", key: "dues", icon: Receipt },
  { to: "/admin/ledger", key: "ledger", icon: BookOpen },
  { to: "/admin/expenses", key: "expenses", icon: Wallet },
  { to: "/admin/reports", key: "reports", icon: FileBarChart },
  { to: "/admin/notices", key: "notices", icon: Megaphone },
  { to: "/admin/settings", key: "settings", icon: SettingsIcon },
];

const ownerNav: { to: string; key: TKey; icon: React.ElementType }[] = [
  { to: "/owner", key: "dashboard", icon: LayoutDashboard },
  { to: "/owner/dues", key: "myDues", icon: CreditCard },
  { to: "/owner/payments", key: "myPayments", icon: History },
  { to: "/owner/ledger", key: "myLedger", icon: BookOpen },
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
  const items = (role === "admin" ? adminNav : ownerNav).slice(0, 5);

  return (
    <nav className="lg:hidden sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="grid grid-cols-5">
        {items.map(({ to, key, icon: Icon }) => (
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
      </div>
    </nav>
  );
}
