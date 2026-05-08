import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Building2, Loader2, Mail, Phone, Lock, User, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useSignupEnabled } from "@/hooks/useSignupEnabled";

const emailSchema = z.string().trim().email().max(255);
const passSchema = z.string().min(6).max(72);
const nameSchema = z.string().trim().min(1).max(100);
const phoneSchema = z.string().regex(/^\d{11}$/, "11 digits required");

export default function Auth() {
  const { user, role, loading } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { enabled: signupEnabled } = useSignupEnabled();

  const [tab, setTab] = useState<"phone" | "login" | "signup">("phone");
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState<boolean>(() => {
    const v = localStorage.getItem("auth.remember");
    return v === null ? true : v === "1";
  });

  const persistRemember = (val: boolean) => {
    setRemember(val);
    localStorage.setItem("auth.remember", val ? "1" : "0");
    // sessionStorage flag tells the app this tab/session is "alive";
    // when not remembering, closing the browser clears it and we sign out.
    if (val) sessionStorage.removeItem("auth.session_only");
    else sessionStorage.setItem("auth.session_only", "1");
  };

  // owner phone login
  const [ownerPhone, setOwnerPhone] = useState(() => localStorage.getItem("auth.last_phone") || "");
  const [ownerPass, setOwnerPass] = useState("12345678");

  // login form
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem("auth.last_email") || "");
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

  // If signup got disabled while signup tab is open, switch away
  useEffect(() => {
    if (!signupEnabled && tab === "signup") setTab("phone");
  }, [signupEnabled, tab]);

  const routeForRoles = (list: string[]) => {
    if (list.includes("admin")) return "/admin";
    if (list.includes("manager")) return "/manager";
    if (list.includes("accountant")) return "/accountant";
    return "/owner";
  };

  const navigateAfterLogin = async (userId: string) => {
    try {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const list = (data ?? []).map((r: any) => r.role as string);
      navigate(routeForRoles(list), { replace: true });
    } catch {
      navigate("/owner", { replace: true });
    }
  };

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
    persistRemember(remember);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "লগইন সফল" : "Logged in");
    if (data.user) await navigateAfterLogin(data.user.id);
    setSubmitting(false);
  };

  const handleOwnerPhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      phoneSchema.parse(ownerPhone);
      passSchema.parse(ownerPass);
    } catch {
      toast.error(
        lang === "bn"
          ? "১১ সংখ্যার মোবাইল ও ৬+ অক্ষরের পাসওয়ার্ড দিন"
          : "Enter an 11-digit phone and a 6+ char password",
      );
      return;
    }
    setSubmitting(true);
    persistRemember(remember);
    const { data, error } = await supabase.functions.invoke("owner-phone-login", {
      body: { phone: ownerPhone, password: ownerPass },
    });
    if (error || (data as any)?.error || !(data as any)?.session) {
      setSubmitting(false);
      toast.error(
        (data as any)?.error ||
          (lang === "bn" ? "ভুল মোবাইল বা পাসওয়ার্ড" : "Invalid phone or password"),
      );
      return;
    }
    const session = (data as any).session;
    const { data: setData, error: setErr } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (setErr) {
      setSubmitting(false);
      toast.error(setErr.message);
      return;
    }
    toast.success(lang === "bn" ? "লগইন সফল" : "Logged in");
    const uid = setData.user?.id;
    if (uid) await navigateAfterLogin(uid);
    setSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEnabled) {
      toast.error(lang === "bn" ? "সাইন আপ বর্তমানে বন্ধ আছে" : "Sign up is currently disabled");
      return;
    }
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
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-hero" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-accent/20" aria-hidden="true" />
      {/* Decorative orbs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl animate-pulse" aria-hidden="true" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl animate-pulse" style={{ animationDelay: "1.2s" }} aria-hidden="true" />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      <header className="relative z-10 container flex h-16 items-center">
        <Link to="/" className="flex items-center gap-2.5 text-primary-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur border border-white/20 shadow-lg">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm">{t("appName")}</div>
            <div className="text-[11px] opacity-90">{t("appTagline")}</div>
          </div>
        </Link>
        <div className="ml-auto"><LanguageToggle /></div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Card */}
          <div className="rounded-3xl bg-card/95 backdrop-blur-xl shadow-elevated border border-border/60 p-6 sm:p-8 ring-1 ring-white/10">
            {/* Brand badge */}
            <div className="flex justify-center -mt-12 mb-4">
              <div className="h-16 w-16 rounded-2xl gradient-primary shadow-glow flex items-center justify-center ring-4 ring-card">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold">
                <Sparkles className="h-3 w-3" />
                {lang === "bn" ? "নিরাপদ লগইন" : "Secure sign in"}
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">
                {lang === "bn" ? "স্বাগতম" : "Welcome back"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === "bn" ? "আপনার অ্যাকাউন্টে প্রবেশ করুন" : "Sign in to continue to your dashboard"}
              </p>
            </div>

            <Tabs value={tab} onValueChange={v => setTab(v as "phone" | "login" | "signup")} className="mt-6">
              <TabsList className={`grid w-full ${signupEnabled ? "grid-cols-3" : "grid-cols-2"} h-11 p-1 bg-muted/70 rounded-xl`}>
                <TabsTrigger value="phone" className="rounded-lg gap-1.5 data-[state=active]:shadow-soft">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline sm:inline">{lang === "bn" ? "মোবাইল" : "Phone"}</span>
                </TabsTrigger>
                <TabsTrigger value="login" className="rounded-lg gap-1.5 data-[state=active]:shadow-soft">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline sm:inline">{lang === "bn" ? "ইমেইল" : "Email"}</span>
                </TabsTrigger>
                {signupEnabled && (
                  <TabsTrigger value="signup" className="rounded-lg gap-1.5 data-[state=active]:shadow-soft">
                    <User className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline sm:inline">{lang === "bn" ? "সাইন আপ" : "Sign up"}</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="phone" className="animate-fade-in">
                <form onSubmit={handleOwnerPhoneLogin} className="space-y-4 mt-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{lang === "bn" ? "মোবাইল নম্বর" : "Mobile number"}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        inputMode="numeric"
                        value={ownerPhone}
                        onChange={e => setOwnerPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        placeholder="01XXXXXXXXX"
                        required
                        maxLength={11}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{lang === "bn" ? "পাসওয়ার্ড" : "Password"}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <PasswordInput value={ownerPass} onChange={e => setOwnerPass(e.target.value)} required minLength={6} maxLength={72} className="pl-10 h-11" />
                    </div>
                  </div>
                  <RememberMe value={remember} onChange={setRemember} lang={lang} id="remember-phone" />
                  <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary text-primary-foreground shadow-glow gap-2 font-semibold">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {lang === "bn" ? "লগইন করুন" : "Sign in"}
                  </Button>
                  <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      {lang === "bn"
                        ? "প্রথমবার লগইনের পর পাসওয়ার্ড পরিবর্তন করুন। ডিফল্ট: 12345678"
                        : "Change your password after first sign in. Default: 12345678"}
                    </span>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="login" className="animate-fade-in">
                <form onSubmit={handleLogin} className="space-y-4 mt-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{lang === "bn" ? "ইমেইল" : "Email"}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required maxLength={255} placeholder="you@example.com" className="pl-10 h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{lang === "bn" ? "পাসওয়ার্ড" : "Password"}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <PasswordInput value={loginPass} onChange={e => setLoginPass(e.target.value)} required minLength={6} maxLength={72} className="pl-10 h-11" />
                    </div>
                  </div>
                  <RememberMe value={remember} onChange={setRemember} lang={lang} id="remember-email" />
                  <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary text-primary-foreground shadow-glow gap-2 font-semibold">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {lang === "bn" ? "লগইন করুন" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="animate-fade-in">
                <form onSubmit={handleSignup} className="space-y-3 mt-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{lang === "bn" ? "নাম" : "Full name"}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input value={name} onChange={e => setName(e.target.value)} required maxLength={100} className="pl-10 h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{lang === "bn" ? "ইমেইল" : "Email"}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255} className="pl-10 h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{lang === "bn" ? "ফোন" : "Phone"}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} placeholder="01XXXXXXXXX" className="pl-10 h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{lang === "bn" ? "পাসওয়ার্ড (৬+ অক্ষর)" : "Password (6+ chars)"}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <PasswordInput value={pass} onChange={e => setPass(e.target.value)} required minLength={6} maxLength={72} className="pl-10 h-11" />
                    </div>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary text-primary-foreground shadow-glow gap-2 font-semibold">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {lang === "bn" ? "অ্যাকাউন্ট তৈরি করুন" : "Create account"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center px-2">
                    {lang === "bn"
                      ? "নতুন অ্যাকাউন্ট ডিফল্টভাবে ফ্ল্যাট ওনার হিসেবে তৈরি হয়।"
                      : "New accounts are flat owners by default."}
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer trust line */}
          <p className="mt-6 text-center text-xs text-primary-foreground/80 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {lang === "bn" ? "এন্ড-টু-এন্ড সুরক্ষিত সংযোগ" : "End-to-end secured connection"}
          </p>
        </div>
      </main>
    </div>
  );
}

function RememberMe({
  value, onChange, lang, id,
}: { value: boolean; onChange: (v: boolean) => void; lang: "en" | "bn"; id: string }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
      <Checkbox id={id} checked={value} onCheckedChange={(v) => onChange(v === true)} />
      <span className="text-sm text-foreground">
        {lang === "bn" ? "আমাকে মনে রাখুন" : "Remember me"}
      </span>
    </label>
  );
}
