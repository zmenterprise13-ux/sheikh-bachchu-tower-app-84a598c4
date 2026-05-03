import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Text } from "@react-three/drei";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/i18n/LangContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Flat = {
  id: string;
  flat_no: string;
  floor: number;
  owner_name: string | null;
  owner_name_bn: string | null;
  phone: string | null;
  occupant_type: string;
  occupant_name: string | null;
  occupant_name_bn: string | null;
  occupant_phone: string | null;
};

const sideOf = (flat_no: string): "east" | "west" => {
  const d = flat_no.replace(/\D/g, "");
  return d.slice(-1) === "1" ? "east" : "west";
};

const isTenant = (f: Flat) =>
  Boolean(f.occupant_name && f.occupant_name.trim()) ||
  (f.occupant_type === "tenant" && Boolean(f.occupant_phone));

function FlatBox({
  flat,
  position,
  onClick,
  selected,
  lang,
}: {
  flat: Flat;
  position: [number, number, number];
  onClick: () => void;
  selected: boolean;
  lang: "bn" | "en";
}) {
  const [hover, setHover] = useState(false);
  const tenant = isTenant(flat);
  const baseColor = tenant ? "#f59e0b" : "#3b82f6";
  const color = selected ? "#10b981" : hover ? "#8b5cf6" : baseColor;

  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "default";
        }}
      >
        <boxGeometry args={[2.2, 1.4, 1.6]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* window */}
      <mesh position={[0, 0.05, 0.81]}>
        <planeGeometry args={[1.6, 0.7]} />
        <meshStandardMaterial color="#bae6fd" emissive="#0ea5e9" emissiveIntensity={0.3} />
      </mesh>
      <Text
        position={[0, -0.85, 0.81]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {flat.flat_no}
      </Text>
    </group>
  );
}

function Building({
  flats,
  onSelect,
  selectedId,
  lang,
}: {
  flats: Flat[];
  onSelect: (f: Flat) => void;
  selectedId: string | null;
  lang: "bn" | "en";
}) {
  const floors = useMemo(() => {
    const map = new Map<number, Flat[]>();
    for (const f of flats) {
      if (!map.has(f.floor)) map.set(f.floor, []);
      map.get(f.floor)!.push(f);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [flats]);

  const FLOOR_H = 1.7;
  const UNIT_W = 2.4;
  const maxUnits = Math.max(1, ...floors.map(([, fs]) => fs.length));
  const slabW = maxUnits * UNIT_W + 0.4;

  return (
    <group>
      {/* ground */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Math.max(20, slabW + 6), 20]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {floors.map(([floor, flatsOnFloor], i) => {
        const y = i * FLOOR_H;
        const sorted = [...flatsOnFloor].sort((a, b) =>
          a.flat_no.localeCompare(b.flat_no, undefined, { numeric: true })
        );
        const startX = -((sorted.length - 1) * UNIT_W) / 2;
        return (
          <group key={floor}>
            {/* slab */}
            <mesh position={[0, y - 0.78, 0]}>
              <boxGeometry args={[slabW, 0.08, 1.8]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            {/* floor label */}
            <Text
              position={[-slabW / 2 - 0.4, y, 0]}
              fontSize={0.35}
              color="#94a3b8"
              anchorX="right"
              anchorY="middle"
            >
              {`F${floor}`}
            </Text>
            {sorted.map((f, idx) => (
              <FlatBox
                key={f.id}
                flat={f}
                position={[startX + idx * UNIT_W, y, 0]}
                onClick={() => onSelect(f)}
                selected={selectedId === f.id}
                lang={lang}
              />
            ))}
          </group>
        );
      })}

      {/* top label */}
      {floors.length > 0 && (
        <Text
          position={[0, floors.length * FLOOR_H, 0]}
          fontSize={0.4}
          color="#10b981"
          anchorX="center"
        >
          {lang === "bn" ? "শেখ বাচ্চু টাওয়ার" : "Sheikh Bachchu Tower"}
        </Text>
      )}
    </group>
  );
}

export default function AdminBuilding3D() {
  const { lang } = useLang();
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Flat | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("flats")
        .select(
          "id, flat_no, floor, owner_name, owner_name_bn, phone, occupant_type, occupant_name, occupant_name_bn, occupant_phone"
        )
        .order("floor")
        .order("flat_no");
      setFlats((data as Flat[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const ownerName = (f: Flat) =>
    (lang === "bn" ? f.owner_name_bn || f.owner_name : f.owner_name) ||
    (lang === "bn" ? "অজানা" : "Unknown");
  const occName = (f: Flat) =>
    (lang === "bn" ? f.occupant_name_bn || f.occupant_name : f.occupant_name) || "";

  const floorsCount = new Set(flats.map((f) => f.floor)).size;
  const cameraY = (floorsCount * 1.7) / 2;

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {lang === "bn" ? "৩ডি বিল্ডিং ভিউ" : "3D Building View"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "bn"
              ? "মাউস টেনে ঘুরান, স্ক্রল করে জুম করুন। ফ্ল্যাট ক্লিক করলে মালিক/ভাড়াটিয়ার তথ্য দেখাবে।"
              : "Drag to rotate, scroll to zoom. Click a flat to see owner/tenant details."}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" />
            {lang === "bn" ? "মালিক নিজে" : "Owner-occupied"}
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#f59e0b]" />
            {lang === "bn" ? "ভাড়াটিয়া" : "Tenant"}
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#10b981]" />
            {lang === "bn" ? "নির্বাচিত" : "Selected"}
          </Badge>
        </div>

        {loading ? (
          <Skeleton className="h-[600px] rounded-2xl" />
        ) : (
          <div className="relative rounded-2xl border border-border bg-gradient-to-b from-slate-900 to-slate-700 overflow-hidden" style={{ height: "70vh", minHeight: 500 }}>
            <Canvas
              shadows
              camera={{ position: [8, cameraY, 9], fov: 45 }}
              dpr={[1, 2]}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
              <directionalLight position={[-5, 5, -5]} intensity={0.3} />
              <Suspense fallback={<Html center><div className="text-white">Loading...</div></Html>}>
                <Building flats={flats} onSelect={setSelected} selectedId={selected?.id ?? null} lang={lang} />
              </Suspense>
              <OrbitControls
                target={[0, cameraY, 0]}
                enablePan
                minDistance={5}
                maxDistance={30}
              />
            </Canvas>

            {selected && (
              <div className="absolute top-4 right-4 w-72 rounded-xl bg-card border border-border shadow-elegant p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {lang === "bn" ? "ফ্ল্যাট" : "Flat"}
                    </div>
                    <div className="text-xl font-bold">{selected.flat_no}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="border-t border-border pt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {lang === "bn" ? "মালিক" : "Owner"}
                  </div>
                  <div className="font-medium text-sm">{ownerName(selected)}</div>
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" />
                      {selected.phone}
                    </a>
                  )}
                </div>
                {isTenant(selected) && (
                  <div className="border-t border-border pt-2 space-y-1">
                    <div className="text-xs text-muted-foreground">
                      {lang === "bn" ? "ভাড়াটিয়া" : "Tenant"}
                    </div>
                    <div className="font-medium text-sm">{occName(selected) || "—"}</div>
                    {selected.occupant_phone ? (
                      <a href={`tel:${selected.occupant_phone}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <Phone className="h-3.5 w-3.5" />
                        {selected.occupant_phone}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {lang === "bn" ? "মোবাইল নেই" : "No phone"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
