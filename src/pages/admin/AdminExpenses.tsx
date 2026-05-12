import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { formatMoney } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Wallet, Pencil, Trash2, Settings2, X, ChevronDown, ChevronRight, Calendar, List, ClipboardList, Check, AlertCircle, Paperclip, FileText, Image as ImageIcon, Loader2, Eye, Download } from "lucide-react";
import { compressImageToTarget } from "@/lib/compressTo";
import { TKey } from "@/i18n/translations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OtherIncomeSection from "@/components/OtherIncomeSection";
import { ApprovalBadge, approvalFieldsForInsert } from "@/components/ApprovalBadge";

type Category = {
  id: string;
  name: string;
  name_bn: string | null;
  sort_order: number;
};

type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  service_month?: string | null;
  approval_status?: string | null;
  reject_reason?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
};

export default function AdminExpenses() {
  const { t, lang } = useLang();
  const { user, role } = useAuth();
  const [items, setItems] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", name_bn: "" });
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"flat" | "grouped">("grouped");
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  // Monthly template
  const TEMPLATE_ITEMS: { name: string; name_bn: string }[] = [
    { name: "Gas Bill", name_bn: "গ্যাস বিল" },
    { name: "Electricity", name_bn: "বিদ্যুৎ" },
    { name: "Water", name_bn: "পানি" },
    { name: "Garbage Bill", name_bn: "ময়লা বিল" },
    { name: "Security Guard", name_bn: "সিকিউরিটি গার্ড বিল" },
    { name: "Lift & Generator Service", name_bn: "লিফট ও জেনারেটর সার্ভিস চার্জ" },
    { name: "Night Guard", name_bn: "নাইট গার্ড" },
    { name: "Miscellaneous", name_bn: "বিবিধ" },
  ];
  const currentYM = new Date().toISOString().slice(0, 7);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateMonth, setTemplateMonth] = useState(currentYM);
  const [templateRows, setTemplateRows] = useState<{ checked: boolean; amount: string; description: string; billMonth: string }[]>(
    TEMPLATE_ITEMS.map(() => ({ checked: false, amount: "", description: "", billMonth: currentYM }))
  );
  const [templateSubmitting, setTemplateSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "",
    description: "",
    amount: "",
    service_month: "",
    attachment_url: "" as string | null | "",
    attachment_type: "" as string | null | "",
  });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = (typeof window !== "undefined") ? { current: null as HTMLInputElement | null } : { current: null };

  const catLabel = (c: Category) => (lang === "bn" ? c.name_bn || c.name : c.name);
  const labelByName = (name: string) => {
    const c = categories.find((x) => x.name === name);
    return c ? catLabel(c) : name;
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      category: categories[0]?.name ?? "",
      description: "",
      amount: "",
      service_month: "",
      attachment_url: "",
      attachment_type: "",
    });
    setEditingId(null);
  };

  const deleteCloudinaryAttachment = async (url?: string | null) => {
    if (!url || !url.includes("cloudinary.com")) return;
    try {
      await supabase.functions.invoke("cloudinary-delete", { body: { url } });
    } catch (err) {
      console.warn("Cloudinary delete failed", err);
    }
  };

  const handleAttachmentPick = async (file: File | null | undefined) => {
    if (!file) return;

    const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
    const MAX_PDF_BYTES = 15 * 1024 * 1024;   // 15MB
    const fmtMB = (b: number) => `${(b / (1024 * 1024)).toFixed(1)}MB`;

    const lowerName = file.name.toLowerCase();
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(lowerName);
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");

    // Empty file
    if (file.size === 0) {
      toast.error(lang === "bn" ? "ফাইলটি খালি" : "File is empty");
      return;
    }
    // Type check
    if (!isImage && !isPdf) {
      toast.error(
        lang === "bn"
          ? "শুধু ছবি (JPG/PNG/WEBP) বা PDF আপলোড করা যাবে"
          : "Only image (JPG/PNG/WEBP) or PDF files are allowed"
      );
      return;
    }
    if (isImage && file.type && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      toast.error(
        lang === "bn"
          ? `এই ছবি ফরম্যাট সাপোর্ট করে না (${file.type})`
          : `Unsupported image format (${file.type})`
      );
      return;
    }
    // Size check
    const limit = isImage ? MAX_IMAGE_BYTES : MAX_PDF_BYTES;
    if (file.size > limit) {
      toast.error(
        lang === "bn"
          ? `ফাইল সাইজ ${fmtMB(file.size)} — সর্বোচ্চ ${fmtMB(limit)} অনুমোদিত`
          : `File is ${fmtMB(file.size)} — max ${fmtMB(limit)} allowed`
      );
      return;
    }

    // Replacing an existing attachment: delete old from Cloudinary
    if (form.attachment_url) deleteCloudinaryAttachment(form.attachment_url);

    setUploadingAttachment(true);
    const uploadingToastId = toast.loading(lang === "bn" ? "আপলোড হচ্ছে…" : "Uploading…");
    try {
      let toUpload: Blob = file;
      let ext = "pdf";
      let contentType = "application/pdf";
      if (isImage) {
        try {
          // Better resolution at small size: target ~350KB, allow up to 2000px on longest side
          toUpload = await compressImageToTarget(file, 350 * 1024, { startMaxDim: 2000, minDim: 1000 });
        } catch {
          toast.dismiss(uploadingToastId);
          toast.error(lang === "bn" ? "ছবি প্রক্রিয়া করা যায়নি" : "Could not process image");
          setUploadingAttachment(false);
          return;
        }
        ext = "jpg";
        contentType = "image/jpeg";
      }
      const cloudName = "dbwc5vwyf";
      const uploadPreset = "skjmbuhc";
      const fd = new FormData();
      const filename = `expense_${Date.now()}.${ext}`;
      fd.append("file", new File([toUpload], filename, { type: contentType }));
      fd.append("upload_preset", uploadPreset);
      fd.append("folder", "expense-attachments");
      const resourceType = isImage ? "image" : "raw";
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.secure_url) {
        const msg = json?.error?.message || `Upload failed (${res.status})`;
        throw new Error(msg);
      }
      setForm((f) => ({ ...f, attachment_url: json.secure_url as string, attachment_type: isImage ? "image" : "pdf" }));
      const kb = Math.round(toUpload.size / 1024);
      toast.dismiss(uploadingToastId);
      toast.success(lang === "bn" ? `আপলোড হয়েছে (${kb}KB)` : `Uploaded (${kb}KB)`);
    } catch (err: any) {
      toast.dismiss(uploadingToastId);
      const msg = err?.message ?? (lang === "bn" ? "আপলোড ব্যর্থ" : "Upload failed");
      toast.error(lang === "bn" ? `আপলোড ব্যর্থ: ${msg}` : `Upload failed: ${msg}`);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("id, name, name_bn, sort_order")
      .order("sort_order", { ascending: true });
    if (error) { toast.error(error.message); return; }
    setCategories((data ?? []) as Category[]);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("id, date, category, description, amount, service_month, approval_status, reject_reason, attachment_url, attachment_type")
      .order("date", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Expense[]);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
    load();
  }, []);

  useEffect(() => {
    if (!form.category && categories.length > 0) {
      setForm((f) => ({ ...f, category: categories[0].name }));
    }
  }, [categories]);

  const total = items.filter(e => (e.approval_status ?? "approved") === "approved").reduce((s, e) => s + Number(e.amount), 0);

  // Group expenses by month (YYYY-MM)
  const grouped = items.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = (e.date || "").slice(0, 7); // YYYY-MM
    (acc[key] ||= []).push(e);
    return acc;
  }, {});
  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const monthLabel = (ym: string) => {
    if (!ym) return "—";
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    return d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" });
  };
  const toggleMonth = (ym: string) => setCollapsedMonths((s) => ({ ...s, [ym]: !s[ym] }));

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      date: e.date,
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      service_month: e.service_month ?? "",
      attachment_url: e.attachment_url ?? "",
      attachment_type: e.attachment_type ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0 || !form.description.trim() || !form.category) {
      toast.error(lang === "bn" ? "সঠিক তথ্য দিন" : "Please enter valid details");
      return;
    }
    setSubmitting(true);
    let error;
    const sm = form.service_month && /^\d{4}-\d{2}$/.test(form.service_month) ? form.service_month : null;
    if (editingId) {
      ({ error } = await supabase.from("expenses").update({
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        amount: amt,
        service_month: sm,
        attachment_url: form.attachment_url || null,
        attachment_type: form.attachment_type || null,
      }).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("expenses").insert({
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        amount: amt,
        service_month: sm,
        attachment_url: form.attachment_url || null,
        attachment_type: form.attachment_type || null,
        created_by: user?.id ?? null,
        ...approvalFieldsForInsert(role, user?.id),
      }));
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? (lang === "bn" ? "আপডেট হয়েছে" : "Updated") : (lang === "bn" ? "খরচ যোগ হয়েছে" : "Expense added"));
    resetForm();
    setOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const target = items.find((x) => x.id === deleteId);
    const { error } = await supabase.from("expenses").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      if (target?.attachment_url) deleteCloudinaryAttachment(target.attachment_url);
      toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted");
      load();
    }
    setDeleteId(null);
  };

  const addCategory = async () => {
    if (!newCat.name.trim()) {
      toast.error(lang === "bn" ? "নাম দিন" : "Enter name");
      return;
    }
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { error } = await supabase.from("expense_categories").insert({
      name: newCat.name.trim(),
      name_bn: newCat.name_bn.trim() || null,
      sort_order: maxOrder + 1,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "ক্যাটেগরি যোগ হয়েছে" : "Category added");
    setNewCat({ name: "", name_bn: "" });
    loadCategories();
  };

  const saveEditCat = async () => {
    if (!editingCat || !editingCat.name.trim()) return;
    const { error } = await supabase.from("expense_categories").update({
      name: editingCat.name.trim(),
      name_bn: editingCat.name_bn?.trim() || null,
    }).eq("id", editingCat.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "আপডেট হয়েছে" : "Updated");
    setEditingCat(null);
    loadCategories();
  };

  const confirmDeleteCat = async () => {
    if (!deleteCatId) return;
    const { error } = await supabase.from("expense_categories").delete().eq("id", deleteCatId);
    if (error) toast.error(error.message);
    else { toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted"); loadCategories(); }
    setDeleteCatId(null);
  };

  const openTemplate = (ym: string) => {
    setTemplateMonth(ym);
    // Pre-fill: check which template items already exist for that month
    const monthSet = new Set(
      items.filter((e) => (e.date || "").slice(0, 7) === ym).map((e) => e.category)
    );
    setTemplateRows(
      TEMPLATE_ITEMS.map((it) => ({
        checked: !monthSet.has(it.name),
        amount: "",
        description: "",
        billMonth: ym,
      }))
    );
    setTemplateOpen(true);
  };

  const submitTemplate = async () => {
    const selected = TEMPLATE_ITEMS
      .map((it, i) => ({ it, row: templateRows[i] }))
      .filter(({ row }) => row.checked && Number(row.amount) > 0);
    if (selected.length === 0) {
      toast.error(lang === "bn" ? "অন্তত একটি খরচ যোগ করুন" : "Add at least one expense");
      return;
    }
    setTemplateSubmitting(true);

    // Ensure all template categories exist
    const existingNames = new Set(categories.map((c) => c.name));
    const toCreate = TEMPLATE_ITEMS.filter((it) => !existingNames.has(it.name));
    if (toCreate.length > 0) {
      let maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
      const rows = toCreate.map((it) => ({
        name: it.name,
        name_bn: it.name_bn,
        sort_order: ++maxOrder,
        created_by: user?.id ?? null,
      }));
      const { error } = await supabase.from("expense_categories").insert(rows);
      if (error) { setTemplateSubmitting(false); toast.error(error.message); return; }
      await loadCategories();
    }

    const expenseRows = selected.map(({ it, row }) => {
      const ym = row.billMonth || templateMonth;
      const [yy, mm] = ym.split("-").map(Number);
      const lastDay = new Date(yy, mm, 0).getDate();
      const date = `${ym}-${String(lastDay).padStart(2, "0")}`;
      return {
        date,
        category: it.name,
        description: row.description.trim() || (lang === "bn" ? `${it.name_bn} - ${monthLabel(ym)}` : `${it.name} - ${monthLabel(ym)}`),
        amount: Number(row.amount),
        service_month: ym,
        created_by: user?.id ?? null,
        ...approvalFieldsForInsert(role, user?.id),
      };
    });
    const { error } = await supabase.from("expenses").insert(expenseRows);
    setTemplateSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? `${selected.length} টি খরচ যোগ হয়েছে` : `${selected.length} expenses added`);
    setTemplateOpen(false);
    load();
  };

  return (
    <AppShell>
      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="expenses">{lang === "bn" ? "ব্যয়" : "Expenses"}</TabsTrigger>
          <TabsTrigger value="other-income">{lang === "bn" ? "অন্যান্য আয়" : "Other Income"}</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("expenses")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("total")}: <span className="font-bold text-foreground">{formatMoney(total, lang)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setCatOpen(true)}>
              <Settings2 className="h-4 w-4" /> {lang === "bn" ? "ক্যাটেগরি" : "Categories"}
            </Button>
            <Button variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/5" onClick={() => openTemplate(currentYM)}>
              <ClipboardList className="h-4 w-4" /> {lang === "bn" ? "মাসিক টেমপ্লেট" : "Monthly Template"}
            </Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground gap-2 shadow-elegant">
                  <Plus className="h-4 w-4" /> {t("addExpense")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? t("edit") + " - " + t("expenses") : t("addExpense")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("date")}</Label>
                      <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("amount")}</Label>
                      <Input type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("category")}</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.name}>{catLabel(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("description")}</Label>
                    <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      {lang === "bn" ? "কোন মাসের খরচ (ঐচ্ছিক)" : "Service month (optional)"}
                    </Label>
                    <Input
                      type="month"
                      value={form.service_month}
                      onChange={(e) => setForm({ ...form, service_month: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "bn"
                        ? "যেমন: এপ্রিল মাসের সিকিউরিটি বেতন মে মাসে দিলে এখানে এপ্রিল সিলেক্ট করুন। ফাঁকা থাকলে তারিখের মাসই ধরা হবে।"
                        : "E.g. paying April's security salary in May — select April here. Leave blank to use the date's month."}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      {lang === "bn" ? "সংযুক্তি (ছবি বা PDF, ঐচ্ছিক)" : "Attachment (image or PDF, optional)"}
                    </Label>
                    {form.attachment_url ? (
                      <div className="rounded-lg border border-border bg-secondary/40 p-2 space-y-2">
                        <div className="flex items-start gap-2">
                          {form.attachment_type === "pdf" ? (
                            <div className="h-16 w-16 rounded-md bg-background border border-border flex items-center justify-center shrink-0">
                              <FileText className="h-7 w-7 text-primary" />
                            </div>
                          ) : (
                            <a href={form.attachment_url} target="_blank" rel="noreferrer" className="shrink-0">
                              <img
                                src={form.attachment_url}
                                alt="attachment preview"
                                className="h-16 w-16 object-cover rounded-md border border-border"
                              />
                            </a>
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="text-xs font-medium truncate">
                              {form.attachment_type === "pdf"
                                ? (lang === "bn" ? "PDF সংযুক্তি" : "PDF attachment")
                                : (lang === "bn" ? "ছবি সংযুক্তি" : "Image attachment")}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={form.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {lang === "bn" ? "প্রিভিউ" : "Preview"}
                              </a>
                              <a
                                href={form.attachment_url}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Download className="h-3.5 w-3.5" />
                                {lang === "bn" ? "ডাউনলোড" : "Download"}
                              </a>
                            </div>
                          </div>
                          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 shrink-0"
                            onClick={() => {
                              if (form.attachment_url) deleteCloudinaryAttachment(form.attachment_url);
                              setForm((f) => ({ ...f, attachment_url: "", attachment_type: "" }));
                            }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          disabled={uploadingAttachment}
                          onChange={(e) => handleAttachmentPick(e.target.files?.[0])}
                          className="text-xs"
                        />
                        {uploadingAttachment && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "bn"
                        ? "ছবি ভালো রেজুলেশন রেখে ~৩৫০KB এ কম্প্রেস হবে। PDF সর্বোচ্চ ১৫MB।"
                        : "Images are compressed to ~350KB while keeping good resolution. PDF max 15MB."}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }} disabled={submitting || uploadingAttachment}>{t("cancel")}</Button>
                  <Button className="gradient-primary text-primary-foreground" onClick={submit} disabled={submitting || uploadingAttachment}>
                    {submitting ? "..." : t("save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-base ${viewMode === "grouped" ? "gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {lang === "bn" ? "মাস অনুযায়ী" : "By month"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-base ${viewMode === "flat" ? "gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" />
              {lang === "bn" ? "সব একসাথে" : "All together"}
            </button>
          </div>
          {viewMode === "grouped" && sortedMonths.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCollapsedMonths({})}>
                {lang === "bn" ? "সব খুলুন" : "Expand all"}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCollapsedMonths(Object.fromEntries(sortedMonths.map((m) => [m, true])))}>
                {lang === "bn" ? "সব বন্ধ" : "Collapse all"}
              </Button>
            </div>
          )}
        </div>

        {/* GROUPED VIEW */}
        {viewMode === "grouped" && (
          <div className="space-y-4">
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            )}
            {!loading && sortedMonths.length === 0 && (
              <div className="rounded-2xl bg-card border border-border p-12 text-center text-muted-foreground">{t("noData")}</div>
            )}
            {!loading && sortedMonths.map((ym) => {
              const monthItems = grouped[ym];
              const monthTotal = monthItems.reduce((s, e) => s + Number(e.amount), 0);
              const collapsed = !!collapsedMonths[ym];
              return (
                <div key={ym} className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleMonth(ym)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-secondary/60 to-secondary/20 border-b border-border hover:from-secondary/80 transition-base text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">{monthLabel(ym)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {monthItems.length} {lang === "bn" ? "টি খরচ" : "expenses"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("total")}</div>
                      <div className="text-base font-bold text-primary">{formatMoney(monthTotal, lang)}</div>
                    </div>
                  </button>
                  {!collapsed && (
                    <div className="divide-y divide-border">
                      {monthItems.map((e) => (
                        <div key={e.id} className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-secondary/30 transition-base">
                          <div className="md:col-span-2 text-sm text-muted-foreground">{e.date}</div>
                          <div className="md:col-span-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                              <Wallet className="h-3 w-3" /> {labelByName(e.category)}
                            </span>
                          </div>
                          <div className="md:col-span-3 text-sm text-foreground">
                            {e.description}
                            {e.service_month && e.service_month !== (e.date || "").slice(0, 7) && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                {lang === "bn" ? `${monthLabel(e.service_month)} এর বিল` : `for ${monthLabel(e.service_month)}`}
                              </span>
                            )}
                            {e.attachment_url && (
                              <div className="mt-1.5 flex items-center gap-2">
                                {e.attachment_type === "image" ? (
                                  <a href={e.attachment_url} target="_blank" rel="noreferrer" className="shrink-0">
                                    <img src={e.attachment_url} alt="attachment"
                                      className="h-10 w-10 rounded border border-border object-cover hover:opacity-80" />
                                  </a>
                                ) : (
                                  <a href={e.attachment_url} target="_blank" rel="noreferrer"
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-muted hover:bg-muted/70">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </a>
                                )}
                                <a href={e.attachment_url} target="_blank" rel="noreferrer"
                                  className="text-[10px] text-primary hover:underline break-all line-clamp-2">
                                  {e.attachment_url}
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="md:col-span-3">
                            <ApprovalBadge table="expenses" id={e.id} status={e.approval_status} rejectReason={e.reject_reason} onChanged={load} />
                          </div>
                          <div className="md:col-span-1 md:text-right font-bold text-foreground">{formatMoney(Number(e.amount), lang)}</div>
                          <div className="md:col-span-1 flex justify-end gap-1">
                            {role !== "accountant" && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && sortedMonths.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-border px-5 py-4 flex justify-between items-center">
                <div className="text-sm font-semibold text-foreground">{lang === "bn" ? "সর্বমোট" : "Grand Total"}</div>
                <div className="text-xl font-bold text-primary">{formatMoney(total, lang)}</div>
              </div>
            )}
          </div>
        )}

        {/* FLAT VIEW */}
        {viewMode === "flat" && (
          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase border-b border-border bg-secondary/40">
              <div className="col-span-2">{t("date")}</div>
              <div className="col-span-3">{t("category")}</div>
              <div className="col-span-4">{t("description")}</div>
              <div className="col-span-2 text-right">{t("amount")}</div>
              <div className="col-span-1 text-right"></div>
            </div>
            <div className="divide-y divide-border">
              {loading && (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">{t("noData")}</div>
              )}
              {!loading && items.map((e) => (
                <div key={e.id} className="grid grid-cols-2 md:grid-cols-12 gap-3 px-5 py-3 items-center">
                  <div className="md:col-span-2 text-sm text-muted-foreground">{e.date}</div>
                  <div className="md:col-span-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                      <Wallet className="h-3 w-3" /> {labelByName(e.category)}
                    </span>
                  </div>
                  <div className="md:col-span-3 text-sm text-foreground">
                    {e.description}
                    {e.service_month && e.service_month !== (e.date || "").slice(0, 7) && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        {lang === "bn" ? `${monthLabel(e.service_month)} এর বিল` : `for ${monthLabel(e.service_month)}`}
                      </span>
                    )}
                    {e.attachment_url && (
                      <a href={e.attachment_url} target="_blank" rel="noreferrer"
                        className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 hover:bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {e.attachment_type === "pdf" ? <FileText className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                        {lang === "bn" ? "সংযুক্তি" : "Attachment"}
                      </a>
                    )}
                  </div>
                  <div className="md:col-span-3">
                    <ApprovalBadge table="expenses" id={e.id} status={e.approval_status} rejectReason={e.reject_reason} onChanged={load} />
                  </div>
                  <div className="md:col-span-1 md:text-right font-bold text-foreground">{formatMoney(Number(e.amount), lang)}</div>
                  <div className="md:col-span-1 flex justify-end gap-1">
                    {role !== "accountant" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-5 py-4 border-t border-border bg-secondary/40">
              <div className="text-sm font-semibold text-foreground">{t("total")}</div>
              <div className="text-lg font-bold text-primary">{formatMoney(total, lang)}</div>
            </div>
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{lang === "bn" ? "মুছে ফেলবেন?" : "Delete expense?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {lang === "bn" ? "এই খরচটি স্থায়ীভাবে মুছে যাবে।" : "This expense will be permanently deleted."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {lang === "bn" ? "মুছুন" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Categories management */}
        <Dialog open={catOpen} onOpenChange={setCatOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{lang === "bn" ? "খরচের ক্যাটেগরি" : "Expense Categories"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "নাম (English)" : "Name (English)"}</Label>
                  <Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Internet" />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "bn" ? "নাম (বাংলা)" : "Name (Bangla)"}</Label>
                  <Input value={newCat.name_bn} onChange={(e) => setNewCat({ ...newCat, name_bn: e.target.value })} placeholder="যেমন: ইন্টারনেট" />
                </div>
                <Button className="gradient-primary text-primary-foreground" onClick={addCategory}>
                  <Plus className="h-4 w-4" /> {lang === "bn" ? "যোগ" : "Add"}
                </Button>
              </div>

              <div className="rounded-lg border border-border divide-y divide-border max-h-[50vh] overflow-y-auto">
                {categories.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">{t("noData")}</div>
                )}
                {categories.map((c) => (
                  <div key={c.id} className="p-3 flex items-center gap-2">
                    {editingCat?.id === c.id ? (
                      <>
                        <Input className="flex-1" value={editingCat.name} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} />
                        <Input className="flex-1" value={editingCat.name_bn ?? ""} onChange={(e) => setEditingCat({ ...editingCat, name_bn: e.target.value })} />
                        <Button size="sm" onClick={saveEditCat}>{t("save")}</Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCat(null)}><X className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{c.name}</div>
                          {c.name_bn && <div className="text-xs text-muted-foreground">{c.name_bn}</div>}
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCat(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteCatId(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteCatId} onOpenChange={(v) => !v && setDeleteCatId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{lang === "bn" ? "ক্যাটেগরি মুছবেন?" : "Delete category?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {lang === "bn" ? "এটি শুধু ক্যাটেগরি লিস্ট থেকে মুছে যাবে, পুরাতন খরচ অপরিবর্তিত থাকবে।" : "This only removes the category from the list. Existing expenses are unchanged."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteCat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {lang === "bn" ? "মুছুন" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Monthly Template Dialog */}
        <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                {lang === "bn" ? "মাসিক খরচ টেমপ্লেট" : "Monthly Expense Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground flex gap-2">
                <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  {lang === "bn"
                    ? "প্রতি মাসে যেগুলো নিয়মিত আসে সেগুলো এখান থেকে দ্রুত যোগ করুন। যেগুলো আগে থেকেই এই মাসে যোগ করা আছে সেগুলো অটো আনচেক হবে।"
                    : "Quickly add the recurring monthly expenses. Items already added for this month are auto-unchecked."}
                </div>
              </div>

              {(() => {
                const [ty, tm] = templateMonth.split("-").map(Number);
                const monthNames = lang === "bn"
                  ? ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"]
                  : ["January","February","March","April","May","June","July","August","September","October","November","December"];
                const thisYear = new Date().getFullYear();
                const years = Array.from({ length: 7 }, (_, i) => thisYear - 3 + i);
                return (
                  <div className="space-y-2">
                    <Label>{lang === "bn" ? "কোন মাসের বিল?" : "Bill for which month?"}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={String(tm)} onValueChange={(v) => openTemplate(`${ty}-${String(Number(v)).padStart(2, "0")}`)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {monthNames.map((mn, idx) => (
                            <SelectItem key={idx} value={String(idx + 1)}>{mn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={String(ty)} onValueChange={(v) => openTemplate(`${v}-${String(tm).padStart(2, "0")}`)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>{lang === "bn" ? y.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]) : y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 px-4 py-2.5 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {lang === "bn" ? "নির্বাচিত মাস" : "Selected month"}
                      </div>
                      <div className="text-base font-bold text-primary">{monthLabel(templateMonth)}</div>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {TEMPLATE_ITEMS.map((it, i) => {
                  const row = templateRows[i];
                  const alreadyExists = items.some(
                    (e) => (e.date || "").slice(0, 7) === templateMonth && e.category === it.name
                  );
                  return (
                    <div key={it.name} className={`p-3 space-y-2 ${row.checked ? "bg-primary/5" : ""}`}>
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <label className="col-span-12 sm:col-span-5 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={row.checked}
                            onChange={(e) => {
                              const next = [...templateRows];
                              next[i] = { ...row, checked: e.target.checked };
                              setTemplateRows(next);
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-foreground">
                              {lang === "bn" ? it.name_bn : it.name}
                            </div>
                            {alreadyExists && (
                              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                <Check className="h-3 w-3" /> {lang === "bn" ? "এই মাসে যোগ করা আছে" : "Already added this month"}
                              </div>
                            )}
                          </div>
                        </label>
                        <Input
                          type="number"
                          min="0"
                          placeholder={lang === "bn" ? "টাকা" : "Amount"}
                          className="col-span-5 sm:col-span-3"
                          value={row.amount}
                          disabled={!row.checked}
                          onChange={(e) => {
                            const next = [...templateRows];
                            next[i] = { ...row, amount: e.target.value };
                            setTemplateRows(next);
                          }}
                        />
                        <Input
                          placeholder={lang === "bn" ? "নোট (ঐচ্ছিক)" : "Note (optional)"}
                          className="col-span-7 sm:col-span-4"
                          value={row.description}
                          disabled={!row.checked}
                          onChange={(e) => {
                            const next = [...templateRows];
                            next[i] = { ...row, description: e.target.value };
                            setTemplateRows(next);
                          }}
                        />
                      </div>
                      {row.checked && (() => {
                        const [ry, rm] = (row.billMonth || templateMonth).split("-").map(Number);
                        const monthNamesR = lang === "bn"
                          ? ["জানু","ফেব্রু","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্ট","অক্টো","নভে","ডিসে"]
                          : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        const thisYearR = new Date().getFullYear();
                        const yearsR = Array.from({ length: 7 }, (_, k) => thisYearR - 3 + k);
                        const isDifferent = (row.billMonth || templateMonth) !== templateMonth;
                        return (
                          <div className="flex flex-wrap items-center gap-2 pl-6 text-xs">
                            <span className="text-muted-foreground font-semibold">
                              {lang === "bn" ? "কোন মাসের বিল:" : "Bill month:"}
                            </span>
                            <Select
                              value={String(rm)}
                              onValueChange={(v) => {
                                const next = [...templateRows];
                                next[i] = { ...row, billMonth: `${ry}-${String(Number(v)).padStart(2, "0")}` };
                                setTemplateRows(next);
                              }}
                            >
                              <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {monthNamesR.map((mn, idx) => (
                                  <SelectItem key={idx} value={String(idx + 1)}>{mn}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={String(ry)}
                              onValueChange={(v) => {
                                const next = [...templateRows];
                                next[i] = { ...row, billMonth: `${v}-${String(rm).padStart(2, "0")}` };
                                setTemplateRows(next);
                              }}
                            >
                              <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {yearsR.map((y) => (
                                  <SelectItem key={y} value={String(y)}>{lang === "bn" ? y.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]) : y}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isDifferent && (
                              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                                {lang === "bn" ? "পুরাতন মাস" : "Past month"}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center text-sm">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setTemplateRows(templateRows.map((r) => ({ ...r, checked: true })))}
                >
                  {lang === "bn" ? "সব নির্বাচন" : "Select all"}
                </button>
                <div className="font-semibold text-foreground">
                  {t("total")}: {formatMoney(templateRows.reduce((s, r) => s + (r.checked ? Number(r.amount) || 0 : 0), 0), lang)}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateOpen(false)} disabled={templateSubmitting}>
                {t("cancel")}
              </Button>
              <Button className="gradient-primary text-primary-foreground" onClick={submitTemplate} disabled={templateSubmitting}>
                {templateSubmitting ? "..." : (lang === "bn" ? "নির্বাচিতগুলো যোগ করুন" : "Add selected")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </TabsContent>
        <TabsContent value="other-income">
          <OtherIncomeSection />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
