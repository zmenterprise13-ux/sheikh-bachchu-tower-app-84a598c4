import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AccountPassword() {
  const { lang } = useLang();
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error(lang === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে" : "Password must be at least 6 characters");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error(lang === "bn" ? "পাসওয়ার্ড মেলেনি" : "Passwords do not match");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPass("");
    setConfirmPass("");
    toast.success(lang === "bn" ? "পাসওয়ার্ড পরিবর্তন হয়েছে" : "Password changed");
  };

  return (
    <AppShell>
      <div className="rounded-2xl bg-card border border-border p-6 shadow-soft max-w-xl">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1">
          <KeyRound className="h-5 w-5 text-primary" />
          {lang === "bn" ? "পাসওয়ার্ড পরিবর্তন" : "Change Password"}
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {lang === "bn"
            ? "আপনার অ্যাকাউন্টের পাসওয়ার্ড আপডেট করুন।"
            : "Update your account password."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              {lang === "bn" ? "নতুন পাসওয়ার্ড (৬+ অক্ষর)" : "New password (6+ chars)"}
            </Label>
            <Input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              minLength={6}
              maxLength={72}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {lang === "bn" ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm password"}
            </Label>
            <Input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              minLength={6}
              maxLength={72}
              required
            />
          </div>
          <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {lang === "bn" ? "পাসওয়ার্ড পরিবর্তন করুন" : "Change Password"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
