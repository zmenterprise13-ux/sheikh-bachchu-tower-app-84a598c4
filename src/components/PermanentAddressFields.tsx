import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import bdGeo from "@/data/bd-geo/bd-geo.json";

/**
 * Structured permanent address.
 * Persists as a JSON string inside the existing `permanent_address` text column
 * so no DB migration is required. Falls back to legacy free-form text.
 */

export type PermanentAddress = {
  district: string;
  thana: string;
  postOffice: string;
  postCode: string;
  village: string;
  road: string;
  legacy?: string; // any free-form value found that didn't match the JSON shape
};

const EMPTY: PermanentAddress = {
  district: "", thana: "", postOffice: "", postCode: "", village: "", road: "",
};

export function parsePermanentAddress(raw: string | null | undefined): PermanentAddress {
  if (!raw) return { ...EMPTY };
  const s = String(raw).trim();
  if (!s) return { ...EMPTY };
  if (s.startsWith("{")) {
    try {
      const o = JSON.parse(s);
      return {
        district: o.district || "",
        thana: o.thana || "",
        postOffice: o.postOffice || "",
        postCode: o.postCode || "",
        village: o.village || "",
        road: o.road || "",
      };
    } catch {}
  }
  // legacy plain text
  return { ...EMPTY, legacy: s, road: s };
}

export function serializePermanentAddress(a: PermanentAddress): string {
  const { district, thana, postOffice, postCode, village, road } = a;
  if (!district && !thana && !postOffice && !village && !road) return "";
  return JSON.stringify({ district, thana, postOffice, postCode, village, road });
}

export function formatPermanentAddress(a: PermanentAddress): string {
  const parts: string[] = [];
  if (a.village) parts.push(`গ্রাম: ${a.village}`);
  if (a.road) parts.push(`রোড: ${a.road}`);
  if (a.postOffice) parts.push(`পোস্ট অফিস: ${a.postOffice}${a.postCode ? `-${a.postCode}` : ""}`);
  if (a.thana) parts.push(`থানা: ${a.thana}`);
  if (a.district) parts.push(`জেলা: ${a.district}`);
  return parts.join(", ");
}

type GeoMap = Record<string, Record<string, { name: string; code: string }[]>>;
const GEO = bdGeo as GeoMap;

const NONE = "__none__";

export function PermanentAddressFields({
  value,
  onChange,
}: {
  value: PermanentAddress;
  onChange: (next: PermanentAddress) => void;
}) {
  const districts = useMemo(() => Object.keys(GEO), []);
  const thanas = useMemo(() => (value.district && GEO[value.district] ? Object.keys(GEO[value.district]) : []), [value.district]);
  const postOffices = useMemo(() => {
    if (value.district && value.thana && GEO[value.district]?.[value.thana]) return GEO[value.district][value.thana];
    return [];
  }, [value.district, value.thana]);

  const set = (patch: Partial<PermanentAddress>) => onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Label className="text-xs text-muted-foreground">জেলা</Label>
        <Select
          value={value.district || NONE}
          onValueChange={(v) => set({ district: v === NONE ? "" : v, thana: "", postOffice: "", postCode: "" })}
        >
          <SelectTrigger><SelectValue placeholder="জেলা নির্বাচন" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">থানা / উপজেলা</Label>
        <Select
          value={value.thana || NONE}
          onValueChange={(v) => set({ thana: v === NONE ? "" : v, postOffice: "", postCode: "" })}
          disabled={!value.district}
        >
          <SelectTrigger><SelectValue placeholder={value.district ? "থানা নির্বাচন" : "আগে জেলা নির্বাচন করুন"} /></SelectTrigger>
          <SelectContent className="max-h-72">
            {thanas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">পোস্ট অফিস</Label>
        <Select
          value={value.postOffice || NONE}
          onValueChange={(v) => {
            if (v === NONE) return set({ postOffice: "", postCode: "" });
            const po = postOffices.find((p) => p.name === v);
            set({ postOffice: v, postCode: po?.code || "" });
          }}
          disabled={!value.thana}
        >
          <SelectTrigger><SelectValue placeholder={value.thana ? "পোস্ট অফিস নির্বাচন" : "আগে থানা নির্বাচন করুন"} /></SelectTrigger>
          <SelectContent className="max-h-72">
            {postOffices.map((p) => <SelectItem key={p.name} value={p.name}>{p.name} ({p.code})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">পোস্ট কোড</Label>
        <Input value={value.postCode} onChange={(e) => set({ postCode: e.target.value })} placeholder="যেমন ১২০৬" />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">গ্রাম / এলাকা</Label>
        <Input value={value.village} onChange={(e) => set({ village: e.target.value })} placeholder="গ্রাম বা এলাকার নাম" />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">রোড / বাড়ি নং</Label>
        <Input value={value.road} onChange={(e) => set({ road: e.target.value })} placeholder="রোডের নাম, বাড়ি নং ইত্যাদি" />
      </div>

      {value.legacy && (
        <div className="sm:col-span-2 text-xs text-muted-foreground">
          পুরোনো ঠিকানা: <span className="italic">{value.legacy}</span> — উপরের ফিল্ডে আপডেট করে সেভ করুন।
        </div>
      )}
    </div>
  );
}
