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
  width,
  height,
  depth,
}: {
  flat: Flat;
  position: [number, number, number];
  onClick: () => void;
  selected: boolean;
  lang: "bn" | "en";
  width: number;
  height: number;
  depth: number;
}) {
  const [hover, setHover] = useState(false);
  const tenant = isTenant(flat);
  const wallColor = "#e7d3b3"; // warm beige facade
  const accentColor = selected ? "#10b981" : hover ? "#8b5cf6" : tenant ? "#f59e0b" : "#3b82f6";

  const W = width;
  const H = height;
  const D = depth;
  const fz = D / 2 + 0.001;

  return (
    <group position={position}>
      {/* main wall block (clickable) */}
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
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* status accent stripe at top */}
      <mesh position={[0, H / 2 - 0.06, fz]}>
        <planeGeometry args={[W - 0.1, 0.12]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.4} />
      </mesh>

      {/* two windows */}
      {[-W / 4, W / 4].map((wx, i) => (
        <group key={i} position={[wx, 0.05, fz]}>
          <mesh>
            <planeGeometry args={[W / 2.6, H / 2.4]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[W / 2.8, H / 2.6]} />
            <meshStandardMaterial
              color="#7dd3fc"
              emissive="#0ea5e9"
              emissiveIntensity={0.35}
              metalness={0.6}
              roughness={0.2}
            />
          </mesh>
          {/* mullions */}
          <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[0.04, H / 2.6]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[W / 2.8, 0.04]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      ))}

      {/* balcony railing */}
      <mesh position={[0, -H / 2 + 0.18, fz + 0.18]} castShadow>
        <boxGeometry args={[W - 0.15, 0.36, 0.06]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -H / 2 + 0.02, fz + 0.18]}>
        <boxGeometry args={[W - 0.15, 0.04, 0.18]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* flat number plate */}
      <mesh position={[0, H / 2 - 0.22, fz + 0.001]}>
        <planeGeometry args={[0.7, 0.3]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <Text
        position={[0, H / 2 - 0.22, fz + 0.005]}
        fontSize={0.2}
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

  const FLOOR_H = 1.9;
  const UNIT_W = 2.4;
  const UNIT_H = 1.6;
  const UNIT_D = 1.8;
  const CORE_W = 1.6;

  const splitFloors = useMemo(
    () =>
      floors.map(([floor, fs]) => {
        const sorted = [...fs].sort((a, b) =>
          a.flat_no.localeCompare(b.flat_no, undefined, { numeric: true })
        );
        const east = sorted.filter((f) => sideOf(f.flat_no) === "east");
        const west = sorted.filter((f) => sideOf(f.flat_no) === "west");
        return { floor, east, west };
      }),
    [floors]
  );

  const maxEast = Math.max(1, ...splitFloors.map((f) => f.east.length));
  const maxWest = Math.max(1, ...splitFloors.map((f) => f.west.length));
  const slabW = (maxEast + maxWest) * UNIT_W + CORE_W + 0.4;
  const slabD = UNIT_D + 0.4;
  const totalH = floors.length * FLOOR_H;
  const eastCenterX = -(CORE_W / 2 + (maxEast * UNIT_W) / 2);
  const westCenterX = CORE_W / 2 + (maxWest * UNIT_W) / 2;

  return (
    <group>
      {/* ground */}
      <mesh position={[0, -1.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Math.max(40, slabW + 16), 30]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, -1.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[slabW + 4, slabD + 4]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* back wall */}
      <mesh position={[0, totalH / 2 - FLOOR_H / 2, -slabD / 2 + 0.05]} receiveShadow>
        <boxGeometry args={[slabW, totalH, 0.1]} />
        <meshStandardMaterial color="#cbb892" roughness={0.9} />
      </mesh>
      {/* side walls */}
      <mesh position={[-slabW / 2, totalH / 2 - FLOOR_H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.1, totalH, slabD]} />
        <meshStandardMaterial color="#bfa97f" roughness={0.9} />
      </mesh>
      <mesh position={[slabW / 2, totalH / 2 - FLOOR_H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.1, totalH, slabD]} />
        <meshStandardMaterial color="#bfa97f" roughness={0.9} />
      </mesh>

      {/* central stair/lift core */}
      <mesh position={[0, totalH / 2 - FLOOR_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[CORE_W - 0.1, totalH, UNIT_D]} />
        <meshStandardMaterial color="#a89070" roughness={0.85} />
      </mesh>
      <mesh position={[0, totalH / 2 - FLOOR_H / 2, UNIT_D / 2 + 0.005]}>
        <planeGeometry args={[0.18, totalH - 0.2]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* entrance */}
      <group position={[0, -FLOOR_H / 2 - 0.1, UNIT_D / 2 + 0.01]}>
        <mesh>
          <planeGeometry args={[1.2, 0.85]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[1.1, 0.78]} />
          <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.04, 0.78]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {splitFloors.map(({ floor, east, west }, i) => {
        const y = i * FLOOR_H;
        const eastStart = eastCenterX - ((east.length - 1) * UNIT_W) / 2;
        const westStart = westCenterX - ((west.length - 1) * UNIT_W) / 2;
        return (
          <group key={floor}>
            <mesh position={[0, y - UNIT_H / 2 - 0.06, 0]} castShadow receiveShadow>
              <boxGeometry args={[slabW + 0.2, 0.12, slabD]} />
              <meshStandardMaterial color="#64748b" roughness={0.7} />
            </mesh>
            <Text
              position={[-slabW / 2 - 0.5, y, slabD / 2]}
              fontSize={0.32}
              color="#fbbf24"
              anchorX="right"
              anchorY="middle"
            >
              {`F${floor}`}
            </Text>
            {east.map((f, idx) => (
              <FlatBox
                key={f.id}
                flat={f}
                position={[eastStart + idx * UNIT_W, y, 0]}
                onClick={() => onSelect(f)}
                selected={selectedId === f.id}
                lang={lang}
                width={UNIT_W - 0.1}
                height={UNIT_H}
                depth={UNIT_D}
              />
            ))}
            {west.map((f, idx) => (
              <FlatBox
                key={f.id}
                flat={f}
                position={[westStart + idx * UNIT_W, y, 0]}
                onClick={() => onSelect(f)}
                selected={selectedId === f.id}
                lang={lang}
                width={UNIT_W - 0.1}
                height={UNIT_H}
                depth={UNIT_D}
              />
            ))}
          </group>
        );
      })}

      {/* roof / parapet */}
      <mesh position={[0, totalH - FLOOR_H / 2 + 0.15, 0]} castShadow>
        <boxGeometry args={[slabW + 0.3, 0.3, slabD + 0.2]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.6} />
      </mesh>
      {/* water tank */}
      <mesh position={[slabW / 4, totalH - FLOOR_H / 2 + 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.7, 16]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <mesh position={[slabW / 4, totalH - FLOOR_H / 2 + 0.4, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#475569" />
      </mesh>

      {/* building name sign */}
      {floors.length > 0 && (
        <group position={[0, totalH - FLOOR_H / 2 + 0.15, slabD / 2 + 0.06]}>
          <mesh>
            <planeGeometry args={[Math.min(slabW - 0.5, 5), 0.26]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.18}
            color="#fbbf24"
            anchorX="center"
            anchorY="middle"
          >
            {lang === "bn" ? "শেখ বাচ্চু টাওয়ার" : "SHEIKH BACHCHU TOWER"}
          </Text>
        </group>
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
              camera={{ position: [12, cameraY, 16], fov: 45 }}
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
