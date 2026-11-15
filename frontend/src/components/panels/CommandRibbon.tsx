// ---------------------------------------------------------------------------
// CHIRON v3.0 - CommandRibbon (Top Flight-Deck Ribbon - 62px)
// Liquid Glass Aerospace Command Ribbon.
// Big, bold, high-contrast typography, tactile liquid glass capsules,
// and specular rim highlights.
// ---------------------------------------------------------------------------

import React, { useState, useEffect } from "react";
import { Shield, Radio, WifiOff, Activity } from "lucide-react";
import ThemeSelector, { ThemeId } from "../ui/ThemeSelector";

export type CrewMember = "CDR. VANCE" | "PLT. ROSTOVA" | "MS1. CHEN" | "CMO. PATEL";
export type ScenarioId = "A" | "B" | "C";

interface CommandRibbonProps {
  activeCrew: CrewMember;
  onCrewChange: (crew: CrewMember) => void;
  activeScenario: ScenarioId;
  onScenarioChange: (scenario: ScenarioId) => void;
  airGapOffline: boolean;
  onAirGapToggle: (offline: boolean) => void;
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  onIncapacitation: () => void;
}

interface CrewProfile {
  id: CrewMember;
  shortRole: string;
  nominalAri: number;
  statusDot: string;
  glowClass: string;
}

function formatMET(totalSeconds: number): string {
  const days = 47 + Math.floor(totalSeconds / 86400);
  const hours = 14 + Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const dd = String(days).padStart(2, "0");
  const hh = String(hours % 24).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `MET ${dd}:${hh}:${mm}:${ss}`;
}

