// ---------------------------------------------------------------------------
// CHIRON v4.0 - Main Application Entrypoint
// Autonomous Spaceflight Health Decision & Return-Window Dashboard OS.
// Responsive 12-Column Bento Command Dashboard with 250px Left Tactical Dock,
// Sticky Glassmorphic Top Mission Header, Deep-Space Obsidian Glass default theme,
// Continuous 60fps animations, Indian Female Voice AI, and zero clipping.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { HeroLandingSection } from "./components/hero/HeroLandingSection";
import LeftTacticalNav, {
  type DashboardView,
  type CrewMember,
} from "./components/panels/LeftTacticalNav";
import { TopMissionHeader } from "./components/panels/TopMissionHeader";
import { ExecutiveSummaryRibbon } from "./components/panels/ExecutiveSummaryRibbon";
import { LiveAIDetectionRadar } from "./components/panels/LiveAIDetectionRadar";
import { LayeredAnatomicalAtlas } from "./components/canvas/LayeredAnatomicalAtlas";
import VoiceBiomarkerCore from "./components/panels/VoiceBiomarkerCore";
import ConformalTrajectoryChart from "./components/panels/ConformalTrajectoryChart";
import { VoIExamPlanner } from "./components/panels/VoIExamPlanner";
import { OrbitalCohortPanel } from "./components/panels/OrbitalCohortPanel";
import { BuddyCareAuditPanel } from "./components/panels/BuddyCareAuditPanel";
import { IncapacitationOverlay } from "./components/panels/IncapacitationOverlay";
import type { ThemeId } from "./components/ui/ThemeSelector";
import type { ScenarioId } from "./components/panels/CommandRibbon";
import { useChironAPI, type AxisScore, type OrbitalWindow } from "./hooks/useChironAPI";
import { Layers, Activity, Maximize2, LayoutGrid } from "lucide-react";

