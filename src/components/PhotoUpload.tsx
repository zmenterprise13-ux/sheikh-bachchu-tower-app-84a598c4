import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("occupant-photos")
        .upload(path, file, { upsert: false, contentType: file.type });
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

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-16 w-16 border border-border">
        {value ? <AvatarImage src={value} alt={label} /> : null}
        <AvatarFallback className="text-xs text-muted-foreground">
          {label?.slice(0, 2) ?? "?"}
        </AvatarFallback>
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
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            <span className="ml-1 text-xs">Upload</span>
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={busy}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
