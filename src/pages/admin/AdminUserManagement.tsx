import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users, Search, Trash2, Ban, ShieldCheck, Wallet, Briefcase, User as UserIcon,
  Mail, Phone, Calendar, CheckCircle2, XCircle, Plus, X, LogIn, UserPlus,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Role = "owner" | "accountant" | "manager" | "admin";

type UserRow = {
  user_id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  banned_until: string | null;
  display_name: string | null;
  display_name_bn: string | null;
  profile_phone: string | null;
  avatar_url: string | null;
  roles: Role[];
  flats: { id: string; flat_no: string; owner_name: string | null; owner_name_bn: string | null }[];
};

const roleStyle: Record<Role, { label: { bn: string; en: string }; cls: string; icon: JSX.Element }> = {
  admin:      { label: { bn: "অ্যাডমিন", en: "Admin" },         cls: "bg-primary/10 text-primary border-primary/30",         icon: <ShieldCheck className="h-3 w-3" /> },
  manager:    { label: { bn: "ম্যানেজার", en: "Manager" },       cls: "bg-accent/10 text-accent border-accent/30",            icon: <Briefcase className="h-3 w-3" /> },
  accountant: { label: { bn: "অ্যাকাউন্ট্যান্ট", en: "Accountant" }, cls: "bg-success/10 text-success border-success/30",       icon: <Wallet className="h-3 w-3" /> },
  owner:      { label: { bn: "ফ্ল্যাট ওনার", en: "Owner" },        cls: "bg-muted text-muted-foreground border-border",         icon: <UserIcon className="h-3 w-3" /> },
};

