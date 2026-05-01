import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Lang, TKey, translations } from "@/i18n/translations";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
}

const LangContext = createContext<LangContextValue | undefined>(undefined);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sbt_lang") : null;
    return (stored === "en" || stored === "bn") ? stored : "bn";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("sbt_lang", lang);
  }, [lang]);

  const t = (key: TKey) => translations[key]?.[lang] ?? key;

  return (
    <LangContext.Provider value={{ lang, setLang: setLangState, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
