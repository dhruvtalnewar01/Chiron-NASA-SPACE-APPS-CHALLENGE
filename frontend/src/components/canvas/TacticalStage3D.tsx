// ---------------------------------------------------------------------------
// CHIRON v3.0 - TacticalStage3D
// Main Clinical & Orbital Stage: Toggles seamlessly between
// MODE_A (Layered Anatomical Digital Twin & 7-Axis Organ HUD),
// MODE_B (3D Orbital Return Horizon & Abort Window Trajectory), and
// MODE_C (4-Crew Cohort Readiness Matrix).
// ---------------------------------------------------------------------------

import React, { useRef, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { OrbitalHorizon3D } from "./OrbitalHorizon3D";
import { LayeredAnatomicalAtlas } from "./LayeredAnatomicalAtlas";
import { CrewCohortMatrix } from "./CrewCohortMatrix";
import {
  type ChironThemeId,
  type ChironTheme,
  getTheme,
  getCanvasBgHex,
} from "@/lib/themeConfig";
import type { AxisScore, OrbitalWindow } from "@/hooks/useChironAPI";

export type StageMode = "MODE_A" | "MODE_B" | "MODE_C";

export interface TacticalStage3DProps {
  mode: StageMode;
  themeId: ChironThemeId;
  axes?: AxisScore[];
  orbitalWindow?: OrbitalWindow | null;
  selectedAxisId?: string | null;
  onAxisSelect?: (axisId: string) => void;
  missionElapsedHours?: number;
  activeScenario?: string;
}

function SceneLoader({ theme }: { theme: ChironTheme }) {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial
        color={theme.colors.inkTertiary}
        wireframe
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}

function GridFloor({ theme }: { theme: ChironTheme }) {
  const gridColor = useMemo(() => {
    if (theme.id === "orbital-daylight") return 0x94a3b8;
    if (theme.id === "circadian-red") return 0x6b2130;
    return 0x334155;
  }, [theme.id]);

  return (
    <gridHelper
      args={[20, 40, gridColor, gridColor]}
      position={[0, -3.5, 0]}
      material-transparent
      material-opacity={0.15}
    />
  );
}

function ThemeLighting({ theme }: { theme: ChironTheme }) {
  const isDark = theme.id === "deep-space" || theme.id === "circadian-red";

  return (
    <>
      <ambientLight intensity={isDark ? 0.25 : 0.6} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={isDark ? 0.6 : 0.9}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 4, -3]} intensity={isDark ? 0.2 : 0.35} />
      {isDark && (
        <pointLight
          position={[0, 2, 4]}
          intensity={0.3}
          color={theme.colors.accentInfo}
          distance={12}
          decay={2}
        />
      )}
    </>
  );
}

export function TacticalStage3D({
  mode,
  themeId,
  axes,
  orbitalWindow,
  selectedAxisId,
  onAxisSelect,
  missionElapsedHours = 0,
  activeScenario = "A",
}: TacticalStage3DProps) {
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const bgColor = useMemo(() => getCanvasBgHex(themeId), [themeId]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--canvas-bg)]">
      {/* MODE A: Layered Anatomical Digital Twin & 7-Axis Organ HUD */}
      {mode === "MODE_A" && (
        <LayeredAnatomicalAtlas
          axes={axes || []}
          selectedAxisId={selectedAxisId || null}
          onAxisSelect={onAxisSelect || (() => {})}
          themeId={themeId}
        />
      )}

      {/* MODE B: 3D Orbital Return Horizon & Abort Window Trajectory */}
      {mode === "MODE_B" && (
        <div className="w-full h-full relative">
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: theme.id === "orbital-daylight" ? 1.2 : 0.9,
              outputColorSpace: THREE.SRGBColorSpace,
            }}
            camera={{
              position: [0, 3, 12],
              fov: 55,
              near: 0.1,
              far: 500,
            }}
            style={{ background: bgColor }}
          >
            <ThemeLighting theme={theme} />
            <GridFloor theme={theme} />

            <Suspense fallback={<SceneLoader theme={theme} />}>
              <OrbitalHorizon3D
                theme={theme}
                orbitalWindow={orbitalWindow || null}
                missionElapsedHours={missionElapsedHours}
              />
            </Suspense>

            <OrbitControls
              enableDamping
              dampingFactor={0.08}
              minDistance={4}
              maxDistance={35}
              maxPolarAngle={Math.PI * 0.85}
              minPolarAngle={Math.PI * 0.1}
              enablePan
              panSpeed={0.5}
              rotateSpeed={0.6}
            />
          </Canvas>
        </div>
      )}

      {/* MODE C: 4-Crew Cohort Readiness Matrix */}
      {mode === "MODE_C" && <CrewCohortMatrix activeScenario={activeScenario} />}
    </div>
  );
}

export default TacticalStage3D;
