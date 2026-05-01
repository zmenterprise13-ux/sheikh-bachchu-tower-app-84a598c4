import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const emailSchema = z.string().trim().email().max(255);
const passSchema = z.string().min(6).max(72);
const nameSchema = z.string().trim().min(1).max(100);

export default function Auth() {
  const { user, role, loading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);

  // login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // signup form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "admin" ? "/admin" : "/owner", { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(loginEmail);
      passSchema.parse(loginPass);
    } catch {
      toast.error(lang === "bn" ? "বৈধ ইমেইল ও পাসওয়ার্ড দিন" : "Enter a valid email and password");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "লগইন সফল" : "Logged in");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(name);
      emailSchema.parse(email);
      passSchema.parse(pass);
    } catch {
      toast.error(lang === "bn" ? "সব ক্ষেত্র সঠিকভাবে পূরণ করুন" : "Please fill all fields correctly");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: name, phone },
      },
    });
    setSubmitting(false);
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        toast.error(lang === "bn" ? "এই ইমেইল ইতিমধ্যে রেজিস্টার্ড। লগইন করুন।" : "Email already registered. Please log in.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(lang === "bn" ? "অ্যাকাউন্ট তৈরি হয়েছে!" : "Account created!");
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <header className="container flex h-16 items-center">
        <Link to="/" className="flex items-center gap-2.5 text-primary-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur border border-white/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm">{t("appName")}</div>
            <div className="text-[11px] opacity-90">{t("appTagline")}</div>
          </div>
        </Link>
        <div className="ml-auto"><LanguageToggle /></div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-card shadow-elevated border border-border p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-foreground text-center">
            {lang === "bn" ? "স্বাগতম" : "Welcome"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {lang === "bn" ? "অ্যাকাউন্টে প্রবেশ করুন" : "Sign in to your account"}
          </p>

          <Tabs value={tab} onValueChange={v => setTab(v as "login" | "signup")} className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">{lang === "bn" ? "লগইন" : "Log in"}</TabsTrigger>
              <TabsTrigger value="signup">{lang === "bn" ? "সাইন আপ" : "Sign up"}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "ইমেইল" : "Email"}</Label>
                  <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required maxLength={255} />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "পাসওয়ার্ড" : "Password"}</Label>
                  <Input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required minLength={6} maxLength={72} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {lang === "bn" ? "লগইন করুন" : "Log in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "নাম" : "Name"}</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "ইমেইল" : "Email"}</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255} />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "ফোন" : "Phone"}</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} placeholder="01XXXXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "পাসওয়ার্ড (৬+ অক্ষর)" : "Password (6+ chars)"}</Label>
                  <Input type="password" value={pass} onChange={e => setPass(e.target.value)} required minLength={6} maxLength={72} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {lang === "bn" ? "অ্যাকাউন্ট তৈরি করুন" : "Create account"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  {lang === "bn"
                    ? "নতুন অ্যাকাউন্ট ডিফল্টভাবে ফ্ল্যাট ওনার হিসেবে তৈরি হয়। অ্যাডমিন রোল ম্যানুয়ালি নির্ধারণ করতে হবে।"
                    : "New accounts are flat owners by default. Admin role must be assigned manually."}
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
