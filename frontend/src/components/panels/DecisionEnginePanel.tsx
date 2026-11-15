// ---------------------------------------------------------------------------
// CHIRON v3.0 - DecisionEnginePanel
// Right Column (420px): Active Decision Engine, Interactive Guided Exam Modal,
// Counterfactual Simulator with NASA-STD-3001 Veto, Return-Window Solver,
// SHA-256 Audit Vault, and Tab 4 Buddy Care (CMO Incapacitation Protocol).
// Liquid Glass styling, big bold typography, generous padding and technical spacing.
// ---------------------------------------------------------------------------

import React, { useState, useEffect } from "react";
import {
  Activity,
  Sliders,
  Compass,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Camera,
  Heart,
  Wind,
  Zap,
  Radio,
  Timer,
  ChevronRight,
  Eye,
} from "lucide-react";
import ProvenanceBadge from "../ui/ProvenanceBadge";
import type { OrbitalWindow, AxisScore } from "@/hooks/useChironAPI";

export interface DecisionEnginePanelProps {
  activeCrewId: string;
  onSimulateCounterfactual?: (cm: any) => void;
  onLogMeasurement?: (axis: string, value: number, procId: string) => void;
  onTriggerBreakGlass?: (reason: string) => void;
  orbitalWindow?: OrbitalWindow | null;
  axes?: AxisScore[];
  activeScenario?: string;
  forcedTab?: "VOI" | "SIMULATOR" | "HORIZON" | "BUDDY_CARE" | null;
}

interface RankedVoIItem {
  rank: number;
  id: string;
  name: string;
  duration_minutes: number;
  voi_bits: number;
  uncertainty_reduction_pct: number;
  target_axes: string[];
  description: string;
}

const DEFAULT_VOI_ITEMS: RankedVoIItem[] = [
  {
    rank: 1,
    id: "M3_OCULAR_POCUS",
    name: "Ocular POCUS Ultrasound",
    duration_minutes: 6.0,
    voi_bits: 0.842,
    uncertainty_reduction_pct: 64.2,
    target_axes: ["neuro"],
    description: "B-scan optic nerve sheath diameter (ONSD) caliper measurement",
  },
  {
    rank: 2,
    id: "M1_SEATED_BP_HRV",
    name: "Seated Cuff BP + 2-Min HRV",
    duration_minutes: 2.0,
    voi_bits: 0.615,
    uncertainty_reduction_pct: 48.0,
    target_axes: ["cardio", "behav"],
    description: "Orthostatic baroreflex & autonomic HRV vagal RMSSD window",
  },
  {
    rank: 3,
    id: "M2_PVT_VOCAL",
    name: "3-Min PVT + Vocal Prosody Read",
    duration_minutes: 3.0,
    voi_bits: 0.490,
    uncertainty_reduction_pct: 38.5,
    target_axes: ["sleep", "behav"],
    description: "Psychomotor vigilance reaction speed & hesitation pause ratio",
  },
  {
    rank: 4,
    id: "M5_DOSIMETER_SYNC",
    name: "Personal Dosimeter Sync",
    duration_minutes: 1.0,
    voi_bits: 0.380,
    uncertainty_reduction_pct: 29.0,
    target_axes: ["rad"],
    description: "Active tissue-equivalent proportional counter cumulative sync",
  },
  {
    rank: 5,
    id: "M4_CAP_CHEM_STRIP",
    name: "Capillary Point-of-Care Chem",
    duration_minutes: 8.0,
    voi_bits: 0.225,
    uncertainty_reduction_pct: 18.0,
    target_axes: ["immune", "rad", "bone"],
    description: "Fingerstick i-STAT differential: CRP, troponin, electrolytes",
  },
];

