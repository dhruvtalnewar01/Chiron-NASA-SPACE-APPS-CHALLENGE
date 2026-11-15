// ---------------------------------------------------------------------------
// CHIRON v4.0 - LeftTacticalNav
// Left Tactical Navigation Dock (280px fixed width on desktop).
// Flawless sequence: Brand & Telemetry Header -> Module Views ->
// Crew Biometric Roster -> Habitat Environment -> Uplink -> Theme Switcher.
// Extra-bold aerospace typography, high-contrast, production-grade flight deck.
// ---------------------------------------------------------------------------

import React from "react";
import {
  Activity,
  Layers,
  Mic,
  Sliders,
  Compass,
  Radio,
  WifiOff,
  Sun,
  Moon,
  Flame,
  Shield,
  ChevronRight,
  Wind,
  Gauge,
  Sparkles,
} from "lucide-react";
import type { ThemeId } from "../ui/ThemeSelector";

export type DashboardView =
  | "ALL_IN_ONE"
  | "ANATOMICAL"
  | "VOICE_DSP"
  | "VOI_SIMULATOR"
  | "ORBITAL_AUDIT";

export type CrewMember = "CDR. VANCE" | "PLT. ROSTOVA" | "MS1. CHEN" | "CMO. PATEL";

interface LeftTacticalNavProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  activeCrew: CrewMember;
  onCrewChange: (crew: CrewMember) => void;
  airGapOffline: boolean;
  onAirGapToggle: (offline: boolean) => void;
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  activeScenario: string;
  onReturnToHero?: () => void;
}

interface CrewItem {
  id: CrewMember;
  name: string;
  role: string;
  ari: number;
  statusText: string;
  statusColor: string;
  glowClass: string;
}

