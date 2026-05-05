import type { Lang } from "@/i18n/translations";

type FlatLike = {
  owner_name?: string | null;
  owner_name_bn?: string | null;
  occupant_type?: string | null;
  occupant_name?: string | null;
  occupant_name_bn?: string | null;
};

/** Returns the display name of the current resident: tenant if flat is tenant-occupied, else owner. */
export function residentName(f: FlatLike | null | undefined, lang: Lang): string {
  if (!f) return "";
  const isTenant = (f.occupant_type ?? "").toLowerCase() === "tenant";
  if (isTenant) {
    const n = lang === "bn"
      ? (f.occupant_name_bn || f.occupant_name || f.owner_name_bn || f.owner_name)
      : (f.occupant_name || f.occupant_name_bn || f.owner_name || f.owner_name_bn);
    return n || "";
  }
  return (lang === "bn"
    ? (f.owner_name_bn || f.owner_name)
    : (f.owner_name || f.owner_name_bn)) || "";
}

/** Returns label key suffix: 'tenantLabel' or 'ownerLabel' */
export function residentRoleLabel(f: FlatLike | null | undefined): "tenantLabel" | "ownerLabel" {
  return (f?.occupant_type ?? "").toLowerCase() === "tenant" ? "tenantLabel" : "ownerLabel";
}

/** Returns localized role label text: 'ভাড়াটিয়া'/'Tenant' or 'মালিক'/'Owner'. */
export function residentRoleText(f: FlatLike | null | undefined, lang: Lang): string {
  const isTenant = (f?.occupant_type ?? "").toLowerCase() === "tenant";
  if (lang === "bn") return isTenant ? "ভাড়াটিয়া" : "মালিক";
  return isTenant ? "Tenant" : "Owner";
}

/** Returns "<name> (<role>)" combined. */
export function residentNameWithRole(f: FlatLike | null | undefined, lang: Lang): string {
  const n = residentName(f, lang);
  if (!n) return "";
  return `${n} (${residentRoleText(f, lang)})`;
}
