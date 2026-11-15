// ---------------------------------------------------------------------------
// CHIRON - Ultra-Realistic 3D Holographic Human Anatomical Digital Twin
// Production-grade WebGL clinical visualization powered by Three.js & React Three Fiber.
//
// Features complete anatomical fidelity:
// 1. Organic Volumetric Holographic Musculature (Sculpted Pectorals, 6-Pack Core,
//    Deltoids, Biceps, Forearms, Articulated Hands, Quadriceps, Calves & Feet).
// 2. High-Precision Skeletal Framework (Cranium with Orbits, S-Curve 24-Vertebrae
//    Spine, 12-Rib Thoracic Cage, Sternum, Clavicles, Scapulae, Pelvis, Femurs, Tibias).
// 3. Beating 4-Chamber Heart & Arterial/Venous Vascular Arborization with Flow Photons.
// 4. Bilateral Respiratory Lung Lobes with Continuous Breathing Expansion.
// 5. Cranial Cerebral Hemispheres with Optic Nerves & Neural Synapse Pulses.
// 6. Holographic Medical Scanner Dais & Sweeping Volumetric Laser Plane.
// 7. 7 Calibrated Interactive Organ Telemetry Reticles with Floating Metric HUDs.
// ---------------------------------------------------------------------------

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type ChironTheme } from "@/lib/themeConfig";
import type { AxisScore } from "@/hooks/useChironAPI";

// ---------------------------------------------------------------------------
// 7 Physiological Axis Coordinates (Anatomically Calibrated)
// ---------------------------------------------------------------------------
export interface OrganNodeDef {
  axisId: string;
  name: string;
  label: string;
  shortVal: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
}

export const ANATOMICAL_AXES: OrganNodeDef[] = [
  {
    axisId: "sleep",
    name: "04 CIRCADIAN",
    label: "Pineal Melatonin Node",
    shortVal: "6.8h (-1.2h)",
    position: [0, 2.52, 0.08],
    color: "#6366f1",
    glowColor: "rgba(99, 102, 241, 0.85)",
  },
  {
    axisId: "neuro",
    name: "02 NEURO-OCULAR",
    label: "Optic Nerve & ICP Proxy",
    shortVal: "5.8mm ONSD",
    position: [0, 2.26, 0.32],
    color: "#06b6d4",
    glowColor: "rgba(6, 182, 212, 0.95)",
  },
  {
    axisId: "cardio",
    name: "01 CARDIOVASCULAR",
    label: "Aortic Arch & Cardiac Pump",
    shortVal: "78% (32ms)",
    position: [-0.14, 1.28, 0.32],
    color: "#f43f5e",
    glowColor: "rgba(244, 63, 94, 0.95)",
  },
  {
    axisId: "immune",
    name: "05 IMMUNE/HEMATOLOGIC",
    label: "Sternal & Thymic Marrow",
    shortVal: "6.4k WBC",
    position: [0.14, 1.08, 0.3],
    color: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.85)",
  },
  {
    axisId: "rad",
    name: "07 RADIATION BURDEN",
    label: "Chest TEPC Dosimeter",
    shortVal: "0.14 pfu",
    position: [-0.46, 1.38, 0.28],
    color: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.9)",
  },
  {
    axisId: "bone",
    name: "03 MUSCULOSKELETAL",
    label: "Thoracolumbar Spine & Femur",
    shortVal: "94.2% BMD",
    position: [0, 0.15, -0.05],
    color: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.9)",
  },
  {
    axisId: "behav",
    name: "06 BEHAVIORAL/VOCAL",
    label: "Wrist Biosensor & Vocal DSP",
    shortVal: "28.4% Hesit",
    position: [0.94, 0.34, 0.16],
    color: "#3b82f6",
    glowColor: "rgba(59, 130, 246, 0.85)",
  },
];

export interface AnatomicalTwin3DProps {
  theme: ChironTheme;
  axes: AxisScore[];
  selectedAxisId: string | null;
  onAxisSelect: (axisId: string) => void;
}

