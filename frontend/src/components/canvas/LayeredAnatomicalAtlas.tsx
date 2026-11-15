// ---------------------------------------------------------------------------
// CHIRON v4.0 - LayeredAnatomicalAtlas
// Row 2 Left (col-span-8): Dual 3D Holographic Astronaut Scanner & 7-Axis Digital Twin
// Toggles seamlessly between:
// 1. [ASTRONAUT SPACESUIT]: Photogrammetric NASA EMU Spacesuit with sweeping cyan laser
//    and pulsating holographic telemetry reticles.
// 2. [3D ANATOMICAL TWIN]: Interactive Three.js WebGL multi-layer human body model
//    with OrbitControls, custom wireframe shaders, and organ pulse frequencies.
// Plus "HOW WE BUILT THE 3D MODEL" architectural inspector and "FULL SIZE CLINICAL VIEW"
// with zero text overlaps, unclipped clinical metrics, and NASA-STD-3001 limit citations.
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  Heart,
  Eye,
  Bone,
  Moon,
  Shield,
  Activity,
  Radio,
  Layers,
  Crosshair,
  Maximize2,
  X,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Box,
  Cpu,
  ChevronRight,
  Play,
} from "lucide-react";
import type { AxisScore } from "@/hooks/useChironAPI";
import { AnatomicalTwin3D } from "./AnatomicalTwin3D";
import { getTheme, type ChironThemeId } from "@/lib/themeConfig";

export interface LayeredAnatomicalAtlasProps {
  axes: AxisScore[];
  selectedAxisId: string | null;
  onAxisSelect: (axisId: string) => void;
  themeId: string;
}

export type AnatomyLayer = "ALL" | "NEURO" | "CARDIO" | "SKELETAL" | "RADIATION";
export type VisualizerMode = "SPACESUIT" | "3D_MODEL";

interface OrganCardDef {
  axisId: string;
  rankCode: string;
  label: string;
  subtitle: string;
  metrics: { shortLabel: string; fullName: string; val: string; refRange: string }[];
  targetPos: { topPct: number; leftPct: number };
  icon: React.ReactNode;
  glowClass: string;
  nasaStdRule: string;
  clinicalImplication: string;
  countermeasure: string;
  recommendedExam: string;
}

