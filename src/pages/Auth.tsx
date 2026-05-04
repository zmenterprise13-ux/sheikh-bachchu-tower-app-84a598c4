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
import { LanguageToggle } from "@/components/LanguageToggle";
import { Building2, Loader2 } from "lucide-react";
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

  // owner phone login
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPass, setOwnerPass] = useState("12345678");

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

  // If signup got disabled while signup tab is open, switch away
  useEffect(() => {
    if (!signupEnabled && tab === "signup") setTab("phone");
  }, [signupEnabled, tab]);

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
    const { error: setErr } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    setSubmitting(false);
    if (setErr) {
      toast.error(setErr.message);
      return;
    }
    toast.success(lang === "bn" ? "লগইন সফল" : "Logged in");
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

          <Tabs value={tab} onValueChange={v => setTab(v as "phone" | "login" | "signup")} className="mt-6">
            <TabsList className={`grid w-full ${signupEnabled ? "grid-cols-3" : "grid-cols-2"}`}>
              <TabsTrigger value="phone">{lang === "bn" ? "ওনার (মোবাইল)" : "Owner (Phone)"}</TabsTrigger>
              <TabsTrigger value="login">{lang === "bn" ? "ইমেইল" : "Email"}</TabsTrigger>
              {signupEnabled && (
                <TabsTrigger value="signup">{lang === "bn" ? "সাইন আপ" : "Sign up"}</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="phone">
              <form onSubmit={handleOwnerPhoneLogin} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "মোবাইল নম্বর (১১ সংখ্যা)" : "Mobile number (11 digits)"}</Label>
                  <Input
                    inputMode="numeric"
                    value={ownerPhone}
                    onChange={e => setOwnerPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="01613458260"
                    required
                    maxLength={11}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "পাসওয়ার্ড" : "Password"}</Label>
                  <Input type="password" value={ownerPass} onChange={e => setOwnerPass(e.target.value)} required minLength={6} maxLength={72} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {lang === "bn" ? "লগইন করুন" : "Log in"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  {lang === "bn"
                    ? "প্রথমবার লগইন করার পর পাসওয়ার্ড পরিবর্তন করুন। ডিফল্ট পাসওয়ার্ড: 12345678"
                    : "Please change your password after first login. Default password: 12345678"}
                </p>
              </form>
            </TabsContent>

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