export default function AdminUserManagement() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role | "no_role">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "unconfirmed" | "banned">("all");

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-staff-roles", {
      body: { action: "list_all" },
    });
    if (error) toast.error(error.message);
    else setRows((data?.data ?? []) as UserRow[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter === "no_role" && r.roles.length > 0) return false;
      if (roleFilter !== "all" && roleFilter !== "no_role" && !r.roles.includes(roleFilter)) return false;
      if (statusFilter === "confirmed" && !r.confirmed) return false;
      if (statusFilter === "unconfirmed" && r.confirmed) return false;
      if (statusFilter === "banned" && !r.banned_until) return false;
      if (!term) return true;
      const flatNos = r.flats.map((f) => f.flat_no).join(" ");
      const haystack = [
        r.email, r.phone, r.profile_phone, r.display_name, r.display_name_bn, flatNos,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, q, roleFilter, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      admin: rows.filter((r) => r.roles.includes("admin")).length,
      manager: rows.filter((r) => r.roles.includes("manager")).length,
      accountant: rows.filter((r) => r.roles.includes("accountant")).length,
      owner: rows.filter((r) => r.roles.includes("owner")).length,
      noRole: rows.filter((r) => r.roles.length === 0).length,
      banned: rows.filter((r) => r.banned_until).length,
    };
  }, [rows]);

  const assignRole = async (uid: string, role: Role) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-staff-roles", {
      body: { action: "assign_by_id", user_id: uid, role },
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error);
      return;
    }
    toast.success(lang === "bn" ? "রোল যোগ হয়েছে" : "Role assigned");
    refresh();
  };

  const revokeRole = async (uid: string, role: Role) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-staff-roles", {
      body: { action: "revoke", user_id: uid, role },
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error);
      return;
    }
    toast.success(lang === "bn" ? "রোল সরানো হয়েছে" : "Role revoked");
    refresh();
  };

  const toggleBan = async (uid: string, banned: boolean) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-staff-roles", {
      body: { action: "set_ban", user_id: uid, banned },
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error);
      return;
    }
    toast.success(banned
      ? (lang === "bn" ? "ব্যবহারকারী ব্লক করা হয়েছে" : "User blocked")
      : (lang === "bn" ? "ব্যবহারকারী আনব্লক করা হয়েছে" : "User unblocked"));
    refresh();
  };

  const deleteUser = async (uid: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-staff-roles", {
      body: { action: "delete_user", user_id: uid },
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error);
      return;
    }
    toast.success(lang === "bn" ? "ব্যবহারকারী মুছে ফেলা হয়েছে" : "User deleted");
    refresh();
  };

  const fmtDate = (s: string | null) => {
    if (!s) return "—";
    try { return new Date(s).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB"); } catch { return s; }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {lang === "bn" ? "ব্যবহারকারী ব্যবস্থাপনা" : "User Management"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? "সকল রেজিস্টার্ড ব্যবহারকারীদের তথ্য, রোল, ব্লক ও ডিলিট নিয়ন্ত্রণ।"
              : "View all registered users with their roles. Assign roles, block, or delete accounts."}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: lang === "bn" ? "মোট" : "Total", val: counts.total, cls: "text-foreground" },
            { label: roleStyle.admin.label[lang], val: counts.admin, cls: "text-primary" },
            { label: roleStyle.manager.label[lang], val: counts.manager, cls: "text-accent" },
            { label: roleStyle.accountant.label[lang], val: counts.accountant, cls: "text-success" },
            { label: roleStyle.owner.label[lang], val: counts.owner, cls: "text-foreground" },
            { label: lang === "bn" ? "রোল নেই" : "No role", val: counts.noRole, cls: "text-muted-foreground" },
            { label: lang === "bn" ? "ব্লকড" : "Blocked", val: counts.banned, cls: "text-destructive" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 shadow-soft">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={`text-2xl font-bold ${s.cls}`}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border bg-card shadow-soft p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "bn" ? "ইমেইল, ফোন, নাম, ফ্ল্যাট খুঁজুন..." : "Search email, phone, name, flat..."}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
            <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "bn" ? "সব রোল" : "All roles"}</SelectItem>
              <SelectItem value="admin">{roleStyle.admin.label[lang]}</SelectItem>
              <SelectItem value="manager">{roleStyle.manager.label[lang]}</SelectItem>
              <SelectItem value="accountant">{roleStyle.accountant.label[lang]}</SelectItem>
              <SelectItem value="owner">{roleStyle.owner.label[lang]}</SelectItem>
              <SelectItem value="no_role">{lang === "bn" ? "রোল নেই" : "No role"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "bn" ? "সব স্ট্যাটাস" : "All status"}</SelectItem>
              <SelectItem value="confirmed">{lang === "bn" ? "ভেরিফাইড" : "Verified"}</SelectItem>
              <SelectItem value="unconfirmed">{lang === "bn" ? "অভেরিফাইড" : "Unverified"}</SelectItem>
              <SelectItem value="banned">{lang === "bn" ? "ব্লকড" : "Blocked"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="rounded-2xl border border-border bg-card shadow-soft divide-y divide-border">
          <div className="px-5 py-3 font-semibold text-foreground flex items-center justify-between">
            <span>{lang === "bn" ? "ব্যবহারকারী" : "Users"}</span>
            <span className="text-xs text-muted-foreground">{filtered.length} / {rows.length}</span>
          </div>

          {loading && (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              {lang === "bn" ? "কোনো ব্যবহারকারী পাওয়া যায়নি।" : "No users found."}
            </div>
          )}

          {!loading && filtered.map((r) => {
            const isSelf = r.user_id === user?.id;
            const isBanned = !!r.banned_until && new Date(r.banned_until) > new Date();
            const name = lang === "bn"
              ? (r.display_name_bn || r.display_name || r.email || r.user_id.slice(0, 8))
              : (r.display_name || r.email || r.user_id.slice(0, 8));
            const availableRoles: Role[] = (["owner", "accountant", "manager", "admin"] as Role[])
              .filter((x) => !r.roles.includes(x));

            return (
              <div key={r.user_id} className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted shrink-0 overflow-hidden">
                    {r.avatar_url
                      ? <img src={r.avatar_url} alt={name} className="h-full w-full object-cover" />
                      : <UserIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-foreground truncate">{name}</div>
                      {r.confirmed
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        : <XCircle className="h-3.5 w-3.5 text-warning" />}
                      {isBanned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive border border-destructive/30 px-2 py-0.5 text-[10px] font-medium">
                          <Ban className="h-3 w-3" />{lang === "bn" ? "ব্লকড" : "Blocked"}
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] uppercase font-bold text-primary">{lang === "bn" ? "আপনি" : "You"}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      {r.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}
                      {(r.phone || r.profile_phone) && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone || r.profile_phone}</span>}
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(r.created_at)}</span>
                    </div>
                    {r.flats.length > 0 && (
                      <div className="text-xs mt-1 text-foreground/80">
                        {lang === "bn" ? "ফ্ল্যাট: " : "Flats: "}
                        <span className="font-medium">{r.flats.map((f) => f.flat_no).join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Roles */}
                <div className="flex items-center gap-2 flex-wrap">
                  {r.roles.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      {lang === "bn" ? "কোনো রোল নেই" : "No roles"}
                    </span>
                  )}
                  {r.roles.map((role) => {
                    const s = roleStyle[role];
                    return (
                      <span key={role} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
                        {s.icon}{s.label[lang]}
                        <button
                          type="button"
                          onClick={() => revokeRole(r.user_id, role)}
                          disabled={busy || (isSelf && role === "admin")}
                          className="ml-1 hover:opacity-70 disabled:opacity-30"
                          aria-label="Remove role"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                  {availableRoles.length > 0 && (
                    <Select onValueChange={(v) => assignRole(r.user_id, v as Role)}>
                      <SelectTrigger className="h-7 w-auto gap-1 text-xs px-2">
                        <Plus className="h-3 w-3" />
                        <SelectValue placeholder={lang === "bn" ? "রোল যোগ" : "Add role"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>{roleStyle[role].label[lang]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Actions */}
                {!isSelf && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1.5">
                          <Ban className="h-3.5 w-3.5" />
                          {isBanned
                            ? (lang === "bn" ? "আনব্লক" : "Unblock")
                            : (lang === "bn" ? "ব্লক" : "Block")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {isBanned
                              ? (lang === "bn" ? "ব্যবহারকারী আনব্লক করবেন?" : "Unblock user?")
                              : (lang === "bn" ? "ব্যবহারকারী ব্লক করবেন?" : "Block user?")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {isBanned
                              ? (lang === "bn" ? `${name} আবার লগইন করতে পারবেন।` : `${name} will be able to sign in again.`)
                              : (lang === "bn" ? `${name} লগইন করতে পারবেন না।` : `${name} will not be able to sign in.`)}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{lang === "bn" ? "বাতিল" : "Cancel"}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => toggleBan(r.user_id, !isBanned)}>
                            {lang === "bn" ? "নিশ্চিত" : "Confirm"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                          {lang === "bn" ? "ডিলিট" : "Delete"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {lang === "bn" ? "ব্যবহারকারী মুছে ফেলবেন?" : "Delete user?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {lang === "bn"
                              ? `${name}-কে চিরতরে মুছে ফেলা হবে। এটি ফেরানো যাবে না।`
                              : `${name} will be permanently deleted. This cannot be undone.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{lang === "bn" ? "বাতিল" : "Cancel"}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUser(r.user_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {lang === "bn" ? "ডিলিট নিশ্চিত" : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
