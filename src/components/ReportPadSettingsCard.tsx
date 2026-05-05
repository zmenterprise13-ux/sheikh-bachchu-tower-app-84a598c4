import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLang } from "@/i18n/LangContext";
import { useReportPad } from "@/hooks/useReportPad";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, ImageIcon } from "lucide-react";

export function ReportPadSettingsCard() {
  const { lang } = useLang();
  const { settings, loading, save, refresh } = useReportPad();
  const [enabled, setEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEnabled(settings.enabled); }, [settings.enabled]);

  const onToggle = async (v: boolean) => {
    setEnabled(v);
    const { error } = await save({ ...settings, enabled: v });
    if (error) toast.error(error.message);
    else toast.success(v ? (lang === "bn" ? "প্যাড চালু" : "Pad enabled") : (lang === "bn" ? "প্যাড বন্ধ" : "Pad disabled"));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const ext = f.name.split(".").pop() || "png";
      const path = `pad-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("report-pad").upload(path, f, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("report-pad").getPublicUrl(path);
      const { error } = await save({ url: data.publicUrl, enabled: true });
      if (error) throw error;
      setEnabled(true);
      toast.success(lang === "bn" ? "আপলোড সম্পন্ন" : "Uploaded");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onRemove = async () => {
    const { error } = await save({ url: null, enabled: false });
    if (error) toast.error(error.message);
    else { setEnabled(false); toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Removed"); }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            {lang === "bn" ? "রিপোর্ট প্যাড (লেটারহেড)" : "Report pad (letterhead)"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "bn"
              ? "আপলোড করা প্যাড সকল প্রিন্টযোগ্য রিপোর্টের ব্যাকগ্রাউন্ডে দেখা যাবে। অন/অফ করা যাবে।"
              : "The uploaded pad will appear behind all printable reports. Can be toggled on/off."}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={loading || !settings.url} />
      </div>

      {settings.url ? (
        <div className="rounded-lg border border-border p-3 bg-muted/30">
          <div className="aspect-[1/1.414] w-40 mx-auto bg-white border border-border overflow-hidden rounded">
            <img src={settings.url} alt="Report pad preview" className="w-full h-full object-contain" />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          {lang === "bn" ? "এখনো কোনো প্যাড আপলোড করা হয়নি।" : "No pad uploaded yet."}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
          <Upload className="h-4 w-4" />
          {uploading
            ? (lang === "bn" ? "আপলোড হচ্ছে..." : "Uploading...")
            : settings.url
              ? (lang === "bn" ? "প্যাড পরিবর্তন" : "Replace pad")
              : (lang === "bn" ? "প্যাড আপলোড" : "Upload pad")}
        </Button>
        {settings.url && (
          <Button size="sm" variant="ghost" onClick={onRemove} className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            {lang === "bn" ? "মুছে ফেলুন" : "Remove"}
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {lang === "bn"
          ? "টিপ: A4 অনুপাতে (৭৯৪×১১২৩px বা PDF/PNG) প্যাড আপলোড করুন।"
          : "Tip: Upload an A4-ratio image (e.g. 794×1123px PNG)."}
      </p>
    </div>
  );
}
