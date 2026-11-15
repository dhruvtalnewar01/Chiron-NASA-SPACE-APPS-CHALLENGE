// ---------------------------------------------------------------------------
// CHIRON v4.0 - OrbitalCohortPanel
// Row 4 Left (col-span-6): 3D Orbital Return-Window Globe & 4-Crew Cohort Matrix.
// Overlaid onto cinematic Earth-at-Night orbital imagery (/earth_night.jpg),
// with Earth / Lunar NRHO / Mars transit evacuation arcs and large bold
// 4-Crew x 7-Axis Cohort Readiness Heatmap table. Strict flight-deck human factors.
// ---------------------------------------------------------------------------

import React, { useState, useRef, useEffect } from "react";
import { Orbit, Users, AlertTriangle, ShieldCheck, Globe } from "lucide-react";
import ProvenanceBadge from "../ui/ProvenanceBadge";
import type { OrbitalWindow } from "@/hooks/useChironAPI";

interface OrbitalCohortPanelProps {
  orbitalWindow: OrbitalWindow | null;
  activeScenario: string;
}

export function OrbitalCohortPanel({ orbitalWindow, activeScenario }: OrbitalCohortPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [missionProfile, setMissionProfile] = useState<"LEO" | "LUNAR" | "MARS">("LEO");

  const isScenarioB = activeScenario === "B";
  const isScenarioC = activeScenario === "C";

  // 4-Crew Cohort Data
  const crewList = [
    {
      id: "CDR_VANCE",
      name: "CDR. Vance",
      role: "Commander",
      ari: isScenarioB ? 62.4 : isScenarioC ? 76.5 : 68.2,
      axes: { cardio: 78, neuro: isScenarioB ? 56 : 58, bone: 82, sleep: 71, immune: isScenarioB ? 52 : 74, behav: 76, rad: isScenarioB ? 46 : 84 },
    },
    {
      id: "PLT_ROSTOVA",
      name: "PLT. Rostova",
      role: "Pilot",
      ari: isScenarioB ? 64.1 : 89.2,
      axes: { cardio: 86, neuro: isScenarioB ? 58 : 88, bone: 91, sleep: isScenarioB ? 60 : 78, immune: isScenarioB ? 54 : 85, behav: 84, rad: isScenarioB ? 48 : 88 },
    },
    {
      id: "MS1_CHEN",
      name: "MS1. Chen",
      role: "Mission Spec",
      ari: isScenarioB ? 60.8 : 84.0,
      axes: { cardio: 82, neuro: isScenarioB ? 54 : 82, bone: 85, sleep: isScenarioB ? 58 : 74, immune: isScenarioB ? 50 : 81, behav: 80, rad: isScenarioB ? 44 : 82 },
    },
    {
      id: "CMO_PATEL",
      name: "CMO. Patel",
      role: "Chief Medical",
      ari: isScenarioC ? 34.2 : isScenarioB ? 63.5 : 78.4,
      axes: { cardio: isScenarioC ? 32 : 80, neuro: isScenarioC ? 44 : isScenarioB ? 57 : 86, bone: 88, sleep: 75, immune: isScenarioB ? 51 : 79, behav: isScenarioC ? 28 : 82, rad: isScenarioB ? 45 : 86 },
    },
  ];

  const axisKeys = [
    { key: "cardio", label: "01 CARDIO" },
    { key: "neuro", label: "02 NEURO" },
    { key: "bone", label: "03 BONE" },
    { key: "sleep", label: "04 SLEEP" },
    { key: "immune", label: "05 IMMUNE" },
    { key: "behav", label: "06 BEHAV" },
    { key: "rad", label: "07 RAD" },
  ] as const;

  // 3D Orbital Trajectory Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let angle = 0;
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      angle += 0.015;

      ctx.clearRect(0, 0, width, height);

      // Central Planetary Sphere (Earth / Lunar / Mars)
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fillStyle = missionProfile === "MARS" ? "rgba(249, 115, 22, 0.85)" : "rgba(2, 132, 199, 0.85)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Atmospheric Limb Glow
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(14, 165, 233, 0.5)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Orbital Trajectory Ellipse
      const rx = missionProfile === "LUNAR" ? 150 : missionProfile === "MARS" ? 175 : 120;
      const ry = missionProfile === "LUNAR" ? 60 : missionProfile === "MARS" ? 70 : 45;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, -0.2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([8, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Closing Evacuation Hazard Sector Arc (Red Segment)
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, -0.2, Math.PI * 0.7, Math.PI * 1.15);
      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Spacecraft Position Marker
      const shipX = cx + Math.cos(angle) * rx * Math.cos(-0.2) - Math.sin(angle) * ry * Math.sin(-0.2);
      const shipY = cy + Math.cos(angle) * rx * Math.sin(-0.2) + Math.sin(angle) * ry * Math.cos(-0.2);

      ctx.beginPath();
      ctx.arc(shipX, shipY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Spacecraft Beacon Wave
      ctx.beginPath();
      ctx.arc(shipX, shipY, 11, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Solar storm vectors in Scenario B
      if (isScenarioB) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const px = (width - ((angle * 120 + i * 80) % width));
          const py = cy - 50 + i * 20;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - 25, py + 6);
          ctx.stroke();
        }
      }
    };

    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [missionProfile, isScenarioB]);

  const getCellColor = (val: number) => {
    if (val < 50) return "bg-red-500/25 text-[var(--accent-crit)] border-red-500/60 font-black";
    if (val < 70) return "bg-amber-500/20 text-[var(--accent-warn)] border-amber-500/50 font-black";
    return "bg-emerald-500/18 text-[var(--accent-ok)] border-emerald-500/40 font-black";
  };

  return (
    <div className="w-full chiron-bento-card p-5 flex flex-col justify-between select-none">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <Orbit className="w-5 h-5 text-[var(--accent-active)] animate-spin" style={{ animationDuration: "25s" }} />
          <h2 className="text-[19px] font-mono font-black tracking-wider text-[var(--ink-primary)]">
            ORBITAL HORIZON & 4-CREW COHORT MATRIX
          </h2>
        </div>

        {/* Corridor Switcher */}
        <div className="flex gap-1.5 p-1 bg-[var(--surface-base)] rounded-lg border border-[var(--border-subtle)]">
          {(["LEO", "LUNAR", "MARS"] as const).map((corridor) => (
            <button
              key={corridor}
              onClick={() => setMissionProfile(corridor)}
              className={`px-3 py-1 text-[12.5px] font-mono font-black rounded transition-all ${
                missionProfile === corridor
                  ? "bg-white text-[var(--accent-active)] border border-[var(--accent-info)] shadow-sm font-black"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              {corridor === "LEO" ? "LEO (14h Abort)" : corridor === "LUNAR" ? "NRHO (96h)" : "MARS (Shelter)"}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 3D Orbital Simulation Visualizer (With Earth at Night Backdrop /earth_night.jpg) */}
      <div className="w-full h-[200px] rounded-xl border border-[var(--border-subtle)] relative flex items-center justify-center overflow-hidden mb-4 glow-refract-cyan">
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: "url('/earth_night.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none" />

        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full h-full block relative z-10"
        />

        <div className="absolute top-3 left-3 text-[12.5px] font-mono font-black text-cyan-300 bg-black/80 px-2.5 py-1 rounded border border-cyan-400/50 z-20">
          TRAJECTORY: {missionProfile} | ΔV: 120 m/s | T_CRIT: 28.5h
        </div>

        <div className="absolute bottom-3 right-3 text-[12.5px] font-mono font-black text-emerald-300 bg-black/80 px-2.5 py-1 rounded border border-emerald-400/50 z-20">
          EVACUATION CORRIDOR: OPEN
        </div>
      </div>

      {/* 3. 4-Crew x 7-Axis Cohort Readiness Heatmap Table */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-[var(--accent-active)]" />
            <span className="text-[13.5px] font-mono font-black uppercase text-[var(--ink-primary)]">
              4-Crew Physiological Readiness Matrix
            </span>
          </div>

          {isScenarioB ? (
            <span className="text-[12px] font-mono font-black text-[var(--accent-crit)] px-2.5 py-1 rounded bg-red-500/18 border border-[var(--accent-crit)] animate-pulse">
              SHARED CABIN HAZARD: 4/4 SPE STORM & CO2 EXCURSION
            </span>
          ) : isScenarioC ? (
            <span className="text-[12px] font-mono font-black text-[var(--accent-crit)] px-2.5 py-1 rounded bg-red-500/18 border border-[var(--accent-crit)]">
              SOLITARY ANOMALY: CMO ACUTE ORTHOSTATIC INCAPACITATION
            </span>
          ) : (
            <span className="text-[12px] font-mono font-black text-[var(--accent-ok)] px-2.5 py-1 rounded bg-emerald-500/18 border border-[var(--accent-ok)]">
              NO SHARED CABIN HAZARDS DETECTED
            </span>
          )}
        </div>

        {/* Heatmap Table */}
        <div className="w-full overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)]">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--ink-secondary)] text-[12px]">
                <th className="text-left py-2.5 px-3.5 font-black">CREW MEMBER</th>
                <th className="text-center py-2.5 px-2.5 font-black text-[var(--ink-primary)]">ARI</th>
                {axisKeys.map((a) => (
                  <th key={a.key} className="text-center py-2.5 px-2 font-black">
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {crewList.map((crew) => (
                <tr key={crew.id} className="hover:bg-[var(--surface-active)] transition-colors">
                  <td className="py-2.5 px-3.5 flex flex-col">
                    <span className="font-black text-[var(--ink-primary)] text-[14.5px]">{crew.name}</span>
                    <span className="text-[11.5px] text-[var(--ink-tertiary)] font-bold">{crew.role}</span>
                  </td>
                  <td className="text-center py-2.5 px-2.5">
                    <span
                      className={`inline-block px-2.5 py-1 font-black text-[14px] rounded border ${
                        crew.ari < 50
                          ? "bg-red-500/25 text-[var(--accent-crit)] border-[var(--accent-crit)]"
                          : crew.ari < 75
                          ? "bg-amber-500/20 text-[var(--accent-warn)] border-[var(--accent-warn)]"
                          : "bg-emerald-500/20 text-[var(--accent-ok)] border-[var(--accent-ok)]"
                      }`}
                    >
                      {crew.ari.toFixed(1)}
                    </span>
                  </td>
                  {axisKeys.map((a) => {
                    const val = crew.axes[a.key];
                    return (
                      <td key={a.key} className="text-center py-2.5 px-2">
                        <div className={`py-1.5 px-2 rounded font-black text-[13.5px] border ${getCellColor(val)}`}>
                          {val}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OrbitalCohortPanel;