export const CommandRibbon: React.FC<CommandRibbonProps> = ({
  activeCrew,
  onCrewChange,
  activeScenario,
  onScenarioChange,
  airGapOffline,
  onAirGapToggle,
  activeTheme,
  onThemeChange,
  onIncapacitation,
}) => {
  const [metSeconds, setMetSeconds] = useState<number>(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setMetSeconds(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const crewProfiles: CrewProfile[] = [
    {
      id: "CDR. VANCE",
      shortRole: "CDR",
      nominalAri: activeScenario === "B" ? 62 : 68,
      statusDot: activeScenario === "A" ? "var(--accent-warn)" : "var(--accent-ok)",
      glowClass: activeScenario === "A" ? "glow-refract-amber" : "glow-refract-teal",
    },
    {
      id: "PLT. ROSTOVA",
      shortRole: "PLT",
      nominalAri: activeScenario === "B" ? 64 : 89,
      statusDot: activeScenario === "B" ? "var(--accent-warn)" : "var(--accent-ok)",
      glowClass: activeScenario === "B" ? "glow-refract-amber" : "glow-refract-teal",
    },
    {
      id: "MS1. CHEN",
      shortRole: "MS1",
      nominalAri: activeScenario === "B" ? 61 : 84,
      statusDot: activeScenario === "B" ? "var(--accent-warn)" : "var(--accent-ok)",
      glowClass: activeScenario === "B" ? "glow-refract-amber" : "glow-refract-teal",
    },
    {
      id: "CMO. PATEL",
      shortRole: "CMO",
      nominalAri: activeScenario === "C" ? 34 : activeScenario === "B" ? 63 : 78,
      statusDot: activeScenario === "C" ? "var(--accent-crit)" : "var(--accent-ok)",
      glowClass: activeScenario === "C" ? "glow-refract-crimson" : "glow-refract-teal",
    },
  ];

  const scenarios: { id: ScenarioId; label: string }[] = [
    { id: "A", label: "CREW-11 LEO SANS" },
    { id: "B", label: "ARTEMIS II SPE" },
    { id: "C", label: "CMO INCAPACITATION" },
  ];

  return (
    <header className="w-full h-[62px] px-4 flex items-center justify-between border-b border-[var(--border-primary)] select-none shrink-0 liquid-glass-panel rounded-none border-t-0 border-x-0">
      {/* LEFT: Branding & High-Visibility MET Clock */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 liquid-glass-card shadow-sm border border-[var(--border-strong)]">
          <Activity className="w-4 h-4 text-[var(--accent-active)] animate-pulse" />
          <span className="text-sm font-black tracking-wider text-[var(--ink-primary)] font-mono">
            CHIRON <span className="text-xs text-[var(--ink-secondary)] font-semibold">v3.0</span>
          </span>
        </div>

        <div className="text-base font-black text-[var(--accent-active)] tracking-wider font-mono drop-shadow-sm">
          {formatMET(metSeconds)}
        </div>
      </div>

      {/* CENTER-LEFT: 4-Crew Cohort Switcher (Liquid Glass Capsules with Big Bold Text) */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-[var(--ink-secondary)] uppercase tracking-wider">
          CREW:
        </span>
        <div className="flex gap-1.5 p-1 liquid-glass-card border border-[var(--border-primary)]">
          {crewProfiles.map((crew) => {
            const isActive = activeCrew === crew.id;
            return (
              <button
                key={crew.id}
                onClick={() => onCrewChange(crew.id)}
                className={`px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-2 transition-all rounded-md ${
                  isActive
                    ? `bg-[var(--surface-active)] text-[var(--ink-primary)] border border-[var(--accent-info)] ${crew.glowClass} shadow-md`
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-active)]/40"
                }`}
              >
                {/* Status Dot with Halo */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: crew.statusDot,
                    boxShadow: `0 0 8px ${crew.statusDot}`,
                  }}
                />
                <span className="tracking-tight">{crew.id}</span>
                <span
                  className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                    isActive
                      ? "bg-[var(--surface-panel)] text-[var(--accent-active)] shadow-inner"
                      : "text-[var(--ink-tertiary)] bg-black/5"
                  }`}
                >
                  {crew.nominalAri}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER-RIGHT: 3-Scenario Switcher (Liquid Glass Tabs) */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-[var(--ink-secondary)] uppercase tracking-wider">
          SCENARIO:
        </span>
        <div className="flex gap-1 p-1 liquid-glass-card border border-[var(--border-primary)]">
          {scenarios.map((s) => {
            const isActive = activeScenario === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onScenarioChange(s.id)}
                className={`px-2.5 py-1.5 text-xs font-mono font-bold transition-all rounded-md ${
                  isActive
                    ? "bg-[var(--surface-active)] text-[var(--accent-active)] border border-[var(--accent-info)] glow-refract-cyan shadow-md"
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {s.id}: {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Link Status, Theme Selector, Emergency Button */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Air-gap / Online Hybrid Toggle */}
        <button
          onClick={() => onAirGapToggle(!airGapOffline)}
          className={`px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-2 transition-all rounded-lg border ${
            airGapOffline
              ? "bg-red-500/15 text-[var(--accent-crit)] border-[var(--accent-crit)] glow-refract-crimson"
              : "bg-emerald-500/15 text-[var(--accent-ok)] border-[var(--accent-ok)] glow-refract-teal"
          }`}
          title="Toggle between NASA Spacecraft Air-Gap mode and Online Hybrid mode"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: airGapOffline ? "var(--accent-crit)" : "var(--accent-ok)",
              boxShadow: airGapOffline
                ? "0 0 10px var(--accent-crit)"
                : "0 0 10px var(--accent-ok)",
            }}
          />
          {airGapOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              AIR-GAP OFFLINE
            </>
          ) : (
            <>
              <Radio className="w-3.5 h-3.5" />
              ONLINE HYBRID
            </>
          )}
        </button>

        {/* 3-Theme Hardware Selector */}
        <ThemeSelector activeTheme={activeTheme} onThemeChange={onThemeChange} />

        {/* CMO Incapacitation Emergency Break-Glass Button */}
        <button
          onClick={onIncapacitation}
          className="px-3.5 py-1.5 text-xs font-mono font-black flex items-center gap-1.5 bg-red-600/20 text-[var(--accent-crit)] border border-[var(--accent-crit)] hover:bg-red-600/30 transition-all rounded-lg glow-refract-crimson shadow-md active:scale-95"
        >
          <Shield className="w-4 h-4 text-[var(--accent-crit)]" />
          CMO DOWN
        </button>
      </div>
    </header>
  );
};

export default CommandRibbon;
