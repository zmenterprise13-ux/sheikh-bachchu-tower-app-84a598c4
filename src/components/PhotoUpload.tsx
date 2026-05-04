import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { InitialsFallback } from "@/components/InitialsFallback";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompress";

type Props = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
  folder?: string;
};

export function PhotoUpload({ value, onChange, label, folder = "misc" }: Props) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    setBusy(true);
    try {
      const compressed = await compressImage(file, { maxDim: 800, quality: 0.8 });
      const ext = compressed.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg");
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("occupant-photos")
        .upload(path, compressed, { upsert: false, contentType: compressed.type || file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("occupant-photos").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const altText = value
    ? (label ? `Profile photo for ${label}` : "Profile photo")
    : (label ? `No photo uploaded for ${label}` : "No photo uploaded");
  const uploadLabel = value
    ? (label ? `Replace photo for ${label}` : "Replace photo")
    : (label ? `Upload photo for ${label}` : "Upload photo");

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-16 w-16 border border-border">
        {value ? <AvatarImage src={value} alt={altText} /> : null}
        <InitialsFallback name={label} seed={label} className="text-xs" />
      </Avatar>
      <div className="flex flex-col gap-1">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-label={uploadLabel}
            aria-busy={busy}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-3 w-3" aria-hidden="true" />
            )}
            <span className="ml-1 text-xs">{busy ? "Uploading…" : "Upload"}</span>
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={busy}
              aria-label={label ? `Remove photo for ${label}` : "Remove photo"}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
          aria-label={uploadLabel}
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
