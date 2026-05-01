import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { LanguageToggle } from "./LanguageToggle";
import { MobileSideNavTrigger } from "./SideNav";
import { Button } from "@/components/ui/button";
import { Building2, ShieldCheck, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { t } = useLang();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center gap-3">
        {role && <MobileSideNavTrigger />}
        <Link to={role === "admin" ? "/admin" : "/owner"} className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow group-hover:scale-105 transition-base">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="font-bold text-foreground text-sm">{t("appName")}</div>
            <div className="text-[11px] text-muted-foreground">{t("appTagline")}</div>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LanguageToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {role === "admin" ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                <span className="font-medium hidden sm:inline">{role ? t(role) : ""}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate text-xs">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
