import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type OwnerFlat = {
  id: string;
  flat_no: string;
  floor: number;
  owner_name: string | null;
  owner_name_bn: string | null;
  phone: string | null;
  size: number;
  service_charge: number;
  gas_bill: number;
  parking: number;
  is_occupied: boolean;
  owner_photo_url: string | null;
  occupant_photo_url: string | null;
  occupant_name: string | null;
  occupant_name_bn: string | null;
  occupant_type: string;
};

export function useOwnerFlats() {
  const { user } = useAuth();
  const [flats, setFlats] = useState<OwnerFlat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlats = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("flats")
      .select("id, flat_no, floor, owner_name, owner_name_bn, phone, size, service_charge, gas_bill, parking, is_occupied, owner_photo_url, occupant_photo_url, occupant_name, occupant_name_bn, occupant_type")
      .eq("owner_user_id", uid)
      .order("floor", { ascending: true })
      .order("flat_no", { ascending: true });
    return (data as OwnerFlat[] | null) ?? [];
  }, []);

  const refetch = useCallback(async () => {
    if (!user) return;
    const rows = await fetchFlats(user.id);
    setFlats(rows);
  }, [user, fetchFlats]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setFlats([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const rows = await fetchFlats(user.id);
      if (active) {
        setFlats(rows);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user, fetchFlats]);

  // Auto re-sync when the auth user is updated (e.g., password change),
  // so profile photo and other flat info stay fresh.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        refetch();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [refetch]);

  // Auto re-sync when the user revisits the tab/page so the dashboard
  // always shows the latest profile photo and flat data.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => refetch();
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, refetch]);

  return { flats, loading, refetch };
}

// Backwards-compatible single-flat hook (returns the first flat)
export function useOwnerFlat() {
  const { flats, loading, refetch } = useOwnerFlats();
  return { flat: flats[0] ?? null, loading, flats, refetch };
}
