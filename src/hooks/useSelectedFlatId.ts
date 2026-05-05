import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "owner_dashboard_flat_id";
const EVENT = "selected-flat-id-change";

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

/**
 * Shared selected-flat state across the app.
 * Persists the user's manual choice in localStorage and broadcasts
 * changes so SideNav, dashboard, etc. stay in sync.
 */
export function useSelectedFlatId() {
  const [selectedFlatId, setSelectedFlatIdState] = useState<string | null>(readStored);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setSelectedFlatIdState(detail ?? null);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSelectedFlatIdState(e.newValue);
    };
    window.addEventListener(EVENT, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setSelectedFlatId = useCallback((id: string | null) => {
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
    }
    setSelectedFlatIdState(id);
  }, []);

  return { selectedFlatId, setSelectedFlatId };
}