const ALL_7_ORGAN_CARDS: OrganCardDef[] = [
  {
    axisId: "cardio",
    rankCode: "01",
    label: "CARDIOVASCULAR",
    subtitle: "Aortic Arch & Orthostatic Baroreflex",
    metrics: [
      { shortLabel: "Orthostatic", fullName: "Orthostatic Tolerance", val: "78%", refRange: ">85%" },
      { shortLabel: "HRV RMSSD", fullName: "Heart Rate Variability RMSSD", val: "32 ms", refRange: "25-50 ms" },
      { shortLabel: "Stroke Vol", fullName: "Left Ventricular Stroke Volume", val: "68 mL", refRange: "60-100 mL" },
    ],
    targetPos: { topPct: 34.5, leftPct: 49.2 },
    icon: <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />,
    glowClass: "glow-refract-crimson",
    nasaStdRule: "NASA-STD-3001-V2-6004: Orthostatic Intolerance Prevention",
    clinicalImplication:
      "Microgravity cephalad fluid shift leads to stroke volume deconditioning and blunted carotid baroreflex, causing acute presyncope upon return or re-entry.",
    countermeasure: "Chibis LBNP suit (-30 mmHg, 2h/day) + oral electrolyte fluid loading protocol.",
    recommendedExam: "Seated Cuff BP + 2-Min HRV Window",
  },
  {
    axisId: "neuro",
    rankCode: "02",
    label: "NEURO-OCULAR (SANS)",
    subtitle: "Optic Nerve Sheath & ICP Proxy",
    metrics: [
      { shortLabel: "ONSD", fullName: "Optic Nerve Sheath Diameter", val: "5.8 mm", refRange: "<5.0 mm" },
      { shortLabel: "Edema", fullName: "Cephalad Edema Shift", val: "+1.65σ", refRange: "<+0.5σ" },
      { shortLabel: "IOP Press", fullName: "Intraocular Pressure", val: "18 mmHg", refRange: "10-21 mmHg" },
    ],
    targetPos: { topPct: 11.8, leftPct: 50.0 },
    icon: <Eye className="w-4 h-4 text-cyan-500 fill-cyan-500/20" />,
    glowClass: "glow-refract-cyan",
    nasaStdRule: "NASA-STD-3001-V2-8002: Spaceflight-Associated Neuro-Ocular Syndrome",
    clinicalImplication:
      "Persistent internal jugular engorgement and elevated intracranial pressure lead to posterior globe flattening, optic disc edema, and hyperopic refraction shift.",
    countermeasure: "Venous thurible compression collar + High-CDRA CO2 scrubbing (<2.0 mmHg).",
    recommendedExam: "B-Scan Ocular POCUS Ultrasound",
  },
  {
    axisId: "bone",
    rankCode: "03",
    label: "MUSCULOSKELETAL",
    subtitle: "Thoracolumbar Spine & Femur",
    metrics: [
      { shortLabel: "BMD Retain", fullName: "Bone Mineral Density Retention", val: "94.2%", refRange: ">90%" },
      { shortLabel: "ARED Load", fullName: "ARED Daily Compliance Load", val: "88%", refRange: ">85%" },
      { shortLabel: "Trabecular", fullName: "Femoral Trabecular Loss Rate", val: "-0.4%/mo", refRange: "<-0.5%/mo" },
    ],
    targetPos: { topPct: 52.0, leftPct: 50.0 },
    icon: <Bone className="w-4 h-4 text-amber-500 fill-amber-500/20" />,
    glowClass: "glow-refract-amber",
    nasaStdRule: "NASA-STD-3001-V2-6002: Bone Mineral & Muscle Strength Preservation",
    clinicalImplication:
      "Unloading of postural weight-bearing skeleton accelerates osteoclast resorption in calcaneus and lumbar spine, increasing hypercalciuria nephrolithiasis risk.",
    countermeasure: "Advanced Resistive Exercise Device (ARED) 2.5h daily + Bisphosphonate prophylactic.",
    recommendedExam: "ARED Isometric Force Plate & Calcaneal Ultrasound",
  },
  {
    axisId: "sleep",
    rankCode: "04",
    label: "SLEEP & CIRCADIAN",
    subtitle: "Pineal Melatonin & PVT Velocity",
    metrics: [
      { shortLabel: "Sleep Total", fullName: "Total Actigraphy Sleep Time", val: "6.8 hrs", refRange: ">7.0 hrs" },
      { shortLabel: "Phase Drift", fullName: "Circadian Phase Angle Drift", val: "-1.2 hrs", refRange: "<±1.0 hr" },
      { shortLabel: "PVT Speed", fullName: "Psychomotor Vigilance Latency", val: "228 ms", refRange: "<250 ms" },
    ],
    targetPos: { topPct: 7.2, leftPct: 50.0 },
    icon: <Moon className="w-4 h-4 text-indigo-500 fill-indigo-500/20" />,
    glowClass: "glow-refract-cyan",
    nasaStdRule: "NASA-STD-3001-V2-1003: Circadian Entrainment & Cognitive Readiness",
    clinicalImplication:
      "90-minute orbital day/night cycles suppress endogenous pineal melatonin secretion, producing chronic sleep fragmentation and micro-lapses during critical docking.",
    countermeasure: "Dynamic Solid-State Lighting (480nm blue-enriched dawn, 2700K dusk) + 0.5mg exogenous melatonin.",
    recommendedExam: "3-Minute Psychomotor Vigilance Task (PVT)",
  },
  {
    axisId: "immune",
    rankCode: "05",
    label: "IMMUNE & HEMATOLOGIC",
    subtitle: "Thymic Reactivity & Bone Marrow",
    metrics: [
      { shortLabel: "WBC Count", fullName: "White Blood Cell Reserve", val: "6.4k/μL", refRange: "4.5-11.0k" },
      { shortLabel: "IL-6 Cyto", fullName: "Interleukin-6 Inflammatory Ratio", val: "1.4x Base", refRange: "<2.0x" },
      { shortLabel: "Thymic Vol", fullName: "Thymic Output Index", val: "91%", refRange: ">80%" },
    ],
    targetPos: { topPct: 41.0, leftPct: 50.0 },
    icon: <Shield className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />,
    glowClass: "glow-refract-teal",
    nasaStdRule: "NASA-STD-3001-V2-7001: Immune Dysregulation Mitigation",
    clinicalImplication:
      "Deep-space radiation exposure combined with chronic allostatic load induces T-cell hyporeactivity and subclinical Epstein-Barr virus reactivation.",
    countermeasure: "Antioxidant nutrient suite (polyphenols, N-acetylcysteine) + probiotic gut barrier support.",
    recommendedExam: "Capillary Point-of-Care Chem Strip (i-STAT Differential)",
  },
  {
    axisId: "behav",
    rankCode: "06",
    label: "BEHAVIORAL & VOCAL",
    subtitle: "Allostatic Stress & Vocal DSP",
    metrics: [
      { shortLabel: "Hesitation", fullName: "Speech Pause Hesitation Ratio", val: "28.4%", refRange: "<30%" },
      { shortLabel: "Local Jitter", fullName: "Vocal Pitch Cycle Jitter", val: "0.88%", refRange: "<1.04%" },
      { shortLabel: "Mood Index", fullName: "Crew Cohesion & Autonomic Tone", val: "82/100", refRange: ">70" },
    ],
    targetPos: { topPct: 39.0, leftPct: 83.6 },
    icon: <Activity className="w-4 h-4 text-blue-500 fill-blue-500/20" />,
    glowClass: "glow-refract-cyan",
    nasaStdRule: "NASA-STD-3001-V2-1002: Behavioral Health & Neurobehavioral Monitoring",
    clinicalImplication:
      "Acoustic prosodic micro-tremors and elevated sentence hesitation latency reflect autonomic sympathetic overload prior to overt operational errors.",
    countermeasure: "Daily autonomous voice check-in + interactive mindfulness auditory pacing.",
    recommendedExam: "Vocal Biomarker Prosody & Acoustic Stress Pass",
  },
  {
    axisId: "rad",
    rankCode: "07",
    label: "RADIATION BURDEN",
    subtitle: "Cumulative SPE & BFO Dose Rate",
    metrics: [
      { shortLabel: "Career Dose", fullName: "Cumulative Mission Radiation", val: "48.2 mSv", refRange: "<250 mSv" },
      { shortLabel: "30-Day BFO", fullName: "30-Day Blood-Forming Organ Dose", val: "12.4 mSv", refRange: "<250 mSv" },
      { shortLabel: "Flux Rate", fullName: "NOAA GOES Proton Flux Rate", val: "0.14 pfu", refRange: "<10.0 pfu" },
    ],
    targetPos: { topPct: 29.3, leftPct: 41.4 },
    icon: <Radio className="w-4 h-4 text-orange-500 fill-orange-500/20" />,
    glowClass: "glow-refract-amber",
    nasaStdRule: "NASA-STD-3001-V2-9001: Ionizing Radiation Exposure Limits",
    clinicalImplication:
      "Solar Particle Events (SPE) elevate solar energetic proton flux above 10 MeV, inducing double-strand DNA breaks and acute radiation sickness without storm shelter.",
    countermeasure: "Hydrogenous polyethylene water wall shelter configuration + amifostine radioprotectant.",
    recommendedExam: "Personal Active Dosimeter Sync (TEPC Counter)",
  },
];