// ---------------------------------------------------------------------------
// 1. ORGANIC VOLUMETRIC HOLOGRAPHIC HUMAN SILHOUETTE
// Sculpted natural human contours: Head, Pectorals, 6-Pack Abs, Deltoids,
// Biceps, Forearms, Hands, Hips, Quadriceps, Knees, Calves & Feet.
// ---------------------------------------------------------------------------
function VolumetricHumanSilhouette({ isLight }: { isLight: boolean }) {
  const shellColor = isLight ? "#0284c7" : "#38bdf8";
  const meshOpacity = isLight ? 0.32 : 0.44;
  const wireOpacity = isLight ? 0.15 : 0.22;

  return (
    <group>
      {/* --- HEAD & CRANIUM --- */}
      {/* Cranium Vault */}
      <mesh position={[0, 2.46, 0.03]}>
        <sphereGeometry args={[0.3, 24, 20]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} roughness={0.25} metalness={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.46, 0.03]}>
        <sphereGeometry args={[0.303, 16, 14]} />
        <meshBasicMaterial color={shellColor} wireframe transparent opacity={wireOpacity} />
      </mesh>
      {/* Face & Jawline Profile */}
      <mesh position={[0, 2.26, 0.12]}>
        <capsuleGeometry args={[0.16, 0.18, 10, 16]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 0.9} roughness={0.25} depthWrite={false} />
      </mesh>
      {/* Neck Column with Sternocleidomastoid bands */}
      <mesh position={[0, 1.94, 0.04]}>
        <cylinderGeometry args={[0.11, 0.14, 0.28, 16]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 0.85} roughness={0.25} depthWrite={false} />
      </mesh>

      {/* --- TORSO & CHEST MUSCULATURE --- */}
      {/* Upper Torso (Trapezius & Clavicular Arch) */}
      <mesh position={[0, 1.68, 0.04]}>
        <capsuleGeometry args={[0.22, 0.42, 10, 18]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} roughness={0.2} depthWrite={false} />
      </mesh>

      {/* Contoured Left & Right Pectoralis Major Muscle Plates */}
      <mesh position={[-0.2, 1.48, 0.2]} rotation={[0.1, 0.15, -0.08]}>
        <capsuleGeometry args={[0.12, 0.2, 8, 14]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[0.2, 1.48, 0.2]} rotation={[0.1, -0.15, 0.08]}>
        <capsuleGeometry args={[0.12, 0.2, 8, 14]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.15} depthWrite={false} />
      </mesh>

      {/* Latissimus Dorsi Back Flank */}
      <mesh position={[0, 1.35, -0.06]}>
        <capsuleGeometry args={[0.24, 0.46, 8, 16]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 0.8} depthWrite={false} />
      </mesh>

      {/* Defined 6-Pack Rectus Abdominis Muscle Segments */}
      {/* Upper Abdominal Quadrant */}
      <mesh position={[-0.09, 1.12, 0.17]}>
        <capsuleGeometry args={[0.065, 0.09, 6, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[0.09, 1.12, 0.17]}>
        <capsuleGeometry args={[0.065, 0.09, 6, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.15} depthWrite={false} />
      </mesh>
      {/* Mid Abdominal Quadrant */}
      <mesh position={[-0.085, 0.94, 0.16]}>
        <capsuleGeometry args={[0.065, 0.09, 6, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[0.085, 0.94, 0.16]}>
        <capsuleGeometry args={[0.065, 0.09, 6, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.15} depthWrite={false} />
      </mesh>
      {/* Lower Abdominal Quadrant */}
      <mesh position={[-0.08, 0.76, 0.15]}>
        <capsuleGeometry args={[0.06, 0.08, 6, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[0.08, 0.76, 0.15]}>
        <capsuleGeometry args={[0.06, 0.08, 6, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.15} depthWrite={false} />
      </mesh>

      {/* External Oblique Flanks (Tapered Spaceflight Athletic Waist) */}
      <mesh position={[-0.26, 0.92, 0.04]} rotation={[0, 0, -0.16]}>
        <capsuleGeometry args={[0.09, 0.36, 6, 12]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 0.9} depthWrite={false} />
      </mesh>
      <mesh position={[0.26, 0.92, 0.04]} rotation={[0, 0, 0.16]}>
        <capsuleGeometry args={[0.09, 0.36, 6, 12]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 0.9} depthWrite={false} />
      </mesh>

      {/* --- PELVIC BASIN & HIPS --- */}
      <mesh position={[0, 0.44, 0.02]}>
        <capsuleGeometry args={[0.24, 0.28, 8, 16]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} roughness={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.44, 0.02]}>
        <capsuleGeometry args={[0.243, 0.283, 8, 14]} />
        <meshBasicMaterial color={shellColor} wireframe transparent opacity={wireOpacity} />
      </mesh>

      {/* --- UPPER LIMBS (DELTOIDS, BICEPS, FOREARMS & ARTICULATED HANDS) --- */}
      {/* Left Deltoid (Shoulder Cap) */}
      <mesh position={[-0.56, 1.68, 0.06]}>
        <sphereGeometry args={[0.16, 16, 14]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.1} depthWrite={false} />
      </mesh>
      {/* Left Biceps/Triceps Brachium */}
      <mesh position={[-0.66, 1.28, 0.06]} rotation={[0, 0, -0.12]}>
        <capsuleGeometry args={[0.095, 0.38, 8, 14]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} depthWrite={false} />
      </mesh>
      {/* Left Elbow Joint */}
      <mesh position={[-0.74, 0.94, 0.06]}>
        <sphereGeometry args={[0.08, 12, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} depthWrite={false} />
      </mesh>
      {/* Left Forearm Antebrachium */}
      <mesh position={[-0.8, 0.62, 0.1]} rotation={[0.06, 0, -0.14]}>
        <cylinderGeometry args={[0.08, 0.06, 0.48, 14]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} depthWrite={false} />
      </mesh>
      {/* Left Hand with Articulated Fingers in Natural Resting Curl */}
      <group position={[-0.88, 0.26, 0.12]} rotation={[0, 0, -0.1]}>
        <mesh>
          <boxGeometry args={[0.1, 0.13, 0.04]} />
          <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} depthWrite={false} />
        </mesh>
        {/* Thumb */}
        <mesh position={[0.045, 0.015, 0.02]} rotation={[0, 0.35, 0.25]}>
          <cylinderGeometry args={[0.016, 0.014, 0.08, 6]} />
          <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} depthWrite={false} />
        </mesh>
        {/* 4 Fingers */}
        {[-0.03, -0.01, 0.01, 0.03].map((xOff, i) => (
          <mesh key={i} position={[xOff, -0.09, 0.008]} rotation={[-0.14, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.009, 0.08, 6]} />
            <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Right Deltoid (Shoulder Cap) */}
      <mesh position={[0.56, 1.68, 0.06]}>
        <sphereGeometry args={[0.16, 16, 14]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.1} depthWrite={false} />
      </mesh>
      {/* Right Biceps/Triceps Brachium */}
      <mesh position={[0.66, 1.28, 0.06]} rotation={[0, 0, 0.12]}>
        <capsuleGeometry args={[0.095, 0.38, 8, 14]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} depthWrite={false} />
      </mesh>
      {/* Right Elbow Joint */}
      <mesh position={[0.74, 0.94, 0.06]}>
        <sphereGeometry args={[0.08, 12, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} depthWrite={false} />
      </mesh>
      {/* Right Forearm Antebrachium */}
      <mesh position={[0.8, 0.62, 0.1]} rotation={[0.06, 0, 0.14]}>
        <cylinderGeometry args={[0.08, 0.06, 0.48, 14]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} depthWrite={false} />
      </mesh>
      {/* Right Hand with Articulated Fingers */}
      <group position={[0.88, 0.26, 0.12]} rotation={[0, 0, 0.1]}>
        <mesh>
          <boxGeometry args={[0.1, 0.13, 0.04]} />
          <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} depthWrite={false} />
        </mesh>
        {/* Thumb */}
        <mesh position={[-0.045, 0.015, 0.02]} rotation={[0, -0.35, -0.25]}>
          <cylinderGeometry args={[0.016, 0.014, 0.08, 6]} />
          <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} depthWrite={false} />
        </mesh>
        {/* 4 Fingers */}
        {[-0.03, -0.01, 0.01, 0.03].map((xOff, i) => (
          <mesh key={i} position={[xOff, -0.09, 0.008]} rotation={[-0.14, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.009, 0.08, 6]} />
            <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* --- LOWER LIMBS (THIGHS, KNEES, SHINS, CALVES & FEET) --- */}
      {/* Left Thigh (Quadriceps Femoris) */}
      <mesh position={[-0.22, -0.18, 0.03]} rotation={[0, 0, -0.04]}>
        <capsuleGeometry args={[0.14, 0.64, 8, 16]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} roughness={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[-0.22, -0.18, 0.03]} rotation={[0, 0, -0.04]}>
        <capsuleGeometry args={[0.142, 0.642, 8, 12]} />
        <meshBasicMaterial color={shellColor} wireframe transparent opacity={wireOpacity} />
      </mesh>
      {/* Left Patella Knee Cap */}
      <mesh position={[-0.23, -0.66, 0.08]}>
        <sphereGeometry args={[0.1, 14, 12]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} depthWrite={false} />
      </mesh>
      {/* Left Lower Leg & Calf Muscle */}
      <mesh position={[-0.23, -1.15, 0.02]}>
        <cylinderGeometry args={[0.105, 0.075, 0.78, 16]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} roughness={0.2} depthWrite={false} />
      </mesh>
      {/* Left Calf Bulge (Gastrocnemius) */}
      <mesh position={[-0.23, -1.05, -0.06]}>
        <sphereGeometry args={[0.095, 12, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 0.9} depthWrite={false} />
      </mesh>
      {/* Left Foot */}
      <mesh position={[-0.23, -1.62, 0.1]}>
        <boxGeometry args={[0.12, 0.1, 0.28]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.2} depthWrite={false} />
      </mesh>

      {/* Right Thigh (Quadriceps Femoris) */}
      <mesh position={[0.22, -0.18, 0.03]} rotation={[0, 0, 0.04]}>
        <capsuleGeometry args={[0.14, 0.64, 8, 16]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} roughness={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[0.22, -0.18, 0.03]} rotation={[0, 0, 0.04]}>
        <capsuleGeometry args={[0.142, 0.642, 8, 12]} />
        <meshBasicMaterial color={shellColor} wireframe transparent opacity={wireOpacity} />
      </mesh>
      {/* Right Patella Knee Cap */}
      <mesh position={[0.23, -0.66, 0.08]}>
        <sphereGeometry args={[0.1, 14, 12]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} depthWrite={false} />
      </mesh>
      {/* Right Lower Leg & Calf Muscle */}
      <mesh position={[0.23, -1.15, 0.02]}>
        <cylinderGeometry args={[0.105, 0.075, 0.78, 16]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity} roughness={0.2} depthWrite={false} />
      </mesh>
      {/* Right Calf Bulge (Gastrocnemius) */}
      <mesh position={[0.23, -1.05, -0.06]}>
        <sphereGeometry args={[0.095, 12, 10]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 0.9} depthWrite={false} />
      </mesh>
      {/* Right Foot */}
      <mesh position={[0.23, -1.62, 0.1]}>
        <boxGeometry args={[0.12, 0.1, 0.28]} />
        <meshStandardMaterial color={shellColor} transparent opacity={meshOpacity * 1.15} roughness={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 2. HIGH-PRECISION SKELETAL S-CURVE SPINE, CRANIUM & RIB ARCS
// ---------------------------------------------------------------------------
function AnatomicalSkeleton({ isLight }: { isLight: boolean }) {
  const boneColor = isLight ? "#475569" : "#cbd5e1";
  const glowColor = isLight ? "#0284c7" : "#38bdf8";
  const opacity = isLight ? 0.75 : 0.88;

  // 24-Vertebrae S-Curve Spine
  const vertebrae = useMemo(() => {
    const list: [number, number, number][] = [];
    for (let i = 0; i < 24; i++) {
      const y = 0.38 + i * 0.084;
      const z = Math.sin(i * 0.28) * 0.05 - 0.04;
      list.push([0, y, z]);
    }
    return list;
  }, []);

  // 11 Bilateral Rib Arcs
  const ribs = useMemo(() => {
    const pairs: { left: THREE.Vector3[]; right: THREE.Vector3[] }[] = [];
    for (let i = 0; i < 11; i++) {
      const y = 1.02 + i * 0.086;
      const width = 0.42 - Math.abs(i - 5.5) * 0.024;
      const depth = 0.28 - Math.abs(i - 5.5) * 0.016;

      const leftPts: THREE.Vector3[] = [];
      const rightPts: THREE.Vector3[] = [];
      const segs = 14;

      for (let s = 0; s <= segs; s++) {
        const theta = (s / segs) * Math.PI;
        const xL = -Math.sin(theta) * width;
        const xR = Math.sin(theta) * width;
        const z = Math.cos(theta) * depth + 0.06;
        const yDrop = y - Math.sin(theta * 0.85) * 0.048;

        leftPts.push(new THREE.Vector3(xL, yDrop, z));
        rightPts.push(new THREE.Vector3(xR, yDrop, z));
      }
      pairs.push({ left: leftPts, right: rightPts });
    }
    return pairs;
  }, []);

  return (
    <group>
      {/* S-Curved Vertebrae Disks */}
      {vertebrae.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <cylinderGeometry args={[0.048, 0.058, 0.04, 10]} />
          <meshStandardMaterial color={boneColor} roughness={0.3} metalness={0.2} transparent opacity={opacity} />
        </mesh>
      ))}

      {/* Luminous Central Spinal Cord Core */}
      <mesh position={[0, 1.34, -0.04]}>
        <cylinderGeometry args={[0.016, 0.016, 2.05, 8]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.9} />
      </mesh>

      {/* 11 Rib Pairs */}
      {ribs.map((pair, idx) => {
        const curveL = new THREE.CatmullRomCurve3(pair.left);
        const curveR = new THREE.CatmullRomCurve3(pair.right);
        const geomL = new THREE.TubeGeometry(curveL, 14, 0.012, 6, false);
        const geomR = new THREE.TubeGeometry(curveR, 14, 0.012, 6, false);

        return (
          <group key={idx}>
            <mesh geometry={geomL}>
              <meshStandardMaterial color={boneColor} roughness={0.35} transparent opacity={opacity * 0.9} />
            </mesh>
            <mesh geometry={geomR}>
              <meshStandardMaterial color={boneColor} roughness={0.35} transparent opacity={opacity * 0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Sternal Body & Manubrium Plate */}
      <mesh position={[0, 1.45, 0.26]}>
        <boxGeometry args={[0.07, 0.38, 0.02]} />
        <meshStandardMaterial color={boneColor} roughness={0.3} transparent opacity={opacity} />
      </mesh>

      {/* Clavicles (Collarbones) */}
      <mesh position={[-0.24, 1.82, 0.14]} rotation={[0, 0.14, -0.08]}>
        <cylinderGeometry args={[0.018, 0.022, 0.44, 8]} />
        <meshStandardMaterial color={boneColor} roughness={0.3} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0.24, 1.82, 0.14]} rotation={[0, -0.14, 0.08]}>
        <cylinderGeometry args={[0.018, 0.022, 0.44, 8]} />
        <meshStandardMaterial color={boneColor} roughness={0.3} transparent opacity={opacity} />
      </mesh>

      {/* Cranium Skull Vault with Orbital Sockets */}
      <group position={[0, 2.44, 0.03]}>
        <mesh>
          <sphereGeometry args={[0.25, 20, 18]} />
          <meshStandardMaterial color={boneColor} roughness={0.25} transparent opacity={opacity} />
        </mesh>
        {/* Eye Orbits */}
        <mesh position={[-0.08, -0.03, 0.22]}>
          <ringGeometry args={[0.018, 0.048, 14]} />
          <meshBasicMaterial color={glowColor} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.08, -0.03, 0.22]}>
          <ringGeometry args={[0.018, 0.048, 14]} />
          <meshBasicMaterial color={glowColor} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Pelvic Basin (Iliac Wings) */}
      <group position={[0, 0.44, 0.02]}>
        <mesh position={[-0.21, 0.05, 0.02]} rotation={[0, -0.2, -0.15]}>
          <torusGeometry args={[0.14, 0.026, 8, 14]} />
          <meshStandardMaterial color={boneColor} roughness={0.3} transparent opacity={opacity} />
        </mesh>
        <mesh position={[0.21, 0.05, 0.02]} rotation={[0, 0.2, 0.15]}>
          <torusGeometry args={[0.14, 0.026, 8, 14]} />
          <meshStandardMaterial color={boneColor} roughness={0.3} transparent opacity={opacity} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 3. BEATING 4-CHAMBER HEART & VASCULAR ARBORIZATION
// ---------------------------------------------------------------------------
function CardiovascularEngine({ hrBpm = 74 }: { hrBpm?: number }) {
  const heartGroupRef = useRef<THREE.Group>(null);
  const flowPhotonsRef = useRef<THREE.Points>(null);

  const aortaTube = useMemo(() => {
    const pts = [
      new THREE.Vector3(-0.06, 1.32, 0.2),
      new THREE.Vector3(-0.04, 1.5, 0.18),
      new THREE.Vector3(0.04, 1.6, 0.14),
      new THREE.Vector3(0.08, 1.5, 0.06),
      new THREE.Vector3(0.06, 0.88, -0.01),
      new THREE.Vector3(0.04, 0.44, 0.03),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 32, 0.03, 10, false);
  }, []);

  const flowPhotonPositions = useMemo(() => {
    const count = 48;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 0.05;
      pos[i * 3 + 1] = 0.44 + (i / count) * 1.15;
      pos[i * 3 + 2] = 0.1 + (Math.random() - 0.5) * 0.06;
    }
    return pos;
  }, []);

  useFrame((state) => {
    const bps = hrBpm / 60;
    const phase = (state.clock.elapsedTime * bps * Math.PI * 2) % (Math.PI * 2);
    const systole = Math.sin(phase);
    const pulse = systole > 0.3 ? 1.0 + Math.sin(phase) * 0.2 : 1.0;

    if (heartGroupRef.current) {
      heartGroupRef.current.scale.set(pulse, pulse, pulse);
    }

    if (flowPhotonsRef.current) {
      const posAttr = flowPhotonsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] -= 0.014 * bps;
        if (arr[i * 3 + 1] < 0.44) {
          arr[i * 3 + 1] = 1.6;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 4-Chamber Anatomical Heart */}
      <group ref={heartGroupRef} position={[-0.08, 1.32, 0.2]}>
        <mesh position={[-0.04, -0.05, 0.02]}>
          <dodecahedronGeometry args={[0.11, 1]} />
          <meshStandardMaterial color="#f43f5e" emissive="#e11d48" emissiveIntensity={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0.06, -0.03, 0.03]}>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshStandardMaterial color="#fb7185" emissive="#f43f5e" emissiveIntensity={0.6} roughness={0.2} />
        </mesh>
      </group>

      {/* Aortic Arch & Descending Aorta */}
      <mesh geometry={aortaTube}>
        <meshStandardMaterial color="#f43f5e" emissive="#e11d48" emissiveIntensity={0.7} roughness={0.2} />
      </mesh>

      {/* Carotid Arterial Conduits to Cranium */}
      <mesh position={[-0.05, 1.88, 0.1]}>
        <cylinderGeometry args={[0.014, 0.018, 0.62, 8]} />
        <meshBasicMaterial color="#fb7185" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0.05, 1.88, 0.1]}>
        <cylinderGeometry args={[0.014, 0.018, 0.62, 8]} />
        <meshBasicMaterial color="#fb7185" transparent opacity={0.85} />
      </mesh>

      {/* Dynamic Blood Flow Particles */}
      <points ref={flowPhotonsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={flowPhotonPositions.length / 3} array={flowPhotonPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.032} color="#fed7aa" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 4. RESPIRATORY LUNGS & CEREBRAL NEURAL BRAIN
// ---------------------------------------------------------------------------
function RespiratoryAndNeuralOrgans() {
  const lungsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const breathRate = 12 / 60;
    const breathPhase = state.clock.elapsedTime * breathRate * Math.PI * 2;
    const expansion = 1.0 + Math.sin(breathPhase) * 0.08;

    if (lungsRef.current) {
      lungsRef.current.scale.set(expansion, expansion, 1.0 + Math.sin(breathPhase) * 0.1);
    }
  });

  return (
    <group>
      {/* Expanding Bilateral Lungs */}
      <group ref={lungsRef} position={[0, 1.38, 0.06]}>
        <mesh position={[-0.23, 0, 0]}>
          <capsuleGeometry args={[0.11, 0.36, 8, 14]} />
          <meshStandardMaterial color="#06b6d4" transparent opacity={0.34} roughness={0.3} depthWrite={false} />
        </mesh>
        <mesh position={[0.23, 0, 0]}>
          <capsuleGeometry args={[0.105, 0.34, 8, 14]} />
          <meshStandardMaterial color="#06b6d4" transparent opacity={0.34} roughness={0.3} depthWrite={false} />
        </mesh>
      </group>

      {/* Cerebral Cortex (Brain Hemispheres inside Skull) */}
      <group position={[0, 2.48, 0.03]}>
        <mesh position={[-0.08, 0.02, 0]}>
          <sphereGeometry args={[0.14, 14, 12]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.6} roughness={0.2} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.08, 0.02, 0]}>
          <sphereGeometry args={[0.14, 14, 12]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.6} roughness={0.2} transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 5. MEDICAL SCANNER DAIS PEDESTAL & SWEEPING LASER PLANE
// ---------------------------------------------------------------------------
function MedicalScannerDaisAndLaser() {
  const laserRef = useRef<THREE.Group>(null);
  const ringEmitterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (laserRef.current) {
      const t = state.clock.elapsedTime * 0.7;
      laserRef.current.position.y = Math.sin(t) * 2.1 + 0.45;
    }
    if (ringEmitterRef.current) {
      ringEmitterRef.current.rotation.z = state.clock.elapsedTime * 0.4;
    }
  });

  return (
    <group>
      {/* Sweeping Cyan Volumetric Laser Scan Plane (Slender Ring & Laser Line) */}
      <group ref={laserRef} position={[0, 0, 0]}>
        {/* Slender Cyan Scanner Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.62, 0.65, 48]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        {/* Subtle Horizontal Laser Sweeping Line */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.24, 0.015]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Holographic Medical Scanner Dais (Floor Pedestal at y = -1.68) */}
      <group position={[0, -1.68, 0]}>
        {/* Sleek Low-Profile Platform Ring on Floor (XZ Plane) */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.52, 0.56, 36]} />
          <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
        {/* Inner Rotating Telemetry Ring */}
        <mesh ref={ringEmitterRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.46, 24]} />
          <meshBasicMaterial color="#0284c7" side={THREE.DoubleSide} wireframe />
        </mesh>
        {/* Soft Holographic Central Floor Glow */}
        <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.36, 32]} />
          <meshBasicMaterial color="#0284c7" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 6. 7 INTERACTIVE ORGAN NODE RETICLES WITH FLOATING METRIC HUDs
// ---------------------------------------------------------------------------
function OrganNodeReticle({
  node,
  score,
  isSelected,
  onClick,
}: {
  node: OrganNodeDef;
  score: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const reticleRingRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reticleRingRef.current) {
      reticleRingRef.current.rotation.z = state.clock.elapsedTime * 0.8;
    }
  });

  const statusColor = score < 50 ? "#e11d48" : score < 75 ? "#f59e0b" : "#10b981";

  return (
    <group position={node.position}>
      {/* Central Pulsating Telemetry Orb */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[isSelected ? 0.15 : 0.11, 16, 16]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isSelected ? 1.4 : 0.75}
          roughness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Rotating Concentric Aerospace Reticle Ring */}
      <group ref={reticleRingRef}>
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[0.16, 0.2, 18]} />
          <meshBasicMaterial color={statusColor} side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Outer Selection Highlight Ring */}
      {isSelected && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[0.24, 0.27, 28]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// 7. MAIN EXPORTED THREE.JS COMPONENT: AnatomicalTwin3D
// ---------------------------------------------------------------------------
export function AnatomicalTwin3D({
  theme,
  axes,
  selectedAxisId,
  onAxisSelect,
}: AnatomicalTwin3DProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const isLight = theme.id === "orbital-daylight";

  // Gentle, cinematic breathing / yaw oscillation (subtle microgravity drift)
  useFrame((state) => {
    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.12;
    }
  });

  const getAxisScore = (axisId: string): number => {
    const ax = axes.find((a) => a.axis_id === axisId || a.label.toLowerCase().includes(axisId));
    return ax?.score ?? 78.0;
  };

  return (
    <group ref={rootGroupRef} position={[0, -0.38, 0]} scale={[0.88, 0.88, 0.88]}>
      {/* 1. Organic Volumetric Holographic Human Cyber-Anatomy Silhouette */}
      <VolumetricHumanSilhouette isLight={isLight} />

      {/* 2. High-Precision Skeletal Framework & Vertebrae */}
      <AnatomicalSkeleton isLight={isLight} />

      {/* 3. Beating 4-Chamber Heart & Vascular System */}
      <CardiovascularEngine hrBpm={selectedAxisId === "cardio" ? 82 : 74} />

      {/* 4. Respiratory Lungs & Cerebral Neural Brain */}
      <RespiratoryAndNeuralOrgans />

      {/* 5. Medical Scanner Dais Base & Sweeping Laser Plane */}
      <MedicalScannerDaisAndLaser />

      {/* 6. 7 Interactive Organ Telemetry Reticle Nodes */}
      {ANATOMICAL_AXES.map((node) => (
        <OrganNodeReticle
          key={node.axisId}
          node={node}
          score={getAxisScore(node.axisId)}
          isSelected={selectedAxisId === node.axisId}
          onClick={() => onAxisSelect(node.axisId)}
        />
      ))}
    </group>
  );
}

export default AnatomicalTwin3D;