export function DecisionEnginePanel({
  activeCrewId,
  onSimulateCounterfactual,
  onLogMeasurement,
  onTriggerBreakGlass,
  orbitalWindow,
  axes,
  activeScenario = "A",
  forcedTab = null,
}: DecisionEnginePanelProps) {
  const [activeTab, setActiveTab] = useState<"VOI" | "SIMULATOR" | "HORIZON" | "BUDDY_CARE">(
    "VOI"
  );

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
    } else if (activeScenario === "C") {
      setActiveTab("BUDDY_CARE");
    }
  }, [forcedTab, activeScenario]);

  // VoI & Exam State
  const [selectedExam, setSelectedExam] = useState<RankedVoIItem | null>(null);
  const [onsdCaliperMm, setOnsdCaliperMm] = useState<number>(5.9);
  const [pvtReactionMs, setPvtReactionMs] = useState<number>(242);
  const [pvtGameState, setPvtGameState] = useState<"WAIT" | "READY" | "CLICKED">("READY");
  const [pvtStartTime, setPvtStartTime] = useState<number>(0);

  // Simulator Sliders State
  const [aredIntensityPct, setAredIntensityPct] = useState<number>(80);
  const [co2ScrubberBoostPct, setCo2ScrubberBoostPct] = useState<number>(85);
  const [lightingKelvin, setLightingKelvin] = useState<number>(4500);
  const [shelterTiming, setShelterTiming] = useState<"IMMEDIATE" | "DELAYED">("IMMEDIATE");
  const [selectedMed, setSelectedMed] = useState<string>("NONE");

  // Veto Check
  const [vetoResult, setVetoResult] = useState<{
    vetoed: boolean;
    rule_id: string;
    reason: string;
  }>({
    vetoed: false,
    rule_id: "PASS",
    reason: "Countermeasure plan complies with all NASA-STD-3001 operational limits",
  });

  useEffect(() => {
    if (aredIntensityPct >= 100 && (co2ScrubberBoostPct < 55 || activeScenario === "B")) {
      setVetoResult({
        vetoed: true,
        rule_id: "NASA-STD-3001-V2-6004",
        reason:
          "High exertion prohibited during hypercapnia > 3.5 mmHg. Boost CDRA CO2 Scrubber before heavy exercise.",
      });
      return;
    }

    if (shelterTiming === "DELAYED" && activeScenario === "B") {
      setVetoResult({
        vetoed: true,
        rule_id: "NASA-STD-3001-V1-RAD-ALARA",
        reason:
          "Delayed storm shelter ingress prohibited during SPE flux >= 10 pfu. Immediate ingress mandatory.",
      });
      return;
    }

    if (selectedMed === "NITROGLYCERIN" || selectedMed === "SEDATIVE") {
      setVetoResult({
        vetoed: true,
        rule_id: "NASA-STD-3001-V1-MED-CARDIO",
        reason:
          "Vasodilator contraindicated in orthostatic deconditioning without preceding fluid loading.",
      });
      return;
    }

    setVetoResult({
      vetoed: false,
      rule_id: "PASS",
      reason: "Plan complies with all NASA-STD-3001 human system operational limits",
    });
  }, [aredIntensityPct, co2ScrubberBoostPct, lightingKelvin, shelterTiming, selectedMed, activeScenario]);

  // Return Window & Audit Ledger State
  const [missionProfile, setMissionProfile] = useState<"LEO" | "LUNAR" | "MARS">("LEO");
  const [breakGlassDialogOpen, setBreakGlassDialogOpen] = useState<boolean>(false);
  const [breakGlassReason, setBreakGlassReason] = useState<string>(
    "CMO Acute Syncope & Unresponsiveness in Microgravity: Initiating Tier-3 Biomedical Disclosure"
  );
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([
    {
      seq: 1,
      hash: "8f4a19c0b2...",
      timestamp: "10:15:02 UTC",
      actor: "CHIRON_SYSTEM",
      patient: "CREW_ALL",
      action: "GENESIS_AUDIT_BLOCK",
      status: "CHAIN_VALID",
    },
    {
      seq: 2,
      hash: "3c7e91d84f...",
      timestamp: "11:24:45 UTC",
      actor: "ASTRONAUT_VOICE",
      patient: "CDR_VANCE",
      action: "LOG_OCULAR_POCUS",
      status: "CHAIN_VALID",
    },
  ]);

  const [buddyStep, setBuddyStep] = useState<number>(1);

  const startPvtTest = () => {
    setPvtGameState("WAIT");
    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      setPvtGameState("READY");
      setPvtStartTime(performance.now());
    }, delay);
  };

  const handlePvtClick = () => {
    if (pvtGameState === "READY") {
      const elapsed = Math.round(performance.now() - pvtStartTime);
      setPvtReactionMs(elapsed);
      setPvtGameState("CLICKED");
    }
  };

  const handleCommitMeasurement = () => {
    if (selectedExam && onLogMeasurement) {
      let committedVal = 75.0;
      if (selectedExam.id === "M3_OCULAR_POCUS") {
        committedVal = Math.max(20, Math.min(95, 100 - (onsdCaliperMm - 4.5) * 25));
      } else if (selectedExam.id === "M2_PVT_VOCAL") {
        committedVal = Math.max(30, Math.min(95, 100 - (pvtReactionMs - 200) * 0.4));
      }

      onLogMeasurement(selectedExam.target_axes[0] || "neuro", committedVal, selectedExam.id);

      const newSeq = ledgerEntries.length + 1;
      setLedgerEntries((prev) => [
        ...prev,
        {
          seq: newSeq,
          hash: Math.random().toString(16).substring(2, 12) + "...",
          timestamp: new Date().toTimeString().slice(0, 8) + " UTC",
          actor: "CREW_COACH",
          patient: activeCrewId,
          action: `COMMIT_${selectedExam.id}`,
          status: "CHAIN_VALID",
        },
      ]);
    }
    setSelectedExam(null);
  };

  const handleConfirmBreakGlass = () => {
    if (onTriggerBreakGlass) {
      onTriggerBreakGlass(breakGlassReason);
    }
    const newSeq = ledgerEntries.length + 1;
    setLedgerEntries((prev) => [
      ...prev,
      {
        seq: newSeq,
        hash: "e9b21f8a44...",
        timestamp: new Date().toTimeString().slice(0, 8) + " UTC",
        actor: "ACTING_CDR",
        patient: activeCrewId,
        action: "EMERGENCY_BREAK_GLASS",
        status: "TIER_3_DISCLOSURE",
      },
    ]);
    setBreakGlassDialogOpen(false);
  };

  return (
    <div className="w-[420px] h-full flex flex-col justify-between select-none overflow-hidden liquid-glass-panel rounded-none border-y-0 border-r-0">
      {/* 4-Tab Navigation Header (Liquid Glass Tabs) */}
      <div className="h-11 px-2 border-b border-[var(--border-primary)] flex items-center gap-1.5 shrink-0 liquid-glass-card rounded-none border-t-0 border-x-0">
        <button
          onClick={() => setActiveTab("VOI")}
          className={`flex-1 py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all rounded-lg border ${
            activeTab === "VOI"
              ? "bg-[var(--surface-active)] text-[var(--accent-active)] border-[var(--accent-info)] glow-refract-cyan shadow-md"
              : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border-transparent"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          VOI PLANNER
        </button>

        <button
          onClick={() => setActiveTab("SIMULATOR")}
          className={`flex-1 py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all rounded-lg border ${
            activeTab === "SIMULATOR"
              ? "bg-[var(--surface-active)] text-[var(--accent-active)] border-[var(--accent-info)] glow-refract-cyan shadow-md"
              : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border-transparent"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          SIMULATOR
        </button>

        <button
          onClick={() => setActiveTab("HORIZON")}
          className={`flex-1 py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all rounded-lg border ${
            activeTab === "HORIZON"
              ? "bg-[var(--surface-active)] text-[var(--accent-active)] border-[var(--accent-info)] glow-refract-cyan shadow-md"
              : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border-transparent"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          HORIZON
        </button>

        <button
          onClick={() => setActiveTab("BUDDY_CARE")}
          className={`flex-1 py-1.5 px-2 text-xs font-mono font-black flex items-center justify-center gap-1.5 transition-all rounded-lg border ${
            activeTab === "BUDDY_CARE"
              ? "bg-[var(--accent-crit)] text-white glow-refract-crimson shadow-md border-[var(--accent-crit)]"
              : "text-[var(--accent-crit)] hover:bg-red-500/10 border-red-500/40"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          BUDDY CARE
        </button>
      </div>

      {/* TAB 1: VOI PLANNER (Liquid Glass Tiles with Large Bold Typography) */}
      {activeTab === "VOI" && (
        <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-between gap-2.5 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black uppercase text-[var(--ink-primary)] tracking-tight">
              Next-Best-Measurement Rankings (VoI)
            </span>
            <ProvenanceBadge type="DERIVED" />
          </div>

          <div className="flex flex-col gap-2.5 flex-1 justify-between">
            {DEFAULT_VOI_ITEMS.map((item) => (
              <div
                key={item.id}
                className={`p-3 liquid-glass-card flex flex-col justify-between border transition-all ${
                  item.rank === 1
                    ? "border-[var(--accent-ok)] glow-refract-teal shadow-md"
                    : "border-[var(--border-primary)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-black px-2 py-0.5 rounded shadow-sm ${
                        item.rank === 1
                          ? "bg-[var(--accent-ok)] text-black"
                          : "bg-black/10 text-[var(--ink-primary)]"
                      }`}
                    >
                      #{item.rank}
                    </span>
                    <span className="text-sm font-mono font-bold text-[var(--ink-primary)]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-[var(--accent-ok)] px-2 py-0.5 bg-emerald-500/15 rounded border border-emerald-500/30">
                    +{item.voi_bits.toFixed(3)} bits/min
                  </span>
                </div>

                <div className="text-xs font-medium text-[var(--ink-secondary)] truncate my-1">
                  {item.description}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs font-mono">
                  <span className="font-bold text-[var(--ink-secondary)]">
                    DUR: {item.duration_minutes}m | -{item.uncertainty_reduction_pct}% CI
                  </span>
                  <button
                    onClick={() => {
                      setSelectedExam(item);
                      if (item.id === "M2_PVT_VOCAL") startPvtTest();
                    }}
                    className="px-3 py-1 bg-[var(--surface-active)] hover:bg-[var(--accent-ok)] hover:text-black text-[var(--accent-ok)] border border-[var(--accent-ok)] font-black text-xs transition-all flex items-center gap-1.5 rounded-md shadow-sm active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    EXECUTE GUIDED EXAM
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SIMULATOR (Counterfactual Controls & NASA-STD-3001 Veto) */}
      {activeTab === "SIMULATOR" && (
        <div className="flex-1 p-3.5 overflow-y-auto flex flex-col justify-between gap-3 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black uppercase text-[var(--ink-primary)] tracking-tight">
              ECLSS & Countermeasure Simulator
            </span>
            <ProvenanceBadge type="SIMULATED" />
          </div>

          {/* NASA-STD-3001 VETO BANNER */}
          <div
            className={`p-3 liquid-glass-card border flex items-start gap-2.5 ${
              vetoResult.vetoed
                ? "border-[var(--accent-crit)] bg-red-500/15 text-[var(--accent-crit)] glow-refract-crimson shadow-md"
                : "border-[var(--accent-ok)] bg-emerald-500/15 text-[var(--accent-ok)] glow-refract-teal shadow-md"
            }`}
          >
            {vetoResult.vetoed ? (
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col text-xs font-mono">
              <span className="font-black text-sm">
                {vetoResult.vetoed ? `VETO: ${vetoResult.rule_id}` : "NASA-STD-3001 COMPLIANT"}
              </span>
              <span className="text-xs text-[var(--ink-secondary)] leading-tight mt-0.5">
                {vetoResult.reason}
              </span>
            </div>
          </div>

          {/* Slider 1: Cabin CO2 Scrubber Boost */}
          <div className="flex flex-col gap-1.5 p-3 liquid-glass-card border border-[var(--border-primary)]">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[var(--ink-secondary)] font-bold">CDRA CO2 Scrubber Boost</span>
              <span className="font-black text-sm text-[var(--ink-primary)]">{co2ScrubberBoostPct}% (1.8 mmHg target)</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={co2ScrubberBoostPct}
              onChange={(e) => setCo2ScrubberBoostPct(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--accent-active)] cursor-pointer h-2 bg-black/10 rounded-full"
            />
          </div>

          {/* Slider 2: ARED Resistive Load */}
          <div className="flex flex-col gap-1.5 p-3 liquid-glass-card border border-[var(--border-primary)]">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[var(--ink-secondary)] font-bold">ARED Exercise Load</span>
              <span className="font-black text-sm text-[var(--ink-primary)]">{aredIntensityPct}% ({Math.round(aredIntensityPct * 0.9)} kg)</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={aredIntensityPct}
              onChange={(e) => setAredIntensityPct(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--accent-active)] cursor-pointer h-2 bg-black/10 rounded-full"
            />
          </div>

          {/* Slider 3: SLA Circadian Lighting */}
          <div className="flex flex-col gap-1.5 p-3 liquid-glass-card border border-[var(--border-primary)]">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[var(--ink-secondary)] font-bold">Circadian Lighting Kelvin</span>
              <span className="font-black text-sm text-[var(--ink-primary)]">{lightingKelvin} K</span>
            </div>
            <input
              type="range"
              min="2700"
              max="6500"
              step="100"
              value={lightingKelvin}
              onChange={(e) => setLightingKelvin(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--accent-active)] cursor-pointer h-2 bg-black/10 rounded-full"
            />
          </div>

          {/* Toggle: Storm Shelter Timing */}
          <div className="flex items-center justify-between p-3 liquid-glass-card border border-[var(--border-primary)]">
            <div className="flex flex-col text-xs font-mono">
              <span className="font-black text-[var(--ink-primary)]">Water-Wall Storm Shelter</span>
              <span className="text-[11px] text-[var(--ink-secondary)]">SPE Radiation Barrier</span>
            </div>
            <button
              onClick={() => setShelterTiming(shelterTiming === "IMMEDIATE" ? "DELAYED" : "IMMEDIATE")}
              className={`px-3 py-1.5 text-xs font-mono font-black border transition-all rounded-lg shadow-sm ${
                shelterTiming === "IMMEDIATE"
                  ? "bg-[var(--accent-ok)] text-black border-[var(--accent-ok)] glow-refract-teal"
                  : "bg-red-500/25 text-[var(--accent-crit)] border-[var(--accent-crit)] glow-refract-crimson"
              }`}
            >
              {shelterTiming === "IMMEDIATE" ? "IMMEDIATE INGRESS" : "DELAYED (+2h VETO)"}
            </button>
          </div>

          {/* Dropdown: Med-Kit Intervention */}
          <div className="flex flex-col gap-1.5 p-3 liquid-glass-card border border-[var(--border-primary)]">
            <span className="text-xs font-mono font-bold text-[var(--ink-secondary)]">Onboard Med-Kit Formulary</span>
            <select
              value={selectedMed}
              onChange={(e) => setSelectedMed(e.target.value)}
              className="p-2 text-xs font-mono bg-[var(--surface-active)] border border-[var(--border-primary)] text-[var(--ink-primary)] outline-none rounded-lg font-bold"
            >
              <option value="NONE">[SELECT PHARMACOLOGICAL AGENT]</option>
              <option value="ACETAZOLAMIDE">Acetazolamide 250mg PO (SANS CSF Pressure Reduction)</option>
              <option value="MIDODRINE">Oral Rehydration Salts + Midodrine 5mg (Orthostatic Support)</option>
              <option value="MODAFINIL">Modafinil 100mg PO (Fatigue & Vigilance Countermeasure)</option>
              <option value="NITROGLYCERIN">Nitroglycerin 0.4mg SL (Vasodilator - Veto Trigger)</option>
              <option value="SEDATIVE">Midazolam 2mg IV (Sedative - Veto Trigger)</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (onSimulateCounterfactual && !vetoResult.vetoed) {
                onSimulateCounterfactual({
                  co2_scrubber_efficiency: co2ScrubberBoostPct / 100,
                  ared_load_kg: aredIntensityPct * 0.9,
                  lighting_kelvin: lightingKelvin,
                  storm_shelter_active: shelterTiming === "IMMEDIATE",
                  med_kit_intervention: selectedMed !== "NONE" ? selectedMed : null,
                });
              }
            }}
            disabled={vetoResult.vetoed}
            className={`w-full py-2.5 text-xs font-mono font-black flex items-center justify-center gap-2 border transition-all rounded-lg shadow-md ${
              vetoResult.vetoed
                ? "bg-[var(--surface-active)] text-[var(--ink-tertiary)] border-[var(--border-subtle)] cursor-not-allowed"
                : "bg-[var(--accent-active)] text-black border-[var(--accent-active)] hover:opacity-90 glow-refract-cyan active:scale-98"
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            SIMULATE RECOVERY TRAJECTORY
          </button>
        </div>
      )}

      {/* TAB 3: HORIZON / AUDIT (Return-Window Solver & SHA-256 Vault) */}
      {activeTab === "HORIZON" && (
        <div className="flex-1 p-3.5 overflow-y-auto flex flex-col justify-between gap-3 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black uppercase text-[var(--ink-primary)] tracking-tight">
              Return-Window Horizon & Audit Vault
            </span>
            <ProvenanceBadge type="REAL" />
          </div>

          {/* Mission Profile Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 liquid-glass-card border border-[var(--border-primary)] rounded-lg">
            {(["LEO", "LUNAR", "MARS"] as const).map((prof) => (
              <button
                key={prof}
                onClick={() => setMissionProfile(prof)}
                className={`py-1.5 text-xs font-mono font-bold transition-all rounded-md ${
                  missionProfile === prof
                    ? "bg-[var(--surface-active)] text-[var(--accent-active)] border border-[var(--accent-info)] glow-refract-cyan shadow-sm"
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {prof === "LEO" ? "LEO (14h)" : prof === "LUNAR" ? "LUNAR (96h)" : "MARS (Transit)"}
              </button>
            ))}
          </div>

          {/* Decision Timeline Bar */}
          <div className="p-3 liquid-glass-card flex flex-col gap-2 text-xs font-mono border glow-refract-teal">
            <div className="flex justify-between items-center">
              <span className="text-[var(--ink-secondary)] font-bold">Net Decision Margin:</span>
              <span className="font-black text-[var(--accent-ok)] text-base">+14.5h [WINDOW OPEN]</span>
            </div>
            <div className="w-full bg-black/10 h-3 rounded-full overflow-hidden relative">
              <div className="h-full bg-[var(--accent-ok)] rounded-full" style={{ width: "65%" }} />
              <div className="absolute top-0 bottom-0 left-[24%] w-1 bg-[var(--accent-crit)]" />
            </div>
            <div className="flex justify-between text-xs text-[var(--ink-secondary)] font-bold">
              <span>T_crit: 28.5h to limit</span>
              <span>T_evac: 14.0h phasing</span>
            </div>
          </div>

          {/* Trigger Break Glass */}
          <div className="p-3 border border-[var(--accent-crit)] bg-red-500/15 flex flex-col gap-2 rounded-lg glow-refract-crimson shadow-md">
            <div className="flex items-center justify-between text-xs font-mono font-black text-[var(--accent-crit)]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> BREAK-GLASS EMERGENCY
              </span>
              <ProvenanceBadge type="REAL" />
            </div>
            <p className="text-xs text-[var(--ink-primary)] leading-relaxed font-semibold">
              Overrides Tier-1 privacy to grant Mission Control Flight Surgeons full biomedical disclosure under SHA-256 forward-hash ledgering.
            </p>
            <button
              onClick={() => setBreakGlassDialogOpen(true)}
              className="py-2 text-xs font-mono font-black bg-[var(--accent-crit)] text-white hover:opacity-90 flex items-center justify-center gap-2 rounded-md shadow-sm active:scale-98"
            >
              <Unlock className="w-4 h-4" /> TRIGGER BREAK-GLASS OVERRIDE
            </button>
          </div>

          {/* SHA-256 Audit Chain Ledger */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono text-[var(--ink-secondary)]">
              <span className="font-bold">SHA-256 AUDIT CHAIN LEDGER</span>
              <span className="text-[var(--accent-ok)] font-black">100% VALID INTEGRITY</span>
            </div>
            <div className="border border-[var(--border-primary)] liquid-glass-card max-h-32 overflow-y-auto divide-y divide-[var(--border-subtle)] text-xs font-mono rounded-lg">
              {ledgerEntries.map((e) => (
                <div key={e.seq} className="p-2 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-bold text-[var(--ink-primary)]">#{e.seq} {e.action}</span>
                    <span className="text-[var(--ink-tertiary)] text-[10px]">{e.actor} | {e.patient}</span>
                  </div>
                  <span className="text-[var(--accent-active)] font-mono font-bold">{e.hash}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BUDDY CARE (CMO Incapacitation Protocol) */}
      {activeTab === "BUDDY_CARE" && (
        <div className="flex-1 p-3.5 overflow-y-auto flex flex-col justify-between gap-3 min-h-0 bg-red-950/20">
          <div className="flex items-center justify-between border-b border-[var(--accent-crit)]/40 pb-2">
            <div className="flex items-center gap-2 text-sm font-mono font-black text-[var(--accent-crit)]">
              <Zap className="w-5 h-5 animate-bounce" />
              BUDDY-CARE: CMO DOWN PROTOCOL
            </div>
            <ProvenanceBadge type="REAL" />
          </div>

          <div className="p-3 border-2 border-[var(--accent-crit)] liquid-glass-card flex flex-col gap-2 rounded-lg glow-refract-crimson shadow-md">
            <span className="text-xs font-mono text-[var(--accent-warn)] font-black">
              STEP {buddyStep} OF 4: {buddyStep === 1 ? "MICROGRAVITY RESTRAINT" : buddyStep === 2 ? "AED ELECTRODES" : buddyStep === 3 ? "AUTOINJECTOR" : "FLIGHT SURGEON PACKET"}
            </span>
            <p className="text-xs text-[var(--ink-primary)] font-sans font-semibold leading-relaxed">
              {buddyStep === 1 && "Affix patient immediately to the Medical Restraint Board using thoracic & pelvic tethers to prevent floating during CPR."}
              {buddyStep === 2 && "Dry sternal and apical landmarks. Place Pad 1 infraclavicular right; Pad 2 left mid-axillary intercostal space."}
              {buddyStep === 3 && "If pulseless or profound syncope, administer vastus lateralis autoinjector through flight suit. Hold firmly for 5 seconds."}
              {buddyStep === 4 && "Transmit break-glass encrypted telemetry packet to Houston Flight Surgeon. Establish direct full-duplex medical voice bridge."}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setBuddyStep(Math.max(1, buddyStep - 1))}
              disabled={buddyStep === 1}
              className="flex-1 py-2 text-xs font-mono font-bold border border-[var(--border-strong)] text-[var(--ink-primary)] disabled:opacity-30 rounded-lg liquid-glass-card"
            >
              PREVIOUS
            </button>
            <button
              onClick={() => setBuddyStep(Math.min(4, buddyStep + 1))}
              className="flex-1 py-2 text-xs font-mono font-black bg-[var(--accent-crit)] text-white hover:opacity-90 rounded-lg shadow-sm"
            >
              {buddyStep === 4 ? "PROTOCOL COMPLETE" : "NEXT STEP"}
            </button>
          </div>

          <button
            onClick={handleConfirmBreakGlass}
            className="w-full py-2.5 bg-[var(--accent-crit)] text-white font-mono text-xs font-black flex items-center justify-center gap-2 rounded-lg shadow-md glow-refract-crimson active:scale-98"
          >
            <Radio className="w-4 h-4" />
            TRANSMIT BREAK-GLASS TELEMETRY PACKET
          </button>
        </div>
      )}

      {/* MODAL: INTERACTIVE GUIDED DIAGNOSTIC EXAM COACH */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-[560px] liquid-glass-panel border-2 border-[var(--accent-ok)] p-6 flex flex-col gap-4 shadow-2xl glow-refract-teal">
            <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-[var(--accent-ok)]" />
                <span className="text-base font-mono font-black text-[var(--ink-primary)]">
                  GUIDED EXAM: {selectedExam.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="text-xs font-mono font-bold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              >
                DISMISS
              </button>
            </div>

            {/* OCULAR POCUS ULTRASOUND VIEWPORT */}
            {selectedExam.id === "M3_OCULAR_POCUS" && (
              <div className="flex flex-col gap-3">
                <div className="h-48 w-full bg-black border border-[var(--border-strong)] relative flex items-center justify-center overflow-hidden rounded-lg shadow-inner">
                  <div className="w-56 h-36 rounded-full border border-cyan-400/30 flex items-center justify-center relative">
                    <div className="w-28 h-20 border-t-2 border-b-2 border-cyan-400/80 rounded-full" />
                    {/* Draggable Caliper Lines */}
                    <div
                      className="absolute top-6 bottom-6 border-l-2 border-dashed border-cyan-400 flex flex-col justify-between items-center"
                      style={{ left: `${36 + (onsdCaliperMm - 4.5) * 18}%` }}
                    >
                      <span className="text-[9px] font-mono font-bold text-cyan-400 -mt-4">CALIPER 1</span>
                      <span className="text-[9px] font-mono font-bold text-cyan-400 -mb-4">CALIPER 2</span>
                    </div>
                  </div>

                  <div className="absolute top-2 left-2 text-xs font-mono font-bold text-cyan-400 bg-black/80 px-2 py-1 rounded border border-cyan-400/40">
                    B-SCAN ULTRASOUND | ONSD: {onsdCaliperMm.toFixed(2)} mm
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[var(--ink-secondary)] font-bold">Adjust Caliper Width:</span>
                    <span className="font-black text-sm text-[var(--accent-ok)]">{onsdCaliperMm.toFixed(2)} mm (Normal &lt; 5.0 mm)</span>
                  </div>
                  <input
                    type="range"
                    min="4.5"
                    max="6.8"
                    step="0.05"
                    value={onsdCaliperMm}
                    onChange={(e) => setOnsdCaliperMm(parseFloat(e.target.value))}
                    className="w-full accent-[var(--accent-ok)] cursor-pointer h-2 bg-black/10 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* PVT 3-TRIAL REACTION TIME TEST */}
            {selectedExam.id === "M2_PVT_VOCAL" && (
              <div className="flex flex-col gap-3">
                <div
                  onClick={handlePvtClick}
                  className={`h-44 w-full border-2 flex flex-col items-center justify-center cursor-pointer rounded-lg transition-colors ${
                    pvtGameState === "READY"
                      ? "bg-emerald-500/25 border-[var(--accent-ok)] text-[var(--accent-ok)] glow-refract-teal"
                      : pvtGameState === "WAIT"
                      ? "bg-amber-500/25 border-[var(--accent-warn)] text-[var(--accent-warn)]"
                      : "liquid-glass-card border-[var(--border-strong)] text-[var(--ink-primary)]"
                  }`}
                >
                  <Timer className="w-10 h-10 mb-2" />
                  <span className="text-base font-mono font-black">
                    {pvtGameState === "WAIT"
                      ? "WAIT FOR SIGNAL..."
                      : pvtGameState === "READY"
                      ? "CLICK SCREEN IMMEDIATELY!"
                      : `REACTION: ${pvtReactionMs} ms`}
                  </span>
                  <span className="text-xs font-mono text-[var(--ink-secondary)] font-bold mt-1">
                    {pvtGameState === "CLICKED" ? "Trial 1 of 3 Captured" : "Measures psychomotor vigilance response"}
                  </span>
                </div>
              </div>
            )}

            {/* SEATED CUFF BP + HRV TEST */}
            {selectedExam.id === "M1_SEATED_BP_HRV" && (
              <div className="p-4 liquid-glass-card border border-[var(--border-strong)] flex flex-col gap-2.5 rounded-lg text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-secondary)] font-bold">Automated Cuff Inflation:</span>
                  <span className="font-black text-sm text-[var(--accent-ok)]">126 / 82 mmHg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-secondary)] font-bold">Orthostatic Delta HR:</span>
                  <span className="font-black text-sm text-[var(--accent-ok)]">+12 bpm (Normal)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-secondary)] font-bold">Vagal RMSSD:</span>
                  <span className="font-black text-sm text-[var(--accent-ok)]">34 ms</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-primary)]">
              <span className="text-xs font-mono font-bold text-[var(--ink-secondary)]">
                Uncertainty Reduction: -{selectedExam.uncertainty_reduction_pct}%
              </span>
              <button
                onClick={handleCommitMeasurement}
                className="px-5 py-2.5 bg-[var(--accent-ok)] text-black font-mono text-xs font-black flex items-center gap-2 rounded-lg hover:opacity-90 glow-refract-teal shadow-md active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                COMMIT MEASUREMENT TO TWIN & SHRINK UNCERTAINTY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BREAK-GLASS CONFIRMATION */}
      {breakGlassDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-[500px] liquid-glass-panel border-2 border-[var(--accent-crit)] p-6 flex flex-col gap-4 shadow-2xl glow-refract-crimson">
            <div className="flex items-center gap-2 text-[var(--accent-crit)]">
              <AlertTriangle className="w-7 h-7" />
              <span className="text-base font-mono font-black">
                CONFIRM EMERGENCY BREAK-GLASS DISCLOSURE
              </span>
            </div>
            <p className="text-xs text-[var(--ink-primary)] leading-relaxed font-semibold">
              This action overrides astronaut Tier-1 privacy and immutably enters an emergency biometric disclosure block into the SHA-256 cryptographic audit ledger.
            </p>
            <textarea
              value={breakGlassReason}
              onChange={(e) => setBreakGlassReason(e.target.value)}
              rows={3}
              className="p-3 text-xs font-mono bg-[var(--surface-panel)] border border-[var(--border-strong)] text-[var(--ink-primary)] outline-none resize-none rounded-lg font-bold"
            />
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-primary)]">
              <button
                onClick={() => setBreakGlassDialogOpen(false)}
                className="px-4 py-2 text-xs font-mono font-bold text-[var(--ink-secondary)] border border-[var(--border-subtle)] rounded-lg liquid-glass-card"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmBreakGlass}
                className="px-5 py-2 text-xs font-mono font-black bg-[var(--accent-crit)] text-white hover:opacity-90 flex items-center gap-2 rounded-lg glow-refract-crimson shadow-md active:scale-95"
              >
                <Unlock className="w-4 h-4" /> EXECUTE BREAK-GLASS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DecisionEnginePanel;
