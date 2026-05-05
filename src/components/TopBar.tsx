import { useState } from "react";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { LanguageToggle } from "./LanguageToggle";
import { MobileSideNavTrigger } from "./SideNav";
import { Button } from "@/components/ui/button";
import { Building2, ShieldCheck, User, LogOut, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TopBar() {
  const { t, lang } = useLang();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/auth", { replace: true });
    } finally {
      setSigningOut(false);
      setConfirmOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center gap-3">
        {role && <MobileSideNavTrigger />}
        <Link to={role === "admin" ? "/admin" : role === "manager" ? "/manager" : role === "accountant" ? "/accountant" : "/owner"} className="flex items-center gap-2.5 group">
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
            <DropdownMenuContent align="end" className="w-60 p-2">
              <DropdownMenuLabel className="px-2 py-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary shadow-soft shrink-0">
                    {role === "admin"
                      ? <ShieldCheck className="h-4 w-4 text-primary-foreground" />
                      : <User className="h-4 w-4 text-primary-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{role ? t(role) : ""}</div>
                    <div className="text-[11px] text-muted-foreground font-normal truncate">{user?.email}</div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setConfirmOpen(true); }}
                className="group cursor-pointer rounded-lg px-2 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 group-focus:bg-destructive/20 mr-2 transition-base">
                  <LogOut className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium">{t("logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !signingOut && setConfirmOpen(o)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <LogOut className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-center">
              {lang === "bn" ? "সাইন আউট করবেন?" : "Sign out?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {lang === "bn"
                ? "আপনি বর্তমান সেশন থেকে বের হয়ে যাবেন। পরে আবার লগইন করতে পারবেন।"
                : "You will be logged out of this session. You can sign back in anytime."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel disabled={signingOut} className="mt-0">
              {lang === "bn" ? "বাতিল" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleLogout(); }}
              disabled={signingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {signingOut
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <LogOut className="h-4 w-4" />}
              {lang === "bn" ? "সাইন আউট" : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