export function App() {
  // Navigation: Full-Screen Hero Landing vs Mission Command Dashboard
  const [inDashboard, setInDashboard] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        window.location.search.includes("dashboard") ||
        window.location.hash.includes("dashboard")
      );
    }
    return false;
  });

  // Theme state: Default Startup Theme is Orbital Ceramic Daylight (Light Theme)
  const [activeTheme, setActiveTheme] = useState<ThemeId>("orbital-daylight");

  // Tactical Dashboard View Mode (5 Views)
  const [activeView, setActiveView] = useState<DashboardView>("ALL_IN_ONE");

  // Crew & Scenario state
  const [activeCrew, setActiveCrew] = useState<CrewMember>("CDR. VANCE");
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("A");
  const [airGapOffline, setAirGapOffline] = useState<boolean>(false);

  // Selected Axis for cross-panel inspection
  const [selectedAxisId, setSelectedAxisId] = useState<string | null>(null);

  // Sensor Dropout Simulation state
  const [sensorDropoutActive, setSensorDropoutActive] = useState<boolean>(false);

  // Emergency Buddy-Care Incapacitation state
  const [incapacitationActive, setIncapacitationActive] = useState<boolean>(false);

  // Counterfactual simulation state
  const [counterfactualActive, setCounterfactualActive] = useState<boolean>(false);

  // Backend API & Telemetry Hook
  const { twinState, fetchTwinState, submitCommand } = useChironAPI();

  // Apply theme data attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
  }, [activeTheme]);

  // Handle Scenario switching
  const handleScenarioChange = useCallback(
    async (scenarioId: ScenarioId) => {
      setActiveScenario(scenarioId);
      if (scenarioId === "C") {
        setIncapacitationActive(true);
        setActiveTheme("circadian-red");
        setActiveCrew("CMO. PATEL");
      } else if (scenarioId === "B") {
        setIncapacitationActive(false);
        setSensorDropoutActive(false);
      } else {
        setIncapacitationActive(false);
        setSensorDropoutActive(true); // Scenario A showcases SANS edema + wrist dropout
      }
      try {
        await submitCommand("load_scenario", { scenario_id: `SCENARIO_${scenarioId}` });
      } catch (e) {
        // Safe fallback for offline mode
      }
    },
    [submitCommand]
  );

  // Toggle Sensor Dropout Simulation
  const handleToggleDropout = useCallback(() => {
    setSensorDropoutActive((prev) => !prev);
  }, []);

  // Compute live headline ARI score
  const liveAriScore = useMemo(() => {
    if (activeScenario === "C") return 34.2;
    if (activeScenario === "B") return 62.8;
    if (sensorDropoutActive) return 54.0;
    if (counterfactualActive) return 78.5;
    return twinState?.ari_score ?? 68.4;
  }, [activeScenario, sensorDropoutActive, counterfactualActive, twinState]);

  // Map 7 Physiological Axes
  const currentAxes: AxisScore[] = useMemo(() => {
    if (twinState?.axes && twinState.axes.length > 0) {
      return twinState.axes;
    }
    return [
      {
        axis_id: "cardio",
        label: "Cardiovascular / Aortic Arch",
        score: activeScenario === "C" ? 34.0 : 78.0,
        provenance: "DERIVED",
        confidence_interval: activeScenario === "C" ? [28.0, 42.0] : [72.0, 84.0],
        updated_at: new Date().toISOString(),
      },
      {
        axis_id: "neuro",
        label: "Neuro-Ocular SANS / ONSD",
        score: activeScenario === "A" ? 58.0 : activeScenario === "B" ? 56.0 : 79.0,
        provenance: activeScenario === "A" || sensorDropoutActive ? "ABSTAIN" : "DERIVED",
        confidence_interval: sensorDropoutActive ? [38.0, 88.0] : [52.0, 84.0],
        updated_at: new Date().toISOString(),
      },
      {
        axis_id: "bone",
        label: "Musculoskeletal BMD & Spine",
        score: 82.0,
        provenance: "DERIVED",
        confidence_interval: [78.0, 86.0],
        updated_at: new Date().toISOString(),
      },
      {
        axis_id: "sleep",
        label: "Sleep & Circadian Phase",
        score: activeScenario === "B" ? 64.0 : 78.0,
        provenance: "DERIVED",
        confidence_interval: [62.0, 76.0],
        updated_at: new Date().toISOString(),
      },
      {
        axis_id: "immune",
        label: "Immune & Hematologic Marrow",
        score: activeScenario === "B" ? 52.0 : 78.0,
        provenance: "REAL",
        confidence_interval: activeScenario === "B" ? [44.0, 60.0] : [72.0, 84.0],
        updated_at: new Date().toISOString(),
      },
      {
        axis_id: "behav",
        label: "Behavioral & Vocal Stability",
        score: activeScenario === "C" ? 38.0 : 78.0,
        provenance: "DERIVED",
        confidence_interval: [68.0, 84.0],
        updated_at: new Date().toISOString(),
      },
      {
        axis_id: "rad",
        label: "Radiation Cumulative Burden",
        score: activeScenario === "B" ? 46.0 : 85.0,
        provenance: "REAL",
        confidence_interval: activeScenario === "B" ? [40.0, 52.0] : [80.0, 90.0],
        updated_at: new Date().toISOString(),
      },
    ];
  }, [twinState, activeScenario, sensorDropoutActive]);

  // Orbital Window
  const orbitalWindow: OrbitalWindow = useMemo(() => {
    return (
      twinState?.orbital_window || {
        t_crit_hours: activeScenario === "C" ? 18.5 : activeScenario === "B" ? 25.4 : 48.2,
        t_evac_hours: 14.0,
        t_margin_hours: activeScenario === "C" ? 4.5 : activeScenario === "B" ? 11.4 : 34.2,
        window_status: activeScenario === "C" ? "CRITICAL" : activeScenario === "B" ? "NARROWING" : "OPEN",
        trajectory_type: activeScenario === "B" ? "LUNAR_NRHO" : activeScenario === "C" ? "MARS_TRANSIT" : "LEO",
        delta_v_budget_mps: 120.0,
        reentry_site: "Gulf of Mexico Recovery Zone",
      }
    );
  }, [twinState, activeScenario]);

  // Voice transcript handler with multi-modal intent routing
  const handleVoiceTranscript = useCallback((text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("all") || lower.includes("overview") || lower.includes("command")) {
      setActiveView("ALL_IN_ONE");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (lower.includes("cohort") || lower.includes("matrix") || lower.includes("orbital") || lower.includes("horizon") || lower.includes("audit") || lower.includes("return window")) {
      setActiveView("ORBITAL_AUDIT");
      document.getElementById("row-4-orbital")?.scrollIntoView({ behavior: "smooth" });
    } else if (lower.includes("anatom") || lower.includes("twin") || lower.includes("body") || lower.includes("organ")) {
      setActiveView("ANATOMICAL");
      document.getElementById("row-2-anatomy")?.scrollIntoView({ behavior: "smooth" });
    } else if (lower.includes("voice") || lower.includes("mic") || lower.includes("biomarker") || lower.includes("dsp")) {
      setActiveView("VOICE_DSP");
      document.getElementById("row-2-voice")?.scrollIntoView({ behavior: "smooth" });
    } else if (lower.includes("simulate") || lower.includes("counterfactual") || lower.includes("voi") || lower.includes("exam") || lower.includes("scrub") || lower.includes("ared")) {
      setActiveView("VOI_SIMULATOR");
      setCounterfactualActive(true);
      document.getElementById("row-3-voi")?.scrollIntoView({ behavior: "smooth" });
    } else if (lower.includes("cmo is down") || lower.includes("incapacitation") || lower.includes("doctor down")) {
      setIncapacitationActive(true);
      setActiveTheme("circadian-red");
      setActiveScenario("C");
      setActiveCrew("CMO. PATEL");
    }
  }, []);

  const handleSimulateCounterfactual = useCallback((cm: any) => {
    setCounterfactualActive(true);
  }, []);

  const handleLogMeasurement = useCallback(
    async (axis: string, value: number, procId: string) => {
      if (procId === "PROC_POCUS_ONSD" || procId === "M3_OCULAR_POCUS") {
        setSensorDropoutActive(false);
      }
      try {
        await submitCommand("log_observation", {
          axis,
          value,
          measurement_type: procId,
          crew_id: activeCrew.replace(". ", "_"),
        });
        await fetchTwinState();
      } catch (e) {
        // Safe offline handling
      }
    },
    [submitCommand, activeCrew, fetchTwinState]
  );

  if (!inDashboard) {
    return <HeroLandingSection onLaunch={() => setInDashboard(true)} />;
  }

  return (
    <div className="flex w-full min-h-screen overflow-x-hidden bg-[var(--surface-canvas)] text-[var(--ink-primary)] select-none">
      {/* 1. LEFT TACTICAL NAVIGATION DOCK (250px fixed on desktop) */}
      <LeftTacticalNav
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          if (view === "ALL_IN_ONE") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else if (view === "ANATOMICAL") {
            document.getElementById("row-2-anatomy")?.scrollIntoView({ behavior: "smooth" });
          } else if (view === "VOICE_DSP") {
            document.getElementById("row-2-voice")?.scrollIntoView({ behavior: "smooth" });
          } else if (view === "VOI_SIMULATOR") {
            document.getElementById("row-3-voi")?.scrollIntoView({ behavior: "smooth" });
          } else if (view === "ORBITAL_AUDIT") {
            document.getElementById("row-4-orbital")?.scrollIntoView({ behavior: "smooth" });
          }
        }}
        activeCrew={activeCrew}
        onCrewChange={setActiveCrew}
        airGapOffline={airGapOffline}
        onAirGapToggle={setAirGapOffline}
        activeTheme={activeTheme}
        onThemeChange={setActiveTheme}
        activeScenario={activeScenario}
        onReturnToHero={() => setInDashboard(false)}
      />

      {/* 2. MAIN WORKSPACE WITH STICKY TOP HEADER & BENTO GRID */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Mission Header (min-height: 68px, flex-wrap: wrap, zero clipping) */}
        <TopMissionHeader
          activeScenario={activeScenario}
          onScenarioChange={handleScenarioChange}
          onIncapacitation={() => {
            setIncapacitationActive(true);
            setActiveTheme("circadian-red");
            setActiveScenario("C");
            setActiveCrew("CMO. PATEL");
          }}
          orbitName={
            activeScenario === "B"
              ? "ARTEMIS II NRHO / CIS-LUNAR"
              : activeScenario === "C"
              ? "MARS TRANSIT HABITAT"
              : "CREW-11 ISS LOW EARTH ORBIT"
          }
          onReturnToHero={() => setInDashboard(false)}
        />

        {/* View Isolation Banner (if not ALL_IN_ONE, provides instant return to All-In-One) */}
        {activeView !== "ALL_IN_ONE" && (
          <div className="px-6 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-active)] border border-[var(--accent-info)] glow-refract-cyan">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-info)] animate-pulse" />
              <span className="text-xs font-mono font-bold text-[var(--accent-active)] uppercase tracking-wider">
                FOCUSED VIEW: {activeView.replace("_", " ")}
              </span>
            </div>
            <button
              onClick={() => setActiveView("ALL_IN_ONE")}
              className="px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 rounded-lg border border-[var(--border-primary)] hover:border-[var(--accent-info)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] bg-black/20 hover:bg-white/5 transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[var(--accent-active)]" />
              <span>RETURN TO ALL-IN-ONE COMMAND DASHBOARD</span>
            </button>
          </div>
        )}

        {/* BENTO DASHBOARD CONTAINER (Spacious gap, smooth vertical scroll, zero clipping) */}
        <main className="p-4 lg:p-6 flex flex-col gap-8 w-full max-w-[1920px] mx-auto">
          {/* ROW 1: EXECUTIVE PATIENT VITAL & HABITAT TELEMETRY RIBBON (4 Cards) */}
          <section id="row-1-executive" className="w-full">
            <ExecutiveSummaryRibbon
              ariScore={liveAriScore}
              activeScenario={activeScenario}
              sensorDropoutActive={sensorDropoutActive}
              orbitalWindow={orbitalWindow}
              activeCrewName={activeCrew}
            />
          </section>

          {/* LIVE CLINICAL AI ANOMALY DETECTIONS & PREDICTIVE RADAR */}
          {(activeView === "ALL_IN_ONE" || activeView === "ANATOMICAL") && (
            <section id="row-radar" className="w-full">
              <LiveAIDetectionRadar
                activeScenario={activeScenario}
                activeCrewName={activeCrew}
                onDispatchCountermeasure={async (cmd, sigId) => {
                  try {
                    await submitCommand("dispatch_countermeasure", {
                      command: cmd,
                      signal_id: sigId,
                      crew_id: activeCrew.replace(". ", "_"),
                    });
                  } catch (e) {}
                }}
              />
            </section>
          )}

          {/* ROW 2: 3D HOLOGRAPHIC ANATOMICAL ATLAS (col-span-8) + VOICE AI & VOCAL BIOMARKER STUDIO (col-span-4) */}
          {(activeView === "ALL_IN_ONE" || activeView === "ANATOMICAL" || activeView === "VOICE_DSP") && (
            <section
              id="row-2-anatomy"
              className={`grid grid-cols-1 ${
                activeView === "ANATOMICAL"
                  ? "grid-cols-1"
                  : activeView === "VOICE_DSP"
                  ? "grid-cols-1"
                  : "xl:grid-cols-12"
              } gap-6 w-full items-start`}
            >
              {(activeView === "ALL_IN_ONE" || activeView === "ANATOMICAL") && (
                <div
                  className={`${
                    activeView === "ANATOMICAL" ? "w-full" : "xl:col-span-8 w-full"
                  }`}
                >
                  <LayeredAnatomicalAtlas
                    axes={currentAxes}
                    selectedAxisId={selectedAxisId}
                    onAxisSelect={setSelectedAxisId}
                    themeId={activeTheme}
                  />
                </div>
              )}

              {(activeView === "ALL_IN_ONE" || activeView === "VOICE_DSP") && (
                <div
                  id="row-2-voice"
                  className={`${
                    activeView === "VOICE_DSP" ? "w-full" : "xl:col-span-4 w-full"
                  }`}
                >
                  <VoiceBiomarkerCore
                    onTranscript={handleVoiceTranscript}
                    activeScenario={activeScenario}
                  />
                </div>
              )}
            </section>
          )}

          {/* ROW 3: CONFORMAL TRAJECTORY FAN CHART (col-span-7) + VOI RANKED EXAMS & GUIDED EXAM MODAL (col-span-5) */}
          {(activeView === "ALL_IN_ONE" || activeView === "VOI_SIMULATOR") && (
            <section
              id="row-3-voi"
              className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start"
            >
              <div className="xl:col-span-7 w-full">
                <ConformalTrajectoryChart
                  counterfactualActive={counterfactualActive}
                  onSimulateCounterfactual={handleSimulateCounterfactual}
                  sensorDropoutActive={sensorDropoutActive}
                  onToggleDropout={handleToggleDropout}
                  selectedAxis={selectedAxisId}
                  onSelectAxis={setSelectedAxisId}
                  activeScenario={activeScenario}
                />
              </div>
              <div className="xl:col-span-5 w-full">
                <VoIExamPlanner
                  activeCrewId={activeCrew.replace(". ", "_")}
                  onLogMeasurement={handleLogMeasurement}
                />
              </div>
            </section>
          )}

          {/* ROW 4: 3D ORBITAL TRAJECTORY SIMULATOR & COHORT (col-span-6) + CMO BUDDY-CARE & SHA-256 AUDIT (col-span-6) */}
          {(activeView === "ALL_IN_ONE" || activeView === "ORBITAL_AUDIT") && (
            <section
              id="row-4-orbital"
              className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start"
            >
              <div className="xl:col-span-6 w-full">
                <OrbitalCohortPanel
                  orbitalWindow={orbitalWindow}
                  activeScenario={activeScenario}
                />
              </div>
              <div className="xl:col-span-6 w-full">
                <BuddyCareAuditPanel
                  activeCrewId={activeCrew.replace(". ", "_")}
                  onTriggerBreakGlass={(reason) => {
                    // Triggered
                  }}
                  activeScenario={activeScenario}
                />
              </div>
            </section>
          )}
        </main>
      </div>

      {/* 3. EMERGENCY BUDDY-CARE INCAPACITATION OVERLAY */}
      {incapacitationActive && (
        <IncapacitationOverlay
          onDismiss={() => {
            setIncapacitationActive(false);
            setActiveTheme("orbital-daylight");
          }}
          onVoiceCommand={handleVoiceTranscript}
        />
      )}
    </div>
  );
}

export default App;
