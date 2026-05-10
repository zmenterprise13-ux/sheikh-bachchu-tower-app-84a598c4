import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { InitialsFallback } from "@/components/InitialsFallback";
import { Pencil, Printer, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { parsePermanentAddress, formatPermanentAddress } from "@/components/PermanentAddressFields";

type Flat = { id: string; flat_no: string; floor: number; owner_name: string | null; owner_user_id: string | null };
type FamilyMember = { id: string; name: string; age: number | null; occupation: string | null; phone: string | null };
type TenantRow = Record<string, any> | null;

type Kind = "tenant" | "owner";
const VIEW_CONFIGS = {
  tenant: { infoTable: "tenant_info", familyTable: "tenant_family_members", familyFk: "tenant_info_id", title: "ভাড়াটিয়ার তথ্য (ভিউ)", formTitle: "ভাড়াটিয়া নিবন্ধন ফরম", emptyMsg: "এই ফ্ল্যাটে কোনো ভাড়াটিয়ার তথ্য পাওয়া যায়নি।", editPath: "/tenant-info" },
  owner:  { infoTable: "owner_info",  familyTable: "owner_family_members",  familyFk: "owner_info_id",  title: "মালিকের তথ্য (ভিউ)",     formTitle: "ফ্ল্যাট মালিকের তথ্য", emptyMsg: "এই ফ্ল্যাটে মালিকের কোনো বিস্তারিত তথ্য পাওয়া যায়নি।", editPath: "/owner-info" },
} as const;

const bnDigits = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
const toBn = (s: string | number | null | undefined) => (s == null ? "" : String(s).replace(/\d/g, (d) => bnDigits[+d]));
const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return toBn(dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
};

export default function TenantInfoView({ kind = "tenant" as Kind }: { kind?: Kind } = {}) {
  const cfg = VIEW_CONFIGS[kind];
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string>(params.get("flat") || "");
  const [tenant, setTenant] = useState<TenantRow>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("flats")
        .select("id, flat_no, floor, owner_name, owner_user_id")
        .order("floor").order("flat_no");
      if (error) { toast.error(error.message); return; }
      const list = (data || []) as Flat[];
      const visible = isAdmin ? list : list.filter((f) => f.owner_user_id === user?.id);
      setFlats(visible);
      if (visible.length && !selectedFlatId) setSelectedFlatId(visible[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (!selectedFlatId) return;
    setParams((p) => { p.set("flat", selectedFlatId); return p; }, { replace: true });
    setLoading(true);
    (async () => {
      const sb: any = supabase;
      const { data: ti } = await sb.from(cfg.infoTable).select("*").eq("flat_id", selectedFlatId).maybeSingle();
      setTenant(ti as TenantRow);
      if (ti) {
        const { data: fm } = await sb
          .from(cfg.familyTable)
          .select("id, name, age, occupation, phone")
          .eq(cfg.familyFk, (ti as any).id)
          .order("sort_order").order("created_at");
        setMembers((fm || []) as FamilyMember[]);
      } else {
        setMembers([]);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFlatId, kind]);

  const selectedFlat = flats.find((f) => f.id === selectedFlatId);
  const permanentAddr = tenant?.permanent_address ? formatPermanentAddress(parsePermanentAddress(tenant.permanent_address)) : "";

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Toolbar — hidden in print */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-6 w-6" /> {cfg.title}
            </h1>
            <p className="text-sm text-muted-foreground">শুধু পড়ার জন্য। অফিসিয়াল প্রিন্টের জন্য A4 ফরম্যাটে প্রস্তুত।</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> ফিরে যান
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!tenant}>
              <Printer className="h-4 w-4 mr-1" /> A4 প্রিন্ট
            </Button>
            <Button asChild size="sm" disabled={!tenant}>
              <Link to={`${cfg.editPath}?flat=${selectedFlatId}`}>
                <Pencil className="h-4 w-4 mr-1" /> এডিট
              </Link>
            </Button>
          </div>
        </div>

        <Card className="print:hidden">
          <CardContent className="pt-4">
            <Select value={selectedFlatId} onValueChange={setSelectedFlatId}>
              <SelectTrigger className="w-full sm:w-[320px]">
                <SelectValue placeholder="ফ্ল্যাট নির্বাচন" />
              </SelectTrigger>
              <SelectContent>
                {flats.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    ফ্ল্যাট {f.flat_no} {f.owner_name ? `— ${f.owner_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <Skeleton className="h-96" />
        ) : !tenant ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">এই ফ্ল্যাটে কোনো ভাড়াটিয়ার তথ্য পাওয়া যায়নি।</CardContent></Card>
        ) : (
          <div id="tenant-print-area" className="tenant-print-a4 mx-auto bg-white text-black border border-border shadow-soft">
            {/* Header */}
            <div className="text-center border-b border-black pb-3 mb-4">
              <h2 className="text-xl font-bold">{cfg.formTitle}</h2>
              <p className="text-sm">ফ্ল্যাট {selectedFlat?.flat_no ?? ""} {selectedFlat?.owner_name ? `— মালিক: ${selectedFlat.owner_name}` : ""}</p>
            </div>

            {/* Photo + basic */}
            <div className="flex gap-4 mb-4">
              <div className="shrink-0">
                <Avatar className="h-28 w-28 border border-black rounded-none">
                  {tenant.photo_url ? <AvatarImage src={tenant.photo_url} className="object-cover" /> : null}
                  <InitialsFallback name={tenant.tenant_name || "?"} />
                </Avatar>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm flex-1">
                <ViewRow label="১. নাম" value={tenant.tenant_name} />
                <ViewRow label="নাম (English)" value={tenant.tenant_name_bn} />
                <ViewRow label="২. পিতার নাম" value={tenant.father_name} />
                <ViewRow label="৩. মাতার নাম" value={tenant.mother_name} />
                <ViewRow label="৪. জন্ম তারিখ" value={fmtDate(tenant.birth_date)} />
                <ViewRow label="বৈবাহিক অবস্থা" value={tenant.marital_status} />
                <ViewRow label="৬. পেশা" value={tenant.occupation} />
                <ViewRow label="কর্মস্থল" value={tenant.workplace} />
                <ViewRow label="৭. ধর্ম" value={tenant.religion} />
                <ViewRow label="শিক্ষাগত যোগ্যতা" value={tenant.education} />
                <ViewRow label="৮. মোবাইল" value={toBn(tenant.phone)} />
                <ViewRow label="ই-মেইল" value={tenant.email} />
                <ViewRow label="৯. NID" value={toBn(tenant.nid_number)} />
                <ViewRow label="১০. পাসপোর্ট" value={tenant.passport_number} />
              </div>
            </div>

            {/* Address */}
            <Section title="৫. স্থায়ী ঠিকানা">
              <p className="text-sm">{permanentAddr || "—"}</p>
            </Section>

            {/* Emergency */}
            <Section title="১১. জরুরি যোগাযোগ">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <ViewRow label="নাম" value={tenant.emergency_name} />
                <ViewRow label="সম্পর্ক" value={tenant.emergency_relation} />
                <ViewRow label="মোবাইল" value={toBn(tenant.emergency_phone)} />
                <ViewRow label="ঠিকানা" value={tenant.emergency_address} full />
              </div>
            </Section>

            {/* Family members */}
            <Section title={`১২. পরিবার / মেসের সদস্যবৃন্দ (${toBn(members.length)} জন)`}>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">কোনো সদস্য নেই</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-1 w-10">ক্রঃ</th>
                      <th className="border border-black p-1 text-left">নাম</th>
                      <th className="border border-black p-1 w-16">বয়স</th>
                      <th className="border border-black p-1 text-left">পেশা</th>
                      <th className="border border-black p-1 text-left">মোবাইল</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => (
                      <tr key={m.id}>
                        <td className="border border-black p-1 text-center">{toBn(i + 1)}</td>
                        <td className="border border-black p-1">{m.name}</td>
                        <td className="border border-black p-1 text-center">{m.age != null ? toBn(m.age) : "—"}</td>
                        <td className="border border-black p-1">{m.occupation || "—"}</td>
                        <td className="border border-black p-1">{toBn(m.phone) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Helper */}
            <Section title="১৩. গৃহকর্মীর তথ্য">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <ViewRow label="নাম" value={tenant.helper_name} />
                <ViewRow label="NID" value={toBn(tenant.helper_nid)} />
                <ViewRow label="মোবাইল" value={toBn(tenant.helper_phone)} />
                <ViewRow label="ঠিকানা" value={tenant.helper_address} />
              </div>
            </Section>

            {/* Driver */}
            <Section title="১৪. ড্রাইভারের তথ্য">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <ViewRow label="নাম" value={tenant.driver_name} />
                <ViewRow label="NID" value={toBn(tenant.driver_nid)} />
              </div>
            </Section>

            {/* Landlord */}
            <Section title="পূর্ববর্তী ও বর্তমান বাড়িওয়ালার তথ্য">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <ViewRow label="১৫. পূর্ববর্তী বাড়িওয়ালা" value={tenant.previous_landlord_name} />
                <ViewRow label="মোবাইল" value={toBn(tenant.previous_landlord_phone)} />
                <ViewRow label="১৬. বাসা ছাড়ার কারণ" value={tenant.leave_reason} full />
                <ViewRow label="১৭. বর্তমান বাড়িওয়ালা" value={tenant.current_landlord_name} />
                <ViewRow label="১৮. বসবাস শুরু" value={fmtDate(tenant.move_in_date)} />
                <ViewRow label="মন্তব্য" value={tenant.notes} full />
              </div>
            </Section>

            {/* Signature */}
            <div className="grid grid-cols-2 gap-12 mt-12 pt-4 text-sm">
              <div className="text-center">
                <div className="border-t border-black pt-1">ভাড়াটিয়ার স্বাক্ষর</div>
              </div>
              <div className="text-center">
                <div className="border-t border-black pt-1">বাড়িওয়ালার স্বাক্ষর</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .tenant-print-a4 {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          box-sizing: border-box;
        }
        @media screen and (max-width: 820px) {
          .tenant-print-a4 { width: 100%; min-height: auto; padding: 12px; }
        }
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden !important; }
          #tenant-print-area, #tenant-print-area * { visibility: visible !important; }
          #tenant-print-area {
            position: absolute; left: 0; top: 0;
            width: 100%; min-height: auto;
            padding: 0; border: 0; box-shadow: none;
          }
        }
      `}</style>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold bg-gray-100 border border-black px-2 py-1 mb-2">{title}</h3>
      <div className="px-1">{children}</div>
    </div>
  );
}

function ViewRow({ label, value, full }: { label: string; value: any; full?: boolean }) {
  return (
    <div className={full ? "col-span-2 flex gap-2" : "flex gap-2"}>
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium break-words">{value || "—"}</span>
    </div>
  );
}
