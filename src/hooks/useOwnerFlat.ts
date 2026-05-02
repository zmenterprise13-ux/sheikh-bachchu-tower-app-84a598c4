import { useEffect, useState } from "react";
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

  useEffect(() => {
    let active = true;
    if (!user) {
      setFlats([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("flats")
        .select("id, flat_no, floor, owner_name, owner_name_bn, phone, size, service_charge, gas_bill, parking, is_occupied, owner_photo_url, occupant_photo_url, occupant_name, occupant_name_bn, occupant_type")
        .eq("owner_user_id", user.id)
        .order("floor", { ascending: true })
        .order("flat_no", { ascending: true });
      if (active) {
        setFlats((data as OwnerFlat[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  return { flats, loading };
}

// Backwards-compatible single-flat hook (returns the first flat)
export function useOwnerFlat() {
  const { flats, loading } = useOwnerFlats();
  return { flat: flats[0] ?? null, loading, flats };
}
