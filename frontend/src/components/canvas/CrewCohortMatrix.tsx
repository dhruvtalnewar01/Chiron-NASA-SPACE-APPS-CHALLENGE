// ---------------------------------------------------------------------------
// CHIRON v3.0 - CrewCohortMatrix
// Mode C: 4-Crew Cohort Readiness & Shared Environmental Hazard Matrix.
// Compares CDR. Vance, PLT. Rostova, MS1. Chen, and CMO. Patel across all 7 axes + ARI,
// automatically flagging shared cabin environmental hazards (e.g. CO2 or radiation).
// ---------------------------------------------------------------------------

import React from "react";
import { AlertTriangle, ShieldCheck, Users, TrendingDown, TrendingUp } from "lucide-react";

interface CrewMemberData {
  id: string;
  name: string;
  role: string;
  ari: number;
  axes: {
    cardio: number;
    neuro: number;
    bone: number;
    sleep: number;
    immune: number;
    behav: number;
    rad: number;
  };
}

export function CrewCohortMatrix({ activeScenario }: { activeScenario: string }) {
  const isScenarioB = activeScenario === "B";
  const isScenarioC = activeScenario === "C";

  const crewList: CrewMemberData[] = [
    {
      id: "CDR_VANCE",
      name: "CDR. Vance",
      role: "Commander",
      ari: isScenarioB ? 62.4 : isScenarioC ? 76.5 : 68.2,
      axes: {
        cardio: 78,
        neuro: isScenarioB ? 56 : 58,
        bone: 82,
        sleep: 71,
        immune: isScenarioB ? 52 : 74,
        behav: 76,
        rad: isScenarioB ? 46 : 84,
      },
    },
    {
      id: "PLT_ROSTOVA",
      name: "PLT. Rostova",
      role: "Pilot",
      ari: isScenarioB ? 64.1 : 89.2,
      axes: {
        cardio: 86,
        neuro: isScenarioB ? 58 : 88,
        bone: 91,
        sleep: isScenarioB ? 60 : 78,
        immune: isScenarioB ? 54 : 85,
        behav: 84,
        rad: isScenarioB ? 48 : 88,
      },
    },
    {
      id: "MS1_CHEN",
      name: "MS1. Chen",
      role: "Mission Specialist",
      ari: isScenarioB ? 60.8 : 84.0,
      axes: {
        cardio: 82,
        neuro: isScenarioB ? 54 : 82,
        bone: 85,
        sleep: isScenarioB ? 58 : 74,
        immune: isScenarioB ? 50 : 81,
        behav: 80,
        rad: isScenarioB ? 44 : 82,
      },
    },
    {
      id: "CMO_PATEL",
      name: "CMO. Patel",
      role: "Chief Medical Officer",
      ari: isScenarioC ? 34.2 : isScenarioB ? 63.5 : 78.4,
      axes: {
        cardio: isScenarioC ? 32 : 80,
        neuro: isScenarioC ? 44 : isScenarioB ? 57 : 86,
        bone: 88,
        sleep: 75,
        immune: isScenarioB ? 51 : 79,
        behav: isScenarioC ? 28 : 82,
        rad: isScenarioB ? 45 : 86,
      },
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

  const getCellColor = (val: number) => {
    if (val < 50) return "bg-red-500/20 text-[var(--accent-crit)] border-red-500/40";
    if (val < 70) return "bg-amber-500/15 text-[var(--accent-warn)] border-amber-500/30";
    return "bg-emerald-500/10 text-[var(--accent-ok)] border-emerald-500/20";
  };

  return (
    <div className="w-full h-full p-4 flex flex-col justify-between overflow-hidden select-none bg-[var(--canvas-bg)]">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--accent-active)]" />
          <span className="text-xs font-mono font-bold text-[var(--ink-primary)]">
            4-CREW COHORT READINESS & HABITAT RISK MATRIX
          </span>
        </div>

        {isScenarioB ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-[var(--accent-crit)] text-[var(--accent-crit)] text-[10px] font-mono font-bold rounded-[2px] animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            SHARED CABIN HAZARD: 4/4 CREW SOLAR SPE & CO2 ACCUMULATION
          </div>
        ) : isScenarioC ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-[var(--accent-crit)] text-[var(--accent-crit)] text-[10px] font-mono font-bold rounded-[2px]">
            <AlertTriangle className="w-3.5 h-3.5" />
            SOLITARY CRITICAL ANOMALY: CMO ACUTE ORTHOSTATIC INCAPACITATION
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-[var(--accent-ok)] text-[var(--accent-ok)] text-[10px] font-mono font-bold rounded-[2px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            NO SHARED CABIN HAZARD | ISOLATED CDR NEURO SANS ADVISORY
          </div>
        )}
      </div>

      {/* Cohort Heatmap Table */}
      <div className="flex-1 my-3 overflow-auto">
        <table className="w-full border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-[var(--border-strong)] text-[10px] text-[var(--ink-secondary)]">
              <th className="text-left py-2 px-3 font-semibold">CREW MEMBER</th>
              <th className="text-center py-2 px-2 font-bold text-[var(--ink-primary)]">ARI INDEX</th>
              {axisKeys.map((ax) => (
                <th key={ax.key} className="text-center py-2 px-2 font-semibold">
                  {ax.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {crewList.map((crew) => (
              <tr key={crew.id} className="hover:bg-[var(--surface-active)]/50 transition-colors">
                <td className="py-2.5 px-3 flex flex-col">
                  <span className="font-bold text-[var(--ink-primary)]">{crew.name}</span>
                  <span className="text-[10px] text-[var(--ink-tertiary)]">{crew.role}</span>
                </td>
                <td className="text-center py-2.5 px-2">
                  <span
                    className={`inline-block px-2 py-0.5 font-bold border rounded-[2px] ${
                      crew.ari < 50
                        ? "bg-red-500/20 text-[var(--accent-crit)] border-[var(--accent-crit)]"
                        : crew.ari < 75
                        ? "bg-amber-500/15 text-[var(--accent-warn)] border-[var(--accent-warn)]"
                        : "bg-emerald-500/15 text-[var(--accent-ok)] border-[var(--accent-ok)]"
                    }`}
                  >
                    {crew.ari.toFixed(1)}
                  </span>
                </td>
                {axisKeys.map((ax) => {
                  const val = crew.axes[ax.key];
                  return (
                    <td key={ax.key} className="text-center py-2.5 px-1.5">
                      <div
                        className={`py-1 px-1.5 border rounded-[2px] font-bold text-[11px] ${getCellColor(
                          val
                        )}`}
                      >
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

      {/* Shared Signature Diagnostic Legend */}
      <div className="p-2.5 border border-[var(--border-primary)] bg-[var(--surface-panel)] text-[10px] font-mono flex items-center justify-between rounded-[2px]">
        <div className="flex items-center gap-3 text-[var(--ink-secondary)]">
          <span className="font-bold text-[var(--ink-primary)]">POPULATION PRIORS:</span>
          <span>SOMA Cohort N=4</span>
          <span>ISS Twins Study Baseline</span>
          <span>Harmonic Allostatic Penalty (p=3.0)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[var(--accent-ok)]">
            <span className="w-2 h-2 rounded-[1px] bg-[var(--accent-ok)]" /> NOMINAL (70-100)
          </span>
          <span className="flex items-center gap-1 text-[var(--accent-warn)]">
            <span className="w-2 h-2 rounded-[1px] bg-[var(--accent-warn)]" /> DRIFT (50-69)
          </span>
          <span className="flex items-center gap-1 text-[var(--accent-crit)]">
            <span className="w-2 h-2 rounded-[1px] bg-[var(--accent-crit)]" /> CRITICAL (&lt;50)
          </span>
        </div>
      </div>
    </div>
  );
}

export default CrewCohortMatrix;

