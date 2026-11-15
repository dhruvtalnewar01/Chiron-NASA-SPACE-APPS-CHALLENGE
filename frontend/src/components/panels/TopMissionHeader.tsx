// ---------------------------------------------------------------------------
// CHIRON v4.0 - TopMissionHeader
// Sticky Glassmorphic Top Mission Header (min-height: 70px, flex-wrap: wrap).
// Zero clipping on any screen width: Large bold MET clock (24px), Orbit badge,
// 3-Scenario Replay Bar (13.5px bold), and High-Contrast CMO Emergency Trigger.
// ---------------------------------------------------------------------------

import React, { useState, useEffect } from "react";
import { Shield, Orbit, Activity, AlertOctagon } from "lucide-react";
import type { ScenarioId } from "./CommandRibbon";

interface TopMissionHeaderProps {
  activeScenario: ScenarioId;
  onScenarioChange: (scenario: ScenarioId) => void;
  onIncapacitation: () => void;
  orbitName?: string;
  onReturnToHero?: () => void;
}

function formatMET(totalSeconds: number): string {
  const days = 47 + Math.floor(totalSeconds / 86400);
  const hours = 14 + Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const dd = String(days).padStart(3, "0");
  const hh = String(hours % 24).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `MET ${dd}:${hh}:${mm}:${ss}`;
}

export function TopMissionHeader({
  activeScenario,
  onScenarioChange,
  onIncapacitation,
  orbitName = "ISS LEO / ARTEMIS NRHO",
  onReturnToHero,
}: TopMissionHeaderProps) {
  const [metSeconds, setMetSeconds] = useState<number>(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setMetSeconds(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const scenarios: { id: ScenarioId; title: string; subtitle: string }[] = [
    {
      id: "A",
      title: "SCENARIO A: CREW-11 LEO SANS",
      subtitle: "Subclinical Edema + Wrist Sensor Dropout",
    },
    {
      id: "B",
      title: "SCENARIO B: ARTEMIS II SPE STORM",
      subtitle: "Proton Flux Spike + Cabin CO2 Excursion",
    },
    {
      id: "C",
      title: "SCENARIO C: CMO INCAPACITATION",
      subtitle: "Acute Syncope & Break-Glass Protocol",
    },
  ];

  return (
    <header className="sticky top-0 z-30 w-full min-h-[70px] px-6 py-2.5 flex items-center justify-between flex-wrap gap-4 border-b border-[var(--border-primary)] bg-[var(--surface-panel)] backdrop-blur-2xl shadow-md select-none">
      {/* LEFT: Large MET Clock & Orbital Horizon Badge */}
      <div className="flex items-center gap-4 shrink-0">
        {onReturnToHero && (
          <button
            onClick={onReturnToHero}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] hover:border-cyan-400 bg-[var(--surface-base)] hover:bg-[var(--surface-active)] text-xs font-mono font-bold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-all flex items-center gap-1.5 shadow-sm"
            title="Return to Hero Landing Briefing"
          >
            <span>← HERO BRIEFING</span>
          </button>
        )}
        <div className="flex flex-col">
          <span className="text-[23px] font-mono font-black tracking-wider text-[var(--accent-active)] drop-shadow-sm">
            {formatMET(metSeconds)}
          </span>
          <div className="flex items-center gap-1.5 text-[12.5px] font-mono font-bold text-[var(--ink-secondary)]">
            <Orbit className="w-4 h-4 text-[var(--accent-ok)] animate-spin" style={{ animationDuration: "16s" }} />
            <span>ORBIT: <strong className="text-[var(--ink-primary)]">{orbitName}</strong></span>
          </div>
        </div>
      </div>

      {/* CENTER: 3-Scenario Replay Bar (Large, Bold Interactive Buttons) */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-[12.5px] font-mono font-black text-[var(--ink-secondary)] uppercase tracking-wider mr-1">
          MISSION REPLAY:
        </span>
        <div className="flex gap-2 flex-wrap">
          {scenarios.map((s) => {
            const isActive = activeScenario === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onScenarioChange(s.id)}
                className={`px-3.5 py-2 text-left font-mono rounded-lg border transition-all ${
                  isActive
                    ? "bg-[var(--surface-active)] text-[var(--accent-active)] border-[var(--accent-info)] glow-refract-cyan shadow-md"
                    : "bg-[var(--surface-base)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] border-[var(--border-subtle)]"
                }`}
              >
                <div className="text-[13.5px] font-black tracking-tight">{s.title}</div>
                <div className="text-[11.5px] font-bold text-[var(--ink-tertiary)] truncate">
                  {s.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: High-Contrast Emergency Button */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onIncapacitation}
          className="px-4 py-2.5 text-[13px] font-mono font-black flex items-center gap-2 bg-red-600/18 text-[var(--accent-crit)] border-2 border-[var(--accent-crit)] hover:bg-red-600/28 transition-all rounded-lg glow-refract-crimson shadow-md active:scale-95 animate-pulse"
        >
          <AlertOctagon className="w-4.5 h-4.5 text-[var(--accent-crit)]" />
          <span>ACTIVATE CMO BUDDY-CARE MODE</span>
        </button>
      </div>
    </header>
  );
}

export default TopMissionHeader;
