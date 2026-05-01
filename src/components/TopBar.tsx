import { useLang } from "@/i18n/LangContext";
import { useRole } from "@/context/RoleContext";
import { LanguageToggle } from "./LanguageToggle";
import { Button } from "@/components/ui/button";
import { Building2, ShieldCheck, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { t, lang } = useLang();
  const { role, setRole } = useRole();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow group-hover:scale-105 transition-base">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="font-bold text-foreground text-sm">{t("appName")}</div>
            <div className="text-[11px] text-muted-foreground">{t("appTagline")}</div>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {location.pathname !== "/" && (
            <Link to="/">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                {lang === "bn" ? "হোম" : "Home"}
              </Button>
            </Link>
          )}
          <LanguageToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {role === "admin" ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                <span className="font-medium">{t(role)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>{t("switchRole")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRole("admin")}>
                <ShieldCheck className="mr-2 h-4 w-4" /> {t("admin")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRole("owner")}>
                <User className="mr-2 h-4 w-4" /> {t("owner")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