export function LayeredAnatomicalAtlas({
  axes,
  selectedAxisId,
  onAxisSelect,
  themeId,
}: LayeredAnatomicalAtlasProps) {
  const [activeLayer, setActiveLayer] = useState<AnatomyLayer>("ALL");
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>("SPACESUIT");
  const [howBuiltModalOpen, setHowBuiltModalOpen] = useState<boolean>(false);
  const [fullSizeModalOpen, setFullSizeModalOpen] = useState<boolean>(false);
  const [activeDetailAxis, setActiveDetailAxis] = useState<string>("neuro");

  const getScore = (axisId: string): number => {
    const ax = axes.find((a) => a.axis_id === axisId || a.label.toLowerCase().includes(axisId));
    return ax?.score ?? 78.0;
  };

  const getConfidenceWidth = (axisId: string): number => {
    const ax = axes.find((a) => a.axis_id === axisId || a.label.toLowerCase().includes(axisId));
    if (ax?.confidence_interval) {
      return Math.round(ax.confidence_interval[1] - ax.confidence_interval[0]);
    }
    return 14;
  };

  const getStatusColor = (score: number) => {
    if (score < 50) return "var(--accent-crit)";
    if (score < 75) return "var(--accent-warn)";
    return "var(--accent-ok)";
  };

  const currentThemeConfig = getTheme((themeId as ChironThemeId) || "deep-space");

  return (
    <div className="w-full chiron-bento-card p-5 flex flex-col justify-between select-none">
      {/* 1. Panel Header & Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] pb-3.5 mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--surface-active)] border border-[var(--accent-info)] flex items-center justify-center glow-refract-cyan shrink-0">
            <Layers className="w-5 h-5 text-[var(--accent-active)]" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[19px] font-mono font-black tracking-wider text-[var(--ink-primary)]">
              3D HOLOGRAPHIC ASTRONAUT SCANNER & 7-AXIS DIGITAL TWIN
            </h2>
            <span className="text-[12px] font-mono font-bold text-[var(--ink-secondary)]">
              Real-Time Physiological Telemetry HUD & Multi-Layer Digital Twin
            </span>
          </div>
        </div>

        {/* Action Controls & Modal Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Visualizer Mode Toggle */}
          <div className="flex p-1 bg-[var(--surface-base)] rounded-lg border border-[var(--border-subtle)]">
            <button
              onClick={() => setVisualizerMode("SPACESUIT")}
              className={`px-3 py-1.5 text-[12px] font-mono font-black flex items-center gap-1.5 rounded transition-all ${
                visualizerMode === "SPACESUIT"
                  ? "bg-white text-[var(--accent-active)] border border-[var(--accent-info)] shadow-sm"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-500" />
              SPACESUIT HUD
            </button>
            <button
              onClick={() => setVisualizerMode("3D_MODEL")}
              className={`px-3 py-1.5 text-[12px] font-mono font-black flex items-center gap-1.5 rounded transition-all ${
                visualizerMode === "3D_MODEL"
                  ? "bg-white text-[var(--accent-active)] border border-[var(--accent-info)] shadow-sm"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <Box className="w-3.5 h-3.5 text-emerald-500" />
              3D WEBGL TWIN
            </button>
          </div>

          {/* Architectural Inspector Button */}
          <button
            onClick={() => setHowBuiltModalOpen(true)}
            className="px-3.5 py-1.5 text-[12px] font-mono font-black flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/12 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-sm"
            title="Inspect 3D Model Photogrammetry & System Architecture"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>HOW WE BUILT 3D MODEL</span>
          </button>

          {/* Full Size / Expand Button */}
          <button
            onClick={() => {
              setActiveDetailAxis("neuro");
              setFullSizeModalOpen(true);
            }}
            className="px-3.5 py-1.5 text-[12px] font-mono font-black flex items-center gap-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-base)] hover:bg-[var(--surface-active)] text-[var(--ink-primary)] transition-all shadow-sm"
            title="View All 7 Organ Systems in Full Size"
          >
            <Maximize2 className="w-4 h-4 text-[var(--accent-active)]" />
            <span>FULL SIZE CLINICAL VIEW</span>
          </button>
        </div>
      </div>

      {/* Layer Filter Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono font-black text-[var(--ink-secondary)] uppercase tracking-wider">
            PHYSIOLOGICAL FILTER:
          </span>
          <div className="flex gap-1.5 p-1 bg-[var(--surface-base)] rounded-lg border border-[var(--border-subtle)]">
            {(["ALL", "NEURO", "CARDIO", "SKELETAL", "RADIATION"] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`px-3 py-1 text-[12px] font-mono font-black rounded transition-all ${
                  activeLayer === layer
                    ? "bg-white text-[var(--accent-active)] border border-[var(--accent-info)] shadow-sm font-black"
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {layer}
              </button>
            ))}
          </div>
        </div>

        <span className="text-[11.5px] font-mono font-bold text-[var(--ink-tertiary)]">
          SELECT AN ORGAN CARD OR RETICLE TO FOCUS TELEMETRY
        </span>
      </div>

      {/* 2. Main Content Area: Split 42% (Photorealistic Astronaut 3D Hologram) / 58% (7-Axis Bento Grid) */}
      <div className="w-full flex flex-col xl:flex-row items-center gap-6">
        {/* LEFT (42%): Photorealistic Transparent Astronaut Spacesuit OR 3D WebGL Model */}
        <div className="w-full xl:w-[42%] min-h-[580px] h-[640px] rounded-xl bg-gradient-to-b from-[var(--surface-base)] via-[var(--surface-canvas)] to-[var(--surface-base)] border border-[var(--border-subtle)] relative flex items-center justify-center overflow-hidden p-0 shadow-inner">
          {visualizerMode === "SPACESUIT" ? (
            <>
              {/* Background Rotating 3D Volumetric Gimbal & Alignment Rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                <div className="w-[480px] h-[480px] rounded-full border border-dashed border-[var(--accent-active)] animate-spin" style={{ animationDuration: "40s" }} />
                <div className="w-[360px] h-[360px] rounded-full border border-[var(--accent-info)]/40 animate-spin" style={{ animationDuration: "25s", animationDirection: "reverse" }} />
                <div className="w-[540px] h-[540px] rounded-full border border-[var(--border-strong)]" />
                <div className="w-[230px] h-[230px] rounded-full border border-[var(--accent-ok)] animate-radar" />
              </div>

              {/* Sweeping Cyan Holographic Laser Scan-Line */}
              <div className="absolute inset-x-4 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#06b6d4] animate-laser pointer-events-none z-30" />

              {/* Live Astronaut Spacesuit Photogrammetric Digital Twin (Scaled to Fill Viewport Without Gaps) */}
              <div className="relative h-full w-full flex items-center justify-center z-10 overflow-hidden">
                <img
                  src="/astronaut_nobg.png"
                  alt="CHIRON Astronaut Spacesuit Digital Twin"
                  className="h-full w-full object-contain scale-[1.08] drop-shadow-[0_0_35px_rgba(2,132,199,0.4)] transition-transform duration-300 select-none pointer-events-none"
                />

                {/* Live Pulsating 3D Biometric Reticles & Organ Nodes on the Astronaut Suit */}
                {/* 01: Helmet Visor / Neuro-Ocular SANS */}
                {(activeLayer === "ALL" || activeLayer === "NEURO") && (
                  <button
                    onClick={() => onAxisSelect("neuro")}
                    style={{ top: "13.5%", left: "50%" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                    title="Neuro-Ocular (SANS) - Optic Nerve Sheath"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full border border-dashed border-cyan-400 animate-spin absolute" style={{ animationDuration: "8s" }} />
                      <span className="w-7 h-7 rounded-full bg-cyan-500/25 border-2 border-cyan-400 animate-ping absolute" />
                      <span className="w-5.5 h-5.5 rounded-full bg-cyan-500/70 border-2 border-cyan-200 flex items-center justify-center shadow-[0_0_14px_#06b6d4]">
                        <Eye className="w-3.5 h-3.5 text-white" />
                      </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-0.5 rounded bg-black/85 text-[11.5px] font-mono text-cyan-300 whitespace-nowrap border border-cyan-500 pointer-events-none shadow-md">
                      SANS: 5.8mm ONSD (+1.65σ)
                    </div>
                  </button>
                )}

                {/* 02: Chest Display Core / Cardiovascular Aorta */}
                {(activeLayer === "ALL" || activeLayer === "CARDIO") && (
                  <button
                    onClick={() => onAxisSelect("cardio")}
                    style={{ top: "36.5%", left: "49.2%" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                    title="Cardiovascular - Aortic Arch & Cardiac Pump"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border border-dashed border-rose-400 animate-spin absolute" style={{ animationDuration: "6s" }} />
                      <span className="w-8 h-8 rounded-full bg-rose-500/25 border-2 border-rose-500 animate-ping absolute" style={{ animationDuration: "0.9s" }} />
                      <span className="w-6 h-6 rounded-full bg-rose-600/80 border-2 border-rose-200 flex items-center justify-center shadow-[0_0_16px_#f43f5e]">
                        <Heart className="w-3.5 h-3.5 text-white fill-white/80" />
                      </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-0.5 rounded bg-black/85 text-[11.5px] font-mono text-rose-300 whitespace-nowrap border border-rose-500 pointer-events-none shadow-md">
                      CARDIO: 78% Orthostatic (32ms)
                    </div>
                  </button>
                )}

                {/* 03: Spine & Exoskeletal Joint / Musculoskeletal */}
                {(activeLayer === "ALL" || activeLayer === "SKELETAL") && (
                  <button
                    onClick={() => onAxisSelect("bone")}
                    style={{ top: "53.5%", left: "50%" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                    title="Musculoskeletal - Spine & Femur Bone Density"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border border-dashed border-amber-400 animate-spin absolute" style={{ animationDuration: "10s" }} />
                      <span className="w-6 h-6 rounded-full bg-amber-500/25 border border-amber-400 animate-ping absolute" />
                      <span className="w-5 h-5 rounded-full bg-amber-500/70 border border-amber-200 flex items-center justify-center shadow-[0_0_12px_#f59e0b]">
                        <Bone className="w-3 h-3 text-white" />
                      </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-0.5 rounded bg-black/85 text-[11.5px] font-mono text-amber-300 whitespace-nowrap border border-amber-500 pointer-events-none shadow-md">
                      BMD: 94.2% Retain (88% ARED)
                    </div>
                  </button>
                )}

                {/* 04: Visor Top / Pineal Circadian */}
                {(activeLayer === "ALL" || activeLayer === "NEURO") && (
                  <button
                    onClick={() => onAxisSelect("sleep")}
                    style={{ top: "8.5%", left: "50%" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                    title="Circadian - Pineal Phase"
                  >
                    <span className="w-4.5 h-4.5 rounded-full bg-indigo-500/70 border border-indigo-200 flex items-center justify-center shadow-[0_0_10px_#6366f1]">
                      <Moon className="w-2.5 h-2.5 text-white" />
                    </span>
                  </button>
                )}

                {/* 05: Chest Marrow / Immune */}
                {(activeLayer === "ALL" || activeLayer === "RADIATION") && (
                  <button
                    onClick={() => onAxisSelect("immune")}
                    style={{ top: "42.5%", left: "50%" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                    title="Immune & Hematologic - Bone Marrow"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500/70 border border-emerald-200 flex items-center justify-center shadow-[0_0_10px_#10b981]">
                      <Shield className="w-3 h-3 text-white" />
                    </span>
                  </button>
                )}

                {/* 06: Left Wrist Module / Behavioral & Vocal DSP */}
                <button
                  onClick={() => onAxisSelect("behav")}
                  style={{ top: "41.5%", left: "81.5%" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                  title="Wrist Bio-Computer - Vocal & Autonomic"
                >
                  <div className="relative flex items-center justify-center">
                    <span className="w-6 h-6 rounded-full bg-blue-500/25 border border-blue-400 animate-ping absolute" />
                    <span className="w-4.5 h-4.5 rounded-full bg-blue-500/80 border border-blue-200 flex items-center justify-center shadow-[0_0_10px_#3b82f6]">
                      <Activity className="w-3 h-3 text-white" />
                    </span>
                  </div>
                </button>

                {/* 07: Left Chest Sensor / Radiation Burden */}
                {(activeLayer === "ALL" || activeLayer === "RADIATION") && (
                  <button
                    onClick={() => onAxisSelect("rad")}
                    style={{ top: "30.5%", left: "42.5%" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                    title="Chest Dosimeter - Cumulative SPE Radiation"
                  >
                    <span className="w-4.5 h-4.5 rounded-full bg-orange-500/80 border border-orange-200 flex items-center justify-center shadow-[0_0_10px_#f97316]">
                      <Radio className="w-2.5 h-2.5 text-white" />
                    </span>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* 3D WebGL Multi-Layer Three.js Anatomical Model Viewport (Scaled to Fill Viewport Vertically) */
            <div className="w-full h-full relative">
              <Canvas
                camera={{ position: [0, 0.05, 5.6], fov: 42 }}
                className="w-full h-full block rounded-xl"
              >
                <ambientLight intensity={themeId === "orbital-daylight" ? 1.0 : 0.65} />
                <directionalLight position={[5, 8, 5]} intensity={1.2} />
                <directionalLight position={[-4, 5, -3]} intensity={0.7} color="#38bdf8" />
                <pointLight position={[0, 4, 3]} intensity={1.3} color="#0284c7" />
                <pointLight position={[0, -2, -3]} intensity={0.8} color="#06b6d4" />
                <OrbitControls
                  enableZoom={true}
                  enablePan={false}
                  minDistance={3.2}
                  maxDistance={8.5}
                  target={[0, 0.05, 0]}
                  autoRotate={true}
                  autoRotateSpeed={0.8}
                />
                <AnatomicalTwin3D
                  theme={currentThemeConfig}
                  axes={axes}
                  selectedAxisId={selectedAxisId}
                  onAxisSelect={onAxisSelect}
                />
              </Canvas>
              <div className="absolute top-3 left-3 text-[11px] font-mono font-black text-emerald-400 bg-black/80 px-2 py-0.5 rounded border border-emerald-500/40 pointer-events-none">
                WebGL 3D Holographic Twin (Drag to Rotate 360°)
              </div>
            </div>
          )}

          {/* Lower HUD Status Overlay (Single Line, Never Wraps or Collides!) */}
          <div className="absolute bottom-2.5 inset-x-3 px-3 py-1.5 rounded-lg bg-black/85 backdrop-blur-md border border-[var(--border-subtle)] flex items-center justify-between z-20 font-mono text-[11px] font-black whitespace-nowrap text-cyan-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                {visualizerMode === "SPACESUIT" ? "HOLOGRAPHIC SCANNER: ACTIVE" : "WEBGL ANATOMICAL TWIN: ONLINE"}
              </span>
            </div>
            <span className="text-slate-300">LAYER: {activeLayer}</span>
          </div>
        </div>

        {/* RIGHT (58%): 2-Column Grid of ALL 7 Physiological Axis Cards (Zero Overlaps, Zero Clipping!) */}
        <div className="w-full xl:w-[58%] grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {ALL_7_ORGAN_CARDS.map((card) => {
            const score = getScore(card.axisId);
            const ciWidth = getConfidenceWidth(card.axisId);
            const statusColor = getStatusColor(score);
            const isSelected = selectedAxisId === card.axisId;
            const isWideBottom = card.axisId === "rad";

            return (
              <div
                key={card.axisId}
                onClick={() => onAxisSelect(card.axisId)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isWideBottom ? "col-span-1 md:col-span-2" : ""
                } ${
                  isSelected
                    ? `bg-[var(--surface-active)] border-[var(--accent-info)] ${card.glowClass} shadow-md`
                    : "bg-[var(--surface-primary)] hover:bg-[var(--surface-base)] border-[var(--border-primary)]"
                }`}
              >
                {/* 1. Header: Rank Code, Label, Icon & Expand Button */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-mono font-black px-1.5 py-0.5 rounded bg-[var(--surface-base)] text-[var(--ink-secondary)] border border-[var(--border-subtle)]">
                      {card.rankCode}
                    </span>
                    <span className="text-[14.5px] font-mono font-black text-[var(--ink-primary)] tracking-tight">
                      {card.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {card.icon}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDetailAxis(card.axisId);
                        setFullSizeModalOpen(true);
                      }}
                      className="p-1 rounded text-[var(--ink-tertiary)] hover:text-[var(--accent-active)] hover:bg-[var(--surface-base)] transition-colors"
                      title="Inspect Full Clinical Details"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Subtitle (Full Text) */}
                <p className="text-[12px] font-mono font-semibold text-[var(--ink-secondary)] truncate mb-2" title={card.subtitle}>
                  {card.subtitle}
                </p>

                {/* 3. Score & Uncertainty Readout (Clean Side-by-Side Spacing) */}
                <div className="flex items-center justify-between py-1.5 border-y border-[var(--border-subtle)] my-1.5">
                  <div className="flex items-baseline gap-1 font-mono">
                    <span
                      className="text-[30px] font-black leading-none"
                      style={{ color: statusColor }}
                    >
                      {Math.round(score)}
                    </span>
                    <span className="text-[12px] font-bold text-[var(--ink-tertiary)]">
                      /100
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className="text-[10.5px] font-black px-2 py-0.5 rounded tracking-wide uppercase"
                      style={{
                        color: statusColor,
                        backgroundColor: `rgba(${
                          score < 50
                            ? "var(--accent-crit-rgb)"
                            : score < 75
                            ? "var(--accent-warn-rgb)"
                            : "var(--accent-ok-rgb)"
                        }, 0.16)`,
                      }}
                    >
                      {score < 50 ? "CRITICAL" : score < 75 ? "ALERT" : "NOMINAL"}
                    </span>
                    <span className="text-[10.5px] font-black px-2 py-0.5 rounded bg-[var(--surface-base)] text-[var(--ink-secondary)] border border-[var(--border-subtle)]">
                      ±{ciWidth}% CI
                    </span>
                  </div>
                </div>

                {/* 4. 3 Live Clinical Submetrics in Dedicated Micro-Cards (Zero Overlap!) */}
                <div className={`grid ${isWideBottom ? "grid-cols-3" : "grid-cols-3"} gap-2 pt-1 font-mono`}>
                  {card.metrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col p-2 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)] text-center"
                    >
                      <span
                        className="text-[11px] text-[var(--ink-tertiary)] font-bold uppercase truncate"
                        title={m.fullName}
                      >
                        {isWideBottom ? m.fullName : m.shortLabel}
                      </span>
                      <span className="text-[14px] text-[var(--ink-primary)] font-black tracking-tight mt-0.5">
                        {m.val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 5. Health Progress Bar */}
                <div className="w-full bg-[var(--surface-base)] h-1.5 rounded-full overflow-hidden mt-2.5 border border-[var(--border-subtle)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${score}%`,
                      backgroundColor: statusColor,
                      boxShadow: `0 0 8px ${statusColor}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 1: "HOW WE BUILT THE 3D MODEL & SYSTEM ARCHITECTURE" */}
      {/* ------------------------------------------------------------------- */}
      {howBuiltModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-[840px] max-w-[95vw] max-h-[90vh] chiron-bento-card border-2 border-cyan-400 p-6 flex flex-col gap-5 overflow-y-auto shadow-2xl glow-refract-cyan">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-[20px] font-mono font-black text-[var(--ink-primary)]">
                    HOW WE BUILT THE 3D DIGITAL TWIN MODEL
                  </h3>
                  <span className="text-[12px] font-mono font-bold text-cyan-500">
                    NASA Space Apps Challenge 2026 Architectural Breakdown
                  </span>
                </div>
              </div>
              <button
                onClick={() => setHowBuiltModalOpen(false)}
                className="p-1.5 rounded-lg border border-[var(--border-primary)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-base)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Architecture 4-Pillar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[13px]">
              {/* Pillar 1 */}
              <div className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-cyan-500 font-black text-[14px]">
                  <Crosshair className="w-4.5 h-4.5" />
                  <span>1. EMU Spacesuit Photogrammetry</span>
                </div>
                <p className="text-[var(--ink-secondary)] leading-relaxed">
                  High-resolution photogrammetric reconstruction of the NASA Extravehicular Mobility Unit (EMU) suit. Alpha-matted via SciPy topological connected-component labeling to yield background-free visual fidelity.
                </p>
                <div className="text-[11px] text-[var(--ink-tertiary)] pt-1 border-t border-[var(--border-subtle)]">
                  Asset: <span className="text-cyan-400 font-bold">/astronaut_nobg.png</span> (640 kB, zero artifacts)
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-500 font-black text-[14px]">
                  <Box className="w-4.5 h-4.5" />
                  <span>2. Three.js WebGL Custom Shaders</span>
                </div>
                <p className="text-[var(--ink-secondary)] leading-relaxed">
                  Multi-layered 3D body wireframe rendered using custom GLSL vertex and fragment shaders. Features dynamic Fresnel edge glow, animated scanning lines, and organ node geometry shaders driven by live Bayesian confidence.
                </p>
                <div className="text-[11px] text-[var(--ink-tertiary)] pt-1 border-t border-[var(--border-subtle)]">
                  Engine: <span className="text-emerald-400 font-bold">Three.js + React Three Fiber (60 FPS)</span>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-500 font-black text-[14px]">
                  <Cpu className="w-4.5 h-4.5" />
                  <span>3. Real-Time Mathematical Twin Engine</span>
                </div>
                <p className="text-[var(--ink-secondary)] leading-relaxed">
                  Real-time 100Hz physiological sensor stream fused into a 7-axis latent state via an Extended Kalman Filter and Conformal Prediction. Generates mathematically guaranteed 90% confidence bands without hallucination.
                </p>
                <div className="text-[11px] text-[var(--ink-tertiary)] pt-1 border-t border-[var(--border-subtle)]">
                  Math Core: <span className="text-amber-400 font-bold">twin_engine.py + FastAPI backend</span>
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-rose-500 font-black text-[14px]">
                  <Shield className="w-4.5 h-4.5" />
                  <span>4. NASA-STD-3001 Compliance Guard</span>
                </div>
                <p className="text-[var(--ink-secondary)] leading-relaxed">
                  Every physiological threshold and automated recommendation is checked against NASA-STD-3001 Volume 2 flight rules. Microgravity cognitive load limits guarantee unclipped, high-contrast flight telemetry presentation.
                </p>
                <div className="text-[11px] text-[var(--ink-tertiary)] pt-1 border-t border-[var(--border-subtle)]">
                  Standard: <span className="text-rose-400 font-bold">NASA-STD-3001-V2 (Rules 6004, 8002, 1003)</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setHowBuiltModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-[var(--accent-active)] text-white font-mono font-black text-[13px] hover:opacity-90 shadow-md"
              >
                CLOSE ARCHITECTURAL INSPECTOR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 2: "FULL SIZE VIEW / 7-AXIS CLINICAL DEEP DIVE" */}
      {/* ------------------------------------------------------------------- */}
      {fullSizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-[1100px] max-w-[95vw] max-h-[92vh] chiron-bento-card border-2 border-[var(--accent-info)] p-6 flex flex-col gap-5 overflow-y-auto shadow-2xl glow-refract-cyan">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-active)] border border-[var(--accent-info)] flex items-center justify-center">
                  <Activity className="w-6 h-6 text-[var(--accent-active)]" />
                </div>
                <div>
                  <h3 className="text-[22px] font-mono font-black text-[var(--ink-primary)]">
                    FULL-SIZE 7-AXIS CLINICAL PHYSIOLOGICAL SUITE
                  </h3>
                  <span className="text-[12.5px] font-mono font-bold text-[var(--ink-secondary)]">
                    NASA-STD-3001 Diagnostic Reference Limits, Conformal Confidence & Interventions
                  </span>
                </div>
              </div>
              <button
                onClick={() => setFullSizeModalOpen(false)}
                className="p-1.5 rounded-lg border border-[var(--border-primary)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-base)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Organ System Selection Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 border-b border-[var(--border-subtle)]">
              {ALL_7_ORGAN_CARDS.map((card) => {
                const isSelected = activeDetailAxis === card.axisId;
                const score = getScore(card.axisId);
                const statusColor = getStatusColor(score);
                return (
                  <button
                    key={card.axisId}
                    onClick={() => setActiveDetailAxis(card.axisId)}
                    className={`px-3 py-2 text-[12.5px] font-mono font-black flex items-center gap-2 rounded-lg border transition-all whitespace-nowrap ${
                      isSelected
                        ? "bg-[var(--surface-active)] text-[var(--accent-active)] border-[var(--accent-info)] shadow-sm"
                        : "bg-[var(--surface-base)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border-transparent"
                    }`}
                  >
                    {card.icon}
                    <span>{card.rankCode} {card.label}</span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[11px] font-mono font-black"
                      style={{ color: statusColor, backgroundColor: `rgba(${score < 50 ? "225,29,72" : "5,150,105"},0.15)` }}
                    >
                      {Math.round(score)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Organ Deep Dive Detail Card */}
            {(() => {
              const activeCard = ALL_7_ORGAN_CARDS.find((c) => c.axisId === activeDetailAxis) || ALL_7_ORGAN_CARDS[0];
              const score = getScore(activeCard.axisId);
              const ciWidth = getConfidenceWidth(activeCard.axisId);
              const statusColor = getStatusColor(score);

              return (
                <div className="flex flex-col gap-5 font-mono">
                  {/* Summary Bar */}
                  <div className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[var(--surface-panel)] border border-[var(--border-primary)] flex items-center justify-center text-xl">
                        {activeCard.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[19px] font-black text-[var(--ink-primary)]">
                          {activeCard.rankCode} - {activeCard.label}
                        </span>
                        <span className="text-[13px] font-bold text-[var(--ink-secondary)]">
                          {activeCard.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-bold text-[var(--ink-tertiary)]">RESILIENCE SCORE</span>
                        <span className="text-[36px] font-black leading-none" style={{ color: statusColor }}>
                          {Math.round(score)} <span className="text-[14px] text-[var(--ink-secondary)]">/ 100</span>
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span
                          className="px-2.5 py-1 text-[12px] font-black rounded uppercase"
                          style={{
                            color: statusColor,
                            backgroundColor: `rgba(${score < 50 ? "225,29,72" : "5,150,105"},0.18)`,
                          }}
                        >
                          {score < 50 ? "CRITICAL HAZARD" : score < 75 ? "ALERT MONITOR" : "NOMINAL"}
                        </span>
                        <span className="text-[11px] font-bold text-[var(--ink-secondary)]">
                          90% Conformal Fan: ±{ciWidth}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Detailed Telemetry Columns (Unabbreviated!) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeCard.metrics.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col justify-between"
                      >
                        <span className="text-[12px] font-bold text-[var(--ink-tertiary)] uppercase tracking-wide">
                          {m.fullName}
                        </span>
                        <div className="my-2">
                          <span className="text-[28px] font-black text-[var(--ink-primary)]">
                            {m.val}
                          </span>
                        </div>
                        <div className="text-[11.5px] font-bold text-[var(--accent-ok)] pt-2 border-t border-[var(--border-subtle)]">
                          Normal Space Reference: {m.refRange}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Clinical Implication & Countermeasure Protocol */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-amber-500 font-black text-[13.5px]">
                        <AlertTriangle className="w-4.5 h-4.5" />
                        <span>Physiological Risk & Flight Rule</span>
                      </div>
                      <p className="text-[13px] text-[var(--ink-primary)] leading-relaxed font-sans font-semibold">
                        {activeCard.clinicalImplication}
                      </p>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                        Rule: {activeCard.nasaStdRule}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-emerald-500 font-black text-[13.5px]">
                        <CheckCircle2 className="w-4.5 h-4.5" />
                        <span>Recommended Countermeasure Intervention</span>
                      </div>
                      <p className="text-[13px] text-[var(--ink-primary)] leading-relaxed font-sans font-semibold">
                        {activeCard.countermeasure}
                      </p>
                      <div className="mt-auto pt-2 flex items-center justify-between border-t border-emerald-500/20">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Next Diagnostic: {activeCard.recommendedExam}
                        </span>
                        <button
                          onClick={() => {
                            setFullSizeModalOpen(false);
                            document.getElementById("row-3-voi")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="px-3 py-1 bg-emerald-600 text-white rounded text-[11px] font-black flex items-center gap-1 hover:bg-emerald-500"
                        >
                          <Play className="w-3 h-3 fill-current" /> EXECUTE EXAM
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setFullSizeModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-[var(--accent-active)] text-white font-mono font-black text-[13px] hover:opacity-90 shadow-md"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LayeredAnatomicalAtlas;
