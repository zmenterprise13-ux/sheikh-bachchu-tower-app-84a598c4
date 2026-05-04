import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/ImageCropDialog";

export default function AccountProfile() {
  const { lang } = useLang();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setAvatarUrl((data as any)?.avatar_url ?? null);
      setDisplayName((data as any)?.display_name ?? null);
      setLoading(false);
    })();
  }, [user]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === "bn" ? "ফাইল অনেক বড় (সর্বোচ্চ ৫MB)" : "File too large (max 5MB)");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onCropped = async (blob: Blob) => {
    if (!user) return;
    setBusy(true);
    try {
      const path = `user/${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("occupant-photos")
        .upload(path, blob, { upsert: false, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("occupant-photos").getPublicUrl(path);
      const newUrl = pub.publicUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("user_id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(newUrl);
      setCropSrc(null);
      toast.success(lang === "bn" ? "প্রোফাইল ছবি আপডেট হয়েছে" : "Profile photo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", user.id);
      if (error) throw error;
      setAvatarUrl(null);
      toast.success(lang === "bn" ? "ছবি সরানো হয়েছে" : "Photo removed");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="rounded-2xl bg-card border border-border p-6 shadow-soft max-w-xl">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1">
          <User className="h-5 w-5 text-primary" />
          {lang === "bn" ? "আমার প্রোফাইল" : "My Profile"}
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {lang === "bn" ? "আপনার প্রোফাইল ছবি আপলোড ও পরিবর্তন করুন।" : "Upload or change your profile photo."}
        </p>

        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border shadow-soft">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName ?? "Me"} className="object-cover" /> : null}
              <AvatarFallback className="bg-secondary">
                <User className="h-10 w-10 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy || loading}
              aria-label={lang === "bn" ? "ছবি পরিবর্তন" : "Change photo"}
              className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full gradient-primary text-primary-foreground shadow-md ring-2 ring-background flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">{displayName ?? user?.email ?? "—"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy || loading}>
                <Camera className="h-3.5 w-3.5 mr-1.5" />
                {lang === "bn" ? "ছবি আপলোড" : "Upload photo"}
              </Button>
              {avatarUrl && (
                <Button size="sm" variant="ghost" onClick={removePhoto} disabled={busy}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {lang === "bn" ? "সরান" : "Remove"}
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          {lang === "bn" ? "JPG/PNG, সর্বোচ্চ ৫MB। আপলোডের আগে ক্রপ করতে পারবেন।" : "JPG/PNG, up to 5MB. You can crop before saving."}
        </p>
      </div>

      <ImageCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        title={lang === "bn" ? "ছবি ক্রপ করুন" : "Crop photo"}
        onCancel={() => setCropSrc(null)}
        onCropped={onCropped}
        aspect={1}
        cropShape="round"
      />
    </AppShell>
  );
}
