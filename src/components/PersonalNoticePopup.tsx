import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n/LangContext";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BellRing, AlertTriangle } from "lucide-react";
import { NoticeBody } from "@/components/NoticeBody";
import { useNavigate } from "react-router-dom";

type Row = {
  id: string;
  title: string;
  title_bn: string | null;
  body: string;
  body_bn: string | null;
  important: boolean;
  created_at: string;
};

/**
 * Shows unread personal notices (admin → individual flat owners) once as a popup.
 * Marks them as read on dismiss. They remain visible on the Notices page.
 */
export function PersonalNoticePopup() {
  const { user, role } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [items, setItems] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  const fetchUnread = async () => {
    const { data, error } = await supabase
      .from("personal_notices")
      .select("id, title, title_bn, body, body_bn, important, created_at")
      .is("read_at", null)
      .order("created_at", { ascending: false });
    if (error) return;
    const rows = (data ?? []) as Row[];
    if (rows.length > 0) {
      setItems(rows);
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!user || !role) return;
    if (role !== "owner" && role !== "tenant") return;
    fetchUnread();
  }, [user, role]);

  const markAllRead = async () => {
    const ids = items.map((r) => r.id);
    if (ids.length === 0) return;
    await supabase
      .from("personal_notices")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
  };

  const dismiss = async () => {
    setOpen(false);
    await markAllRead();
  };

  const goNotices = async () => {
    setOpen(false);
    await markAllRead();
    navigate("/owner/notices");
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <BellRing className="h-5 w-5" />
            </span>
            {lang === "bn" ? "ব্যক্তিগত বার্তা" : "Personal message"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.important
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {n.important && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                <div className="font-semibold text-foreground">
                  {lang === "bn" ? (n.title_bn || n.title) : (n.title || n.title_bn)}
                </div>
              </div>
              <NoticeBody
                text={lang === "bn" ? (n.body_bn || n.body) : (n.body || n.body_bn || "")}
                lang={lang as "bn" | "en"}
                className="text-sm text-muted-foreground mt-1.5"
              />
              <div className="text-[11px] text-muted-foreground mt-2">
                {new Date(n.created_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={dismiss}>
            {lang === "bn" ? "বুঝেছি" : "Got it"}
          </Button>
          <Button className="gradient-primary text-primary-foreground" onClick={goNotices}>
            {lang === "bn" ? "নোটিশ পেজে যান" : "Open notices"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
