// ---------------------------------------------------------------------------
// CHIRON v2.0 - OrbitalHorizon3D
// Mode B: Interactive 3D Orbital Mechanics Viewport.
// Visualizes Earth, Moon, spacecraft trajectory corridors (LEO, NRHO, Mars),
// radiation storm particle flux vectors, and the closing evacuation window arc.
// ---------------------------------------------------------------------------

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ChironTheme } from "@/lib/themeConfig";
import type { OrbitalWindow } from "@/hooks/useChironAPI";

interface OrbitalHorizon3DProps {
  theme: ChironTheme;
  orbitalWindow: OrbitalWindow | null;
  missionElapsedHours: number;
}

// ---------------------------------------------------------------------------
// Procedural Earth Canvas Texture
// ---------------------------------------------------------------------------
function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Deep ocean base
  ctx.fillStyle = "#0c1b33";
  ctx.fillRect(0, 0, 1024, 512);

  // Continents (procedural stylized shapes)
  ctx.fillStyle = "#1e3a2f";
  // North America & Eurasia
  ctx.beginPath();
  ctx.ellipse(300, 180, 140, 70, -0.2, 0, Math.PI * 2);
  ctx.ellipse(650, 160, 180, 80, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Africa & South America
  ctx.beginPath();
  ctx.ellipse(550, 310, 80, 110, 0.2, 0, Math.PI * 2);
  ctx.ellipse(340, 340, 70, 120, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Atmosphere cloud swirls
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  ctx.arc(320, 200, 90, 0, Math.PI * 2);
  ctx.arc(680, 180, 120, 0, Math.PI * 2);
  ctx.arc(520, 280, 100, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// ---------------------------------------------------------------------------
// Procedural Moon Texture
// ---------------------------------------------------------------------------
function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#4a4d52";
  ctx.fillRect(0, 0, 512, 256);

  // Maria (dark lunar plains)
  ctx.fillStyle = "#333538";
  ctx.beginPath();
  ctx.ellipse(180, 110, 60, 45, 0, 0, Math.PI * 2);
  ctx.ellipse(260, 90, 40, 35, 0, 0, Math.PI * 2);
  ctx.ellipse(320, 150, 70, 50, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Craters
  ctx.fillStyle = "#63676e";
  for (let i = 0; i < 40; i++) {
    const cx = (i * 37) % 512;
    const cy = (i * 53) % 256;
    const r = (i % 5) + 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ---------------------------------------------------------------------------
// Orbital Trajectory Curve Generators
// ---------------------------------------------------------------------------
function createLEOOrbitCurve(radius: number): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
  }
  return new THREE.CatmullRomCurve3(points);
}

function createLunarNRHOCurve(): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [
    new THREE.Vector3(2.5, 0, 0),
    new THREE.Vector3(4.0, 1.2, 1.5),
    new THREE.Vector3(6.5, 2.0, 2.2),
    new THREE.Vector3(8.0, 0.5, 1.0),
    new THREE.Vector3(8.8, -0.8, -0.5),
    new THREE.Vector3(7.2, -1.8, -1.5),
    new THREE.Vector3(5.0, -1.2, -1.0),
    new THREE.Vector3(2.5, 0, 0),
  ];
  return new THREE.CatmullRomCurve3(points, true);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function OrbitalHorizon3D({
  theme,
  orbitalWindow,
  missionElapsedHours,
}: OrbitalHorizon3DProps) {
  const earthRef = useRef<THREE.Mesh>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const spacecraftRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const earthTex = useMemo(() => createEarthTexture(), []);
  const moonTex = useMemo(() => createMoonTexture(), []);

  const leoRadius = 2.4;
  const leoCurve = useMemo(() => createLEOOrbitCurve(leoRadius), [leoRadius]);
  const nrhoCurve = useMemo(() => createLunarNRHOCurve(), []);

  const leoGeometry = useMemo(
    () => new THREE.TubeGeometry(leoCurve, 64, 0.02, 8, true),
    [leoCurve]
  );
  const nrhoGeometry = useMemo(
    () => new THREE.TubeGeometry(nrhoCurve, 64, 0.025, 8, true),
    [nrhoCurve]
  );

  // Status color for closing evacuation window arc
  const windowColor = useMemo(() => {
    const margin = orbitalWindow ? orbitalWindow.t_margin_hours : 28.0;
    if (margin > 24.0) return theme.colors.accentOk; // Teal/Green
    if (margin > 0.0) return theme.colors.accentWarn; // Solar Amber
    return theme.colors.accentCrit; // Crimson Alert
  }, [orbitalWindow, theme]);

  // Starfield and solar storm particles
  const [starPositions, stormParticlePositions] = useMemo(() => {
    const starCount = 300;
    const stars = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      stars[i * 3] = (Math.random() - 0.5) * 80;
      stars[i * 3 + 1] = (Math.random() - 0.5) * 80;
      stars[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }

    const stormCount = 150;
    const storm = new Float32Array(stormCount * 3);
    for (let i = 0; i < stormCount; i++) {
      storm[i * 3] = (Math.random() - 0.5) * 16 + 8;
      storm[i * 3 + 1] = (Math.random() - 0.5) * 8;
      storm[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    return [stars, storm];
  }, []);

  useFrame((_, delta) => {
    // Earth axial rotation
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.08;
    }

    // Spacecraft orbital animation
    if (spacecraftRef.current) {
      const t = (missionElapsedHours * 0.05 + performance.now() * 0.0002) % 1.0;
      const pos = nrhoCurve.getPointAt(t);
      const tangent = nrhoCurve.getTangentAt(t);
      spacecraftRef.current.position.copy(pos);
      spacecraftRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        tangent
      );
    }

    // Solar wind particle streaming
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] -= delta * 4.0;
        if (positions[i * 3] < -8) {
          positions[i * 3] = 16;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Deep Space Background Stars */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starPositions.length / 3}
            array={starPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color={theme.colors.inkSecondary}
          transparent
          opacity={0.6}
        />
      </points>

      {/* Solar Particle Event (SPE) Stream Vectors */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={stormParticlePositions.length / 3}
            array={stormParticlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.18}
          color={theme.colors.accentWarn}
          transparent
          opacity={0.7}
        />
      </points>

      {/* Earth Body */}
      <mesh ref={earthRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 48, 48]} />
        <meshStandardMaterial
          map={earthTex}
          roughness={0.7}
          metalness={0.1}
          emissive={new THREE.Color(0x051020)}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Earth Atmospheric Glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.56, 32, 32]} />
        <meshBasicMaterial
          color={theme.colors.accentInfo}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Moon Body in NRHO Vicinity */}
      <mesh ref={moonRef} position={[8.0, 0.5, 1.0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial
          map={moonTex}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* LEO Operational Ring (ISS Corridor) */}
      <mesh geometry={leoGeometry}>
        <meshBasicMaterial
          color={theme.colors.accentOk}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Lunar NRHO Trajectory Arc (Artemis Corridor) */}
      <mesh geometry={nrhoGeometry}>
        <meshBasicMaterial
          color={windowColor}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Spacecraft Tactical Marker */}
      <group ref={spacecraftRef}>
        {/* Core Bus */}
        <mesh>
          <boxGeometry args={[0.16, 0.16, 0.32]} />
          <meshStandardMaterial
            color={theme.colors.panel}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Solar Arrays */}
        <mesh position={[0.3, 0, 0]}>
          <boxGeometry args={[0.42, 0.02, 0.18]} />
          <meshStandardMaterial
            color={theme.colors.accentInfo}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[-0.3, 0, 0]}>
          <boxGeometry args={[0.42, 0.02, 0.18]} />
          <meshStandardMaterial
            color={theme.colors.accentInfo}
            roughness={0.3}
          />
        </mesh>
        {/* Telemetry Transponder Halo */}
        <mesh>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshBasicMaterial
            color={windowColor}
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>

      {/* Critical Hazard Crossing (T_crit) Marker */}
      <group position={[6.5, 2.0, 2.2]}>
        <mesh>
          <octahedronGeometry args={[0.18]} />
          <meshStandardMaterial
            color={theme.colors.accentCrit}
            emissive={theme.colors.accentCrit}
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>

      {/* Evacuation Window (T_evac) Phasing Gate */}
      <group position={[2.5, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.24, 0.02, 8, 24]} />
          <meshBasicMaterial
            color={theme.colors.accentOk}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
    </group>
  );
}