export function LeftTacticalNav({
  activeView,
  onViewChange,
  activeCrew,
  onCrewChange,
  airGapOffline,
  onAirGapToggle,
  activeTheme,
  onThemeChange,
  activeScenario,
  onReturnToHero,
}: LeftTacticalNavProps) {
  const isScenarioB = activeScenario === "B";
  const isScenarioC = activeScenario === "C";

  const crewList: CrewItem[] = [
    {
      id: "CDR. VANCE",
      name: "CDR. Vance",
      role: "Commander / Lead EVA",
      ari: isScenarioB ? 62 : 68,
      statusText: activeScenario === "A" ? "DRIFT" : "NOMINAL",
      statusColor: activeScenario === "A" ? "var(--accent-warn)" : "var(--accent-ok)",
      glowClass: activeScenario === "A" ? "glow-refract-amber" : "glow-refract-teal",
    },
    {
      id: "PLT. ROSTOVA",
      name: "PLT. Rostova",
      role: "Pilot / Systems Eng",
      ari: isScenarioB ? 64 : 89,
      statusText: isScenarioB ? "DRIFT" : "NOMINAL",
      statusColor: isScenarioB ? "var(--accent-warn)" : "var(--accent-ok)",
      glowClass: isScenarioB ? "glow-refract-amber" : "glow-refract-teal",
    },
    {
      id: "MS1. CHEN",
      name: "MS1. Chen",
      role: "Mission Specialist",
      ari: isScenarioB ? 61 : 84,
      statusText: isScenarioB ? "DRIFT" : "NOMINAL",
      statusColor: isScenarioB ? "var(--accent-warn)" : "var(--accent-ok)",
      glowClass: isScenarioB ? "glow-refract-amber" : "glow-refract-teal",
    },
    {
      id: "CMO. PATEL",
      name: "CMO. Patel",
      role: "Chief Medical Officer",
      ari: isScenarioC ? 34 : isScenarioB ? 63 : 78,
      statusText: isScenarioC ? "CRITICAL" : "ALERT",
      statusColor: isScenarioC ? "var(--accent-crit)" : "var(--accent-ok)",
      glowClass: isScenarioC ? "glow-refract-crimson" : "glow-refract-teal",
    },
  ];

  const viewFilters: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
    {
      id: "ALL_IN_ONE",
      label: "01 COMMAND FLIGHT DECK",
      icon: <Activity className="w-5 h-5 shrink-0" />,
    },
    {
      id: "ANATOMICAL",
      label: "02 ASTRONAUT DIGITAL TWIN",
      icon: <Layers className="w-5 h-5 shrink-0" />,
    },
    {
      id: "VOICE_DSP",
      label: "03 VOICE & DSP STUDIO",
      icon: <Mic className="w-5 h-5 shrink-0" />,
    },
    {
      id: "VOI_SIMULATOR",
      label: "04 VOI & SIMULATOR LAB",
      icon: <Sliders className="w-5 h-5 shrink-0" />,
    },
    {
      id: "ORBITAL_AUDIT",
      label: "05 ORBITAL & AUDIT VAULT",
      icon: <Compass className="w-5 h-5 shrink-0" />,
    },
  ];

  return (
    <aside className="w-[285px] shrink-0 border-r border-[var(--border-primary)] bg-[var(--surface-panel)] flex flex-col justify-start gap-3.5 p-4 z-20 select-none backdrop-blur-xl overflow-y-auto">
      {/* 1. BRAND & OFFICIAL LOGO HEADER (CLEAN & UNCLUTTERED) */}
      <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="w-11 h-11 rounded-lg border-2 border-[var(--border-primary)] overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">
          <img
            src="/chiron_logo_square.png"
            alt="CHIRON Official Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[23px] font-black font-mono tracking-wider text-[var(--ink-primary)] leading-none">
            CHIRON
          </span>
          <span className="text-[12px] font-mono font-extrabold text-[var(--accent-info)] tracking-tight mt-1">
            AEROSPACE HEALTH OS
          </span>
        </div>
      </div>

      {onReturnToHero && (
        <button
          onClick={onReturnToHero}
          className="w-full py-2 px-3 text-[12px] font-mono font-bold flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-primary)] hover:border-cyan-400 bg-[var(--surface-base)] hover:bg-[var(--surface-active)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-all shadow-sm"
          title="Return to Hero Section"
        >
          <span>← MISSION BRIEFING / HERO</span>
        </button>
      )}

      {/* 2. SECTION 1: FLIGHT DECK MODULE NAVIGATION */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1 mb-0.5">
          <span className="text-[13px] font-mono font-black text-[var(--ink-secondary)] uppercase tracking-wider">
            MODULE NAVIGATION
          </span>
          <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded bg-[var(--surface-active)] text-[var(--accent-info)]">
            5 MODES
          </span>
        </div>

        {viewFilters.map((vf) => {
          const isActive = activeView === vf.id;
          return (
            <button
              key={vf.id}
              onClick={() => onViewChange(vf.id)}
              className={`w-full px-3.5 py-2.5 text-[14px] font-mono font-bold flex items-center justify-between transition-all rounded-lg border ${
                isActive
                  ? "bg-[var(--surface-active)] text-[var(--accent-active)] border-[var(--accent-info)] glow-refract-cyan shadow-sm"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-base)] border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {vf.icon}
                <span className="tracking-tight">{vf.label}</span>
              </div>
              {isActive && <ChevronRight className="w-4.5 h-4.5 text-[var(--accent-active)]" />}
            </button>
          );
        })}
      </div>

      {/* 3. SECTION 2: CREW BIOMETRIC ROSTER (4 Astronauts) */}
      <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between px-1 mb-0.5">
          <span className="text-[13px] font-mono font-black text-[var(--ink-secondary)] uppercase tracking-wider">
            CREW BIOMETRIC ROSTER
          </span>
          <span className="text-[11.5px] font-mono font-black text-[var(--ink-tertiary)]">
            ARI SCORE
          </span>
        </div>

        {crewList.map((crew) => {
          const isSelected = activeCrew === crew.id;
          return (
            <button
              key={crew.id}
              onClick={() => onCrewChange(crew.id)}
              className={`w-full p-2.5 text-left font-mono rounded-lg border transition-all flex items-center justify-between ${
                isSelected
                  ? `bg-[var(--surface-active)] text-[var(--ink-primary)] border-[var(--accent-info)] ${crew.glowClass} shadow-sm`
                  : "bg-[var(--surface-base)] hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border-[var(--border-subtle)]"
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: crew.statusColor,
                      boxShadow: `0 0 8px ${crew.statusColor}`,
                    }}
                  />
                  <span className="text-[15px] font-black text-[var(--ink-primary)]">
                    {crew.id}
                  </span>
                </div>
                <span className="text-[12px] text-[var(--ink-tertiary)] font-bold ml-4.5">
                  {crew.role}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[20px] font-black leading-tight" style={{ color: crew.statusColor }}>
                  {crew.ari}
                </span>
                <span
                  className="text-[10.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
                  style={{
                    color: crew.statusColor,
                    backgroundColor: `rgba(${
                      crew.ari < 50
                        ? "var(--accent-crit-rgb)"
                        : crew.ari < 75
                        ? "var(--accent-warn-rgb)"
                        : "var(--accent-ok-rgb)"
                    }, 0.16)`,
                  }}
                >
                  {crew.statusText}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. SECTION 3: HABITAT & CABIN AIR QUICK READOUT */}
      <div className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-mono font-black text-[var(--ink-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-[var(--accent-info)]" />
            CABIN ATMOSPHERE
          </span>
          <span className="text-[10.5px] font-mono font-black text-[var(--accent-ok)] bg-emerald-500/15 px-2 py-0.5 rounded">
            NOMINAL
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
          <div className="flex flex-col">
            <span className="text-[11px] text-[var(--ink-tertiary)] font-bold">ppCO2</span>
            <span className="text-[15px] font-black text-[var(--ink-primary)]">1.8 mmHg</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-[var(--ink-tertiary)] font-bold">Cabin O2</span>
            <span className="text-[15px] font-black text-[var(--ink-primary)]">20.9%</span>
          </div>
        </div>
      </div>

      {/* 5. SECTION 4: TELEMETRY UPLINK MODE */}
      <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-mono font-black text-[var(--ink-secondary)] uppercase tracking-wider">
            TELEMETRY UPLINK
          </span>
          <span className="text-[11px] font-mono font-bold text-[var(--ink-tertiary)]">
            {airGapOffline ? "AUTONOMOUS" : "EARTH SYNC"}
          </span>
        </div>

        <button
          onClick={() => onAirGapToggle(!airGapOffline)}
          className={`w-full py-2.5 px-3 text-[13.5px] font-mono font-black flex items-center justify-center gap-2 rounded-lg border transition-all ${
            airGapOffline
              ? "bg-red-500/15 text-[var(--accent-crit)] border-[var(--accent-crit)] glow-refract-crimson"
              : "bg-emerald-500/15 text-[var(--accent-ok)] border-[var(--accent-ok)] glow-refract-teal"
          }`}
        >
          {airGapOffline ? <WifiOff className="w-4.5 h-4.5" /> : <Radio className="w-4.5 h-4.5" />}
          <span>{airGapOffline ? "AIR-GAP OFFLINE (MARS)" : "ONLINE HYBRID (0.4s)"}</span>
        </button>
      </div>

      {/* 6. SECTION 5: 3-THEME HARDWARE SWITCHER */}
      <div className="flex flex-col gap-1.5 pt-1">
        <span className="text-[12px] font-mono font-black text-[var(--ink-secondary)] uppercase tracking-wider px-1">
          DISPLAY THEME
        </span>
        <div className="flex gap-1.5 p-1 bg-[var(--surface-base)] rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => onThemeChange("orbital-daylight")}
            className={`flex-1 py-1.5 text-[12.5px] font-mono font-black flex items-center justify-center gap-1.5 rounded transition-all ${
              activeTheme === "orbital-daylight"
                ? "bg-white text-[var(--accent-active)] border border-[var(--accent-info)] shadow-sm font-black"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            }`}
            title="Orbital Ceramic Daylight (Default Light)"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            LIGHT
          </button>
          <button
            onClick={() => onThemeChange("deep-space")}
            className={`flex-1 py-1.5 text-[12.5px] font-mono font-bold flex items-center justify-center gap-1.5 rounded transition-all ${
              activeTheme === "deep-space"
                ? "bg-slate-900 text-white border border-[var(--accent-info)] shadow-sm font-black"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            }`}
            title="Deep-Space Obsidian Glass (Dark)"
          >
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
            DARK
          </button>
          <button
            onClick={() => onThemeChange("circadian-red")}
            className={`flex-1 py-1.5 text-[12.5px] font-mono font-bold flex items-center justify-center gap-1.5 rounded transition-all ${
              activeTheme === "circadian-red"
                ? "bg-[var(--accent-crit)] text-white shadow-sm font-black"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            }`}
            title="Circadian Red-Shift Emergency"
          >
            <Flame className="w-3.5 h-3.5 text-rose-300" />
            RED
          </button>
        </div>
      </div>
    </aside>
  );
}

export default LeftTacticalNav;
