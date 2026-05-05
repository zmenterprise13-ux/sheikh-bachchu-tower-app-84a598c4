import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { UserPlus, Trash2, ShieldCheck, Wallet, Briefcase, UserCog } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type StaffRole = "admin" | "manager" | "accountant";

type Row = {
  id: string;
  user_id: string;
  role: StaffRole;
  created_at: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
};

const roleStyle: Record<StaffRole, { label: { bn: string; en: string }; cls: string; icon: JSX.Element }> = {
  admin: { label: { bn: "অ্যাডমিন", en: "Admin" }, cls: "bg-primary/10 text-primary border-primary/30", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  manager: { label: { bn: "ম্যানেজার", en: "Manager" }, cls: "bg-accent/10 text-accent border-accent/30", icon: <Briefcase className="h-3.5 w-3.5" /> },
  accountant: { label: { bn: "অ্যাকাউন্ট্যান্ট", en: "Accountant" }, cls: "bg-success/10 text-success border-success/30", icon: <Wallet className="h-3.5 w-3.5" /> },
};

export default function AdminUsers() {
  const { lang } = useLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("accountant");

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-staff-roles", {
      body: { action: "list" },
    });
    if (error) toast.error(error.message);
    else setRows((data?.data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const assign = async () => {
    if (!email.trim()) {
      toast.error(lang === "bn" ? "ইমেইল দিন" : "Enter email");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-staff-roles", {
      body: { action: "assign", email: email.trim(), role: newRole },
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error);
      return;
    }
    toast.success(lang === "bn" ? "রোল যোগ করা হয়েছে" : "Role assigned");
    setEmail("");
    refresh();
  };

  const revoke = async (r: Row) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-staff-roles", {
      body: { action: "revoke", user_id: r.user_id, role: r.role },
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error);
      return;
    }
    toast.success(lang === "bn" ? "রোল সরানো হয়েছে" : "Role revoked");
    refresh();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            {lang === "bn" ? "স্টাফ ও রোল ব্যবস্থাপনা" : "Staff & Roles"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? "অ্যাকাউন্ট্যান্ট ও ম্যানেজার যোগ করুন — তারা টাকা সংগ্রহ ও বিল পরিচালনায় সাহায্য করতে পারবেন। ব্যবহারকারীকে আগে রেজিস্টার করতে হবে।"
              : "Add accountant or manager staff who can help collect payments and manage bills. The user must register first."}
          </p>
        </div>

        {/* Assign form */}
        <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            {lang === "bn" ? "নতুন রোল যোগ করুন" : "Assign a role"}
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              type="email"
              placeholder={lang === "bn" ? "ব্যবহারকারীর ইমেইল" : "User email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={newRole} onValueChange={(v) => setNewRole(v as StaffRole)}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accountant">{lang === "bn" ? "অ্যাকাউন্ট্যান্ট" : "Accountant"}</SelectItem>
                <SelectItem value="manager">{lang === "bn" ? "ম্যানেজার" : "Manager"}</SelectItem>
                <SelectItem value="admin">{lang === "bn" ? "অ্যাডমিন" : "Admin"}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={assign} disabled={busy} className="gradient-primary text-primary-foreground gap-2">
              <UserPlus className="h-4 w-4" />
              {lang === "bn" ? "যোগ করুন" : "Assign"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {lang === "bn"
              ? "টিপ: একই ব্যক্তিকে একাধিক রোল দেওয়া যাবে। একই রোল দ্বিতীয়বার দিলে তা উপেক্ষা করা হবে।"
              : "Tip: A user can hold multiple roles. Re-assigning the same role is a no-op."}
          </p>
        </div>

        {/* List */}
        <div className="rounded-2xl border border-border bg-card shadow-soft divide-y divide-border">
          <div className="px-5 py-3 font-semibold text-foreground flex items-center justify-between">
            <span>{lang === "bn" ? "বর্তমান স্টাফ" : "Current staff"}</span>
            <span className="text-xs text-muted-foreground">{rows.length}</span>
          </div>
          {loading && <div className="p-5 space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-14"/>)}</div>}
          {!loading && rows.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              {lang === "bn" ? "কোনো স্টাফ যোগ করা হয়নি।" : "No staff assigned yet."}
            </div>
          )}
          {!loading && rows.map((r) => {
            const s = roleStyle[r.role];
            return (
              <div key={r.id} className="p-4 sm:p-5 flex items-center gap-3 flex-wrap">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">
                    {r.display_name || r.email || r.user_id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.email}{r.phone ? ` · ${r.phone}` : ""}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
                  {s.icon}{s.label[lang]}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                      {lang === "bn" ? "সরান" : "Revoke"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {lang === "bn" ? "রোল সরাবেন?" : "Revoke role?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {lang === "bn"
                          ? `${r.display_name || r.email} থেকে "${s.label.bn}" রোল সরানো হবে।`
                          : `Remove "${s.label.en}" role from ${r.display_name || r.email}.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{lang === "bn" ? "বাতিল" : "Cancel"}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revoke(r)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {lang === "bn" ? "নিশ্চিত" : "Confirm"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
