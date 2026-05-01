import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
      className="gap-1.5"
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" />
      <span className="font-semibold">{lang === "bn" ? "EN" : "বাং"}</span>
    </Button>
  );
}
