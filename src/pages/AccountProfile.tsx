import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { AvatarImageWithSkeleton } from "@/components/AvatarImageWithSkeleton";
import { InitialsFallback } from "@/components/InitialsFallback";
import { Camera, Loader2, User, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { compressImage } from "@/lib/imageCompress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountProfile() {
  const { lang } = useLang();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [displayNameBn, setDisplayNameBn] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [initial, setInitial] = useState<{ display_name: string; display_name_bn: string; phone: string }>({ display_name: "", display_name_bn: "", phone: "" });
  const [savingInfo, setSavingInfo] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const fetchProfile = useCallback(async (showSpinner = true) => {
    if (!user) return;
    if (showSpinner) setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, display_name, display_name_bn, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    setAvatarUrl((data as any)?.avatar_url ?? null);
    const dn = (data as any)?.display_name ?? "";
    const dnBn = (data as any)?.display_name_bn ?? "";
    const ph = (data as any)?.phone ?? "";
    setDisplayName(dn);
    setDisplayNameBn(dnBn);
    setPhone(ph);
    setInitial({ display_name: dn, display_name_bn: dnBn, phone: ph });
    if (showSpinner) setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile(true);
  }, [fetchProfile]);

  // Re-sync silently when the user revisits the page/tab.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => fetchProfile(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchProfile(false);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, fetchProfile]);

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
      const compressed = await compressImage(blob, { maxDim: 512, quality: 0.82 });
      const path = `user/${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("occupant-photos")
        .upload(path, compressed, { upsert: false, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("occupant-photos").getPublicUrl(path);
      const newUrl = pub.publicUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("user_id", user.id);
      if (updErr) throw updErr;
      // Sync to all owned flats so dashboard shows the same photo
      await supabase.rpc("update_my_owner_photo", { _photo_url: newUrl });
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
      await supabase.rpc("update_my_owner_photo", { _photo_url: null });
      setAvatarUrl(null);
      toast.success(lang === "bn" ? "ছবি সরানো হয়েছে" : "Photo removed");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const dirty =
    displayName.trim() !== initial.display_name.trim() ||
    displayNameBn.trim() !== initial.display_name_bn.trim();

  const saveInfo = async () => {
    if (!user) return;
    const name = displayName.trim();
    const nameBn = displayNameBn.trim();
    if (!name && !nameBn) {
      toast.error(lang === "bn" ? "অন্তত একটি নাম দিন" : "Enter at least one name");
      return;
    }
    setSavingInfo(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name || null,
          display_name_bn: nameBn || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      setInitial({ display_name: name, display_name_bn: nameBn, phone: initial.phone });
      toast.success(lang === "bn" ? "প্রোফাইল আপডেট হয়েছে" : "Profile updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setSavingInfo(false);
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
          {lang === "bn" ? "আপনার নাম ও প্রোফাইল ছবি আপডেট করুন।" : "Update your name and profile photo."}
        </p>

        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border shadow-soft">
              {avatarUrl ? (
                <AvatarImageWithSkeleton
                  src={avatarUrl}
                  alt={
                    displayName
                      ? (lang === "bn" ? `${displayName}-এর প্রোফাইল ছবি` : `Profile photo of ${displayName}`)
                      : (lang === "bn" ? "আপনার প্রোফাইল ছবি" : "Your profile photo")
                  }
                  className="object-cover"
                />
              ) : null}
              <InitialsFallback name={displayName ?? user?.email} seed={user?.id ?? user?.email} className="text-2xl" />
            </Avatar>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy || loading}
              aria-label={
                busy
                  ? (lang === "bn" ? "ছবি আপলোড হচ্ছে" : "Uploading photo")
                  : (avatarUrl
                      ? (lang === "bn" ? "প্রোফাইল ছবি পরিবর্তন" : "Change profile photo")
                      : (lang === "bn" ? "প্রোফাইল ছবি আপলোড" : "Upload profile photo"))
              }
              aria-busy={busy}
              className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full gradient-primary text-primary-foreground shadow-md ring-2 ring-background flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPick}
              aria-label={lang === "bn" ? "প্রোফাইল ছবি ফাইল নির্বাচন" : "Choose profile photo file"}
              tabIndex={-1}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">{(lang === "bn" ? (displayNameBn || displayName) : (displayName || displayNameBn)) || user?.email || "—"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={busy || loading}
              >
                <Camera className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                {lang === "bn" ? "ছবি আপলোড" : "Upload photo"}
              </Button>
              {avatarUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={removePhoto}
                  disabled={busy}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  {lang === "bn" ? "সরান" : "Remove"}
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          {lang === "bn" ? "JPG/PNG, সর্বোচ্চ ৫MB। আপলোডের আগে ক্রপ করতে পারবেন।" : "JPG/PNG, up to 5MB. You can crop before saving."}
        </p>

        <div className="mt-6 pt-6 border-t border-border space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="display_name_bn">নাম (বাংলা)</Label>
              <Input
                id="display_name_bn"
                value={displayNameBn}
                onChange={(e) => setDisplayNameBn(e.target.value)}
                maxLength={120}
                disabled={loading || savingInfo}
                placeholder="আপনার নাম"
                lang="bn"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="display_name">Name (English)</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={120}
                disabled={loading || savingInfo}
                placeholder="Your name"
                lang="en"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{lang === "bn" ? "ফোন নম্বর" : "Phone number"}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              readOnly
              disabled
              className="bg-muted/50 cursor-not-allowed"
              placeholder={lang === "bn" ? "যেমন: 01XXXXXXXXX" : "e.g. 01XXXXXXXXX"}
            />
            <p className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "ফোন নম্বর দিয়েই আপনি লগইন করেন, তাই এটি এখানে পরিবর্তন করা যাবে না। পরিবর্তনের প্রয়োজন হলে অ্যাডমিনের সাথে যোগাযোগ করুন।"
                : "You log in with this phone number, so it cannot be changed here. Please contact the admin to update it."}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            {dirty && !savingInfo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDisplayName(initial.display_name); setDisplayNameBn(initial.display_name_bn); setPhone(initial.phone); }}
              >
                {lang === "bn" ? "বাতিল" : "Reset"}
              </Button>
            )}
            <Button onClick={saveInfo} disabled={!dirty || savingInfo || loading} className="gap-2">
              {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {lang === "bn" ? "সংরক্ষণ" : "Save changes"}
            </Button>
          </div>
        </div>
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
