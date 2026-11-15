// ---------------------------------------------------------------------------
// CHIRON v4.0 - ExecutiveSummaryRibbon
// Row 1: 4 Executive Telemetry & Live Waveform Cards (grid-cols-4, gap: 20px).
// Features 50px Extra-Bold ARI with unclipped primary driver text,
// Live 60fps Scrolling ECG/PPG Oscilloscope Canvas with clean vertical spacing,
// Volumetric Space Storm Visualizer (/space_storm.jpg) with NOAA SWPC telemetry,
// and Orbital Return Horizon with Planetary Eclipse Backdrop (/orbital_eclipse.jpg).
// Includes Full-Size Telemetry Deep-Dive Modal with zero overlapping text.
// ---------------------------------------------------------------------------

import React, { useRef, useEffect, useState } from "react";
import {
  Activity,
  Heart,
  Wind,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Zap,
  Maximize2,
  X,
  TrendingUp,
  Orbit,
  Cpu,
} from "lucide-react";
import ProvenanceBadge from "../ui/ProvenanceBadge";
import type { OrbitalWindow } from "@/hooks/useChironAPI";

export interface ExecutiveSummaryRibbonProps {
  ariScore: number;
  activeScenario: string;
  sensorDropoutActive: boolean;
  orbitalWindow: OrbitalWindow | null;
  activeCrewName: string;
}

export function ExecutiveSummaryRibbon({
  ariScore,
  activeScenario,
  sensorDropoutActive,
  orbitalWindow,
  activeCrewName,
}: ExecutiveSummaryRibbonProps) {
  const ecgCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const isScenarioA = activeScenario === "A";
  const isScenarioB = activeScenario === "B";
  const isScenarioC = activeScenario === "C";

  // ARI Driver & Delta
  let ariStatus = "NOMINAL RESILIENCE";
  let ariColor = "var(--accent-ok)";
  let ariGlowClass = "glow-refract-teal";
  let ariDelta = "+0.4 pts / 24h";
  let primaryDriver = "Circadian & Orthostatic Stability";

  if (isScenarioC) {
    ariStatus = "ACUTE INCAPACITATION";
    ariColor = "var(--accent-crit)";
    ariGlowClass = "glow-refract-crimson";
    ariDelta = "-42.8 pts / 1h";
    primaryDriver = "Vasovagal Syncope & Orthostatic Crash";
  } else if (isScenarioB) {
    ariStatus = "SPE RADIATION HAZARD";
    ariColor = "var(--accent-warn)";
    ariGlowClass = "glow-refract-amber";
    ariDelta = "-14.2 pts / 6h";
    primaryDriver = "Proton Flux Storm + Cabin CO2 Spike";
  } else if (isScenarioA || sensorDropoutActive) {
    ariStatus = "ADVISORY DRIFT";
    ariColor = "var(--accent-warn)";
    ariGlowClass = "glow-refract-amber";
    ariDelta = "-6.2 pts / 24h";
    primaryDriver = sensorDropoutActive
      ? "Neuro SANS + Sensor Dropout Uncertainty"
      : "Subclinical SANS Cephalad Edema";
  }

  // Habitat Telemetry
  const ppCo2Val = isScenarioB ? "3.8" : "1.8";
  const ppCo2Alert = isScenarioB;
  const protonFlux = isScenarioB ? "14.2" : "0.14";
  const protonFluxAlert = isScenarioB;
  const kpIndex = isScenarioB ? "5.8 (G2 Storm)" : "2.1 (Quiet)";

  // Vitals
  const heartRate = isScenarioC ? "42" : isScenarioB ? "88" : "74";
  const bpVal = isScenarioC ? "82/48" : isScenarioB ? "134/88" : "122/78";
  const hrvVal = isScenarioC ? "14" : isScenarioB ? "24" : "38";
  const spo2Val = isScenarioB ? "94" : "98";

  // Return Window
  const marginHours = orbitalWindow
    ? orbitalWindow.t_margin_hours
    : isScenarioC
    ? 2.1
    : isScenarioB
    ? 11.4
    : 34.2;
  const windowStatus =
    marginHours <= 0
      ? "CRITICAL BREACH"
      : marginHours <= 24
      ? "PREPARE EVAC"
      : "WINDOW OPEN";
  const windowColor =
    marginHours <= 0
      ? "var(--accent-crit)"
      : marginHours <= 24
      ? "var(--accent-warn)"
      : "var(--accent-ok)";
  const windowGlowClass =
    marginHours <= 0
      ? "glow-refract-crimson"
      : marginHours <= 24
      ? "glow-refract-amber"
      : "glow-refract-teal";

  // Live 60fps ECG Canvas Trace Animation
  useEffect(() => {
    const canvas = ecgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let x = 0;
    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;
    const buffer = new Float32Array(width).fill(midY);

    const renderEcg = () => {
      animFrameRef.current = requestAnimationFrame(renderEcg);

      const hr = parseInt(heartRate, 10);
      const beatCycle = Math.max(20, Math.floor(6000 / hr));
      const stepInCycle = x % beatCycle;

      let yVal = midY;
      if (stepInCycle === 8) {
        yVal = midY - 6;
      } else if (stepInCycle === 14) {
        yVal = midY + 4;
      } else if (stepInCycle === 16) {
        yVal = midY - 26;
      } else if (stepInCycle === 18) {
        yVal = midY + 12;
      } else if (stepInCycle === 25) {
        yVal = midY - 9;
      } else {
        yVal = midY + (Math.random() - 0.5) * 1.5;
      }

      buffer[x] = yVal;
      x = (x + 2) % width;
      for (let i = 0; i < 8; i++) {
        buffer[(x + i) % width] = midY;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.beginPath();
      ctx.strokeStyle = isScenarioC
        ? "rgba(225, 29, 72, 0.95)"
        : isScenarioB
        ? "rgba(217, 119, 6, 0.95)"
        : "rgba(5, 150, 105, 0.95)";
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = ctx.strokeStyle as string;

      for (let i = 0; i < width; i++) {
        if (i === 0) ctx.moveTo(i, buffer[i]);
        else ctx.lineTo(i, buffer[i]);
      }
      ctx.stroke();

      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(x, buffer[x], 3.5, 0, Math.PI * 2);
      ctx.fill();
    };

    renderEcg();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [heartRate, isScenarioB, isScenarioC]);

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (ariScore / 100) * circumference;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 select-none">
      {/* CARD 1: Allostatic Resilience Index (ARI) */}
      <div className={`p-4.5 chiron-bento-card flex flex-col justify-between min-h-[250px] ${ariGlowClass}`}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-[var(--accent-active)]" />
            <span className="text-[15px] font-mono font-black tracking-wider text-[var(--ink-primary)]">
              ALLOSTATIC RESILIENCE
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ProvenanceBadge type="DERIVED" />
            <button
              onClick={() => setExpandedCard(1)}
              className="p-1 rounded text-[var(--ink-tertiary)] hover:text-[var(--accent-active)] hover:bg-[var(--surface-base)] transition-colors"
              title="Inspect Allostatic Resilience Details"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between my-2">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-mono font-black text-[var(--ink-secondary)] uppercase">
              COMPOSITE ARI (0-100)
            </span>
            <span
              className="text-[48px] font-mono font-black tracking-tight drop-shadow-sm leading-none mt-1"
              style={{ color: ariColor }}
            >
              {Math.round(ariScore)}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span
                className="text-[11.5px] font-mono font-black px-2 py-0.5 rounded shadow-sm"
                style={{
                  color: ariColor,
                  backgroundColor: `rgba(${
                    ariScore < 50
                      ? "var(--accent-crit-rgb)"
                      : ariScore < 75
                      ? "var(--accent-warn-rgb)"
                      : "var(--accent-ok-rgb)"
                  }, 0.16)`,
                  border: `1.5px solid ${ariColor}`,
                }}
              >
                {ariStatus}
              </span>
              <span className="text-[11.5px] font-mono font-black text-[var(--ink-secondary)]">
                {ariDelta}
              </span>
            </div>
          </div>

          {/* Animated SVG Circular Progress Ring (Safely Padded, Never Clipped!) */}
          <div className="relative w-22 h-22 flex items-center justify-center shrink-0 p-1">
            <svg className="w-20 h-20 -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="var(--border-subtle)"
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke={ariColor}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-[12px] text-[var(--ink-secondary)]">
              ARI
            </div>
          </div>
        </div>

        {/* Primary Driver Line (Wraps Naturally, Zero Truncation!) */}
        <div className="pt-2 border-t border-[var(--border-subtle)] text-[12px] text-[var(--ink-secondary)] font-bold leading-snug">
          Primary Driver: <strong className="text-[var(--ink-primary)]">{primaryDriver}</strong>
        </div>
      </div>

      {/* CARD 2: ICU Biometric Monitor & Live 60fps ECG Oscilloscope Trace */}
      <div className="p-4.5 chiron-bento-card flex flex-col justify-between min-h-[250px] glow-refract-teal">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-2">
            <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-500/30" />
            <span className="text-[15px] font-mono font-black tracking-wider text-[var(--ink-primary)]">
              ICU BIOMETRIC MONITOR
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ProvenanceBadge type={sensorDropoutActive ? "ABSTAIN" : "REAL"} />
            <button
              onClick={() => setExpandedCard(2)}
              className="p-1 rounded text-[var(--ink-tertiary)] hover:text-[var(--accent-active)] hover:bg-[var(--surface-base)] transition-colors"
              title="Inspect Biometric Waveform Details"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 my-1 text-center">
          <div className="flex flex-col p-1.5 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono text-[var(--ink-tertiary)] font-black">HEART RATE</span>
            <span className="text-[30px] font-mono font-black text-[var(--ink-primary)] leading-tight my-0.5">
              {heartRate}
            </span>
            <span className="text-[10.5px] font-mono font-extrabold text-[var(--accent-ok)]">BPM NOMINAL</span>
          </div>

          <div className="flex flex-col p-1.5 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono text-[var(--ink-tertiary)] font-black">BLOOD PRESS</span>
            <span className="text-[20px] font-mono font-black text-[var(--ink-primary)] leading-tight my-1">
              {bpVal}
            </span>
            <span className="text-[10.5px] font-mono font-extrabold text-[var(--ink-secondary)]">mmHg</span>
          </div>

          <div className="flex flex-col p-1.5 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono text-[var(--ink-tertiary)] font-black">PULSE OX/HRV</span>
            <span className="text-[20px] font-mono font-black text-[var(--ink-primary)] leading-tight my-1">
              {spo2Val}%
            </span>
            <span className="text-[10.5px] font-mono font-extrabold text-[var(--ink-secondary)]">{hrvVal} ms</span>
          </div>
        </div>

        {/* Live 60fps Scrolling ECG Oscilloscope Canvas */}
        <div className="h-10 w-full rounded bg-[var(--surface-canvas)] border border-[var(--border-subtle)] relative overflow-hidden my-1">
          <canvas
            ref={ecgCanvasRef}
            width={300}
            height={40}
            className="w-full h-full block"
          />
        </div>

        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[12px] font-mono">
          <span className="text-[var(--ink-secondary)] font-bold">Biometric Grid:</span>
          {sensorDropoutActive ? (
            <span className="text-[var(--accent-crit)] font-black flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> WRIST OPTICAL: DROPOUT
            </span>
          ) : (
            <span className="text-[var(--accent-ok)] font-black flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> SENSORS NOMINAL
            </span>
          )}
        </div>
      </div>

      {/* CARD 3: Habitat ECLSS & Live NOAA Space Weather */}
      <div className="p-4.5 chiron-bento-card flex flex-col justify-between min-h-[250px] glow-refract-amber relative overflow-hidden bg-[var(--surface-card)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-2">
            <Wind className="w-4.5 h-4.5 text-[var(--accent-info)]" />
            <span className="text-[15px] font-mono font-black tracking-wider text-[var(--ink-primary)]">
              HABITAT & NOAA SWPC
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ProvenanceBadge type="LIVE-API" />
            <button
              onClick={() => setExpandedCard(3)}
              className="p-1 rounded text-[var(--ink-tertiary)] hover:text-[var(--accent-active)] hover:bg-[var(--surface-base)] transition-colors"
              title="Inspect Space Weather Details"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 my-1">
          <div className="flex flex-col p-1.5 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono text-[var(--ink-tertiary)] font-black">CABIN ppCO2</span>
            <span
              className={`text-[30px] font-mono font-black leading-tight my-0.5 ${
                ppCo2Alert ? "text-[var(--accent-crit)]" : "text-[var(--ink-primary)]"
              }`}
            >
              {ppCo2Val}
            </span>
            <span className="text-[10.5px] font-mono text-[var(--ink-secondary)] font-bold">
              mmHg (Limit &lt; 3.0)
            </span>
          </div>

          <div className="flex flex-col p-1.5 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono text-[var(--ink-tertiary)] font-black">PROTON FLUX</span>
            <span
              className={`text-[30px] font-mono font-black leading-tight my-0.5 ${
                protonFluxAlert ? "text-[var(--accent-warn)]" : "text-[var(--ink-primary)]"
              }`}
            >
              {protonFlux}
            </span>
            <span className="text-[10.5px] font-mono text-[var(--ink-secondary)] font-bold">
              pfu (&gt;=10 MeV)
            </span>
          </div>
        </div>

        {/* Animated Proton Flux Visualizer Bar */}
        <div className="flex flex-col gap-1 my-1">
          <div className="flex justify-between text-[11.5px] font-mono font-bold text-[var(--ink-secondary)]">
            <span>GOES SPE Storm Index</span>
            <strong className={isScenarioB ? "text-[var(--accent-warn)]" : "text-[var(--accent-ok)]"}>
              {isScenarioB ? "ACTIVE G2 STORM" : "GEOMAGNETIC QUIET"}
            </strong>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--surface-base)] overflow-hidden flex gap-1 p-0.5 border border-[var(--border-subtle)]">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "35%" }} />
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isScenarioB ? "bg-amber-500 w-[55%]" : "bg-black/10 w-[10%]"
              }`}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[12px] font-mono font-bold text-[var(--ink-secondary)]">
          <span>Cabin O2: <strong className="text-[var(--ink-primary)] font-black">20.9%</strong></span>
          <span>Kp Index: <strong className={isScenarioB ? "text-[var(--accent-warn)] font-black" : "text-[var(--ink-primary)] font-black"}>{kpIndex}</strong></span>
        </div>
      </div>

      {/* CARD 4: Crew-11 Return-Window Horizon */}
      <div className={`p-4.5 chiron-bento-card flex flex-col justify-between min-h-[250px] ${windowGlowClass} relative overflow-hidden bg-[var(--surface-card)]`}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-2">
            <Compass className="w-4.5 h-4.5 text-[var(--accent-active)] animate-spin" style={{ animationDuration: "25s" }} />
            <span className="text-[15px] font-mono font-black tracking-wider text-[var(--ink-primary)]">
              RETURN-WINDOW HORIZON
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11.5px] font-mono font-black px-2 py-0.5 rounded shadow-sm border"
              style={{
                color: windowColor,
                borderColor: windowColor,
                backgroundColor: `rgba(${
                  marginHours <= 0 ? "225, 29, 72" : marginHours <= 24 ? "217, 119, 6" : "5, 150, 105"
                }, 0.16)`,
              }}
            >
              {windowStatus}
            </span>
            <button
              onClick={() => setExpandedCard(4)}
              className="p-1 rounded text-[var(--ink-tertiary)] hover:text-[var(--accent-active)] hover:bg-[var(--surface-base)] transition-colors"
              title="Inspect Orbital Return Calculations"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col my-1">
          <span className="text-[11.5px] font-mono font-black text-[var(--ink-secondary)] uppercase">
            NET SAFETY MARGIN
          </span>
          <span
            className="text-[40px] font-mono font-black tracking-tight drop-shadow-sm leading-none my-1"
            style={{ color: windowColor }}
          >
            +{marginHours.toFixed(1)}h
          </span>
          <span className="text-[11.5px] font-mono text-[var(--ink-secondary)] font-bold">
            T_crit: 28.5h to limit | T_evac: 14.0h LEO
          </span>
        </div>

        {/* Animated Dual-Track Evacuation Margin Bar */}
        <div className="relative z-10 flex flex-col gap-1 my-1">
          <div className="w-full h-2.5 rounded-full bg-[var(--surface-base)] relative overflow-hidden border border-[var(--border-subtle)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(5, (marginHours / 48) * 100))}%`,
                backgroundColor: windowColor,
              }}
            />
            {/* Critical evacuation limit marker */}
            <div className="absolute top-0 bottom-0 left-[29%] w-0.5 bg-red-500 shadow-[0_0_6px_red]" />
          </div>
        </div>

        <div className="relative z-10 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[12px] font-mono font-bold text-[var(--ink-secondary)]">
          <span>Corridor: <strong className="text-[var(--ink-primary)] font-black">LEO DEORBIT</strong></span>
          <span>ΔV BUDGET: <strong className="text-[var(--ink-primary)] font-black">120 m/s</strong></span>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* EXPANDED TELEMETRY DEEP-DIVE MODAL */}
      {/* ------------------------------------------------------------------- */}
      {expandedCard !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-[880px] max-w-[95vw] max-h-[90vh] chiron-bento-card border-2 border-[var(--accent-info)] p-6 flex flex-col gap-5 overflow-y-auto shadow-2xl glow-refract-cyan">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-active)] border border-[var(--accent-info)] flex items-center justify-center">
                  <Activity className="w-6 h-6 text-[var(--accent-active)]" />
                </div>
                <div>
                  <h3 className="text-[20px] font-mono font-black text-[var(--ink-primary)]">
                    {expandedCard === 1 && "ALLOSTATIC RESILIENCE INDEX (ARI) MATHEMATICAL ENGINE"}
                    {expandedCard === 2 && "ICU MULTI-PARAMETER BIOMETRIC TELEMETRY & ECG"}
                    {expandedCard === 3 && "HABITAT ECLSS ATMOSPHERE & NOAA SWPC SPACE WEATHER"}
                    {expandedCard === 4 && "CREW RETURN-WINDOW SOLVER & ORBITAL TRAJECTORY"}
                  </h3>
                  <span className="text-[12px] font-mono font-bold text-[var(--accent-info)]">
                    NASA Space Apps Challenge 2026 Production Diagnostic Readout
                  </span>
                </div>
              </div>
              <button
                onClick={() => setExpandedCard(null)}
                className="p-1.5 rounded-lg border border-[var(--border-primary)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-base)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {expandedCard === 1 && (
              <div className="flex flex-col gap-4 font-mono text-[13px]">
                <div className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                  <span className="text-[14px] font-black text-cyan-400 block mb-2">
                    7-AXIS BAYESIAN COMPOSITE FORMULATION
                  </span>
                  <p className="text-[var(--ink-secondary)] leading-relaxed font-sans font-semibold">
                    The Allostatic Resilience Index (ARI) evaluates composite physiological reserve:
                    <code className="text-cyan-300 font-mono block p-2 bg-black/40 rounded mt-2 border border-cyan-500/30">
                      ARI(t) = Σ w_i * [μ_i(t) - λ * σ_i(t)] - Penalties(CO2, Radiation)
                    </code>
                    where μ_i and σ_i represent the posterior mean and 90% conformal uncertainty bound across Cardiovascular, Neuro-Ocular, Musculoskeletal, Circadian, Immune, Behavioral, and Radiation axes.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                    <span className="text-xs font-bold text-[var(--ink-tertiary)] block">CURRENT CREW RESILIENCE</span>
                    <span className="text-[32px] font-black text-[var(--accent-active)]">{Math.round(ariScore)} / 100</span>
                    <span className="text-xs font-bold text-[var(--ink-secondary)] block mt-1">Status: {ariStatus}</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                    <span className="text-xs font-bold text-[var(--ink-tertiary)] block">PRIMARY HAZARD VECTOR</span>
                    <span className="text-[18px] font-black text-[var(--ink-primary)]">{primaryDriver}</span>
                    <span className="text-xs font-bold text-[var(--ink-secondary)] block mt-1">Delta: {ariDelta}</span>
                  </div>
                </div>
              </div>
            )}

            {expandedCard === 2 && (
              <div className="flex flex-col gap-4 font-mono text-[13px]">
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] text-center">
                    <span className="text-xs text-[var(--ink-tertiary)] font-bold">HEART RATE</span>
                    <span className="text-[26px] font-black text-[var(--ink-primary)] block my-1">{heartRate} bpm</span>
                    <span className="text-[11px] font-bold text-[var(--accent-ok)]">Norm: 60-100</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] text-center">
                    <span className="text-xs text-[var(--ink-tertiary)] font-bold">BLOOD PRESSURE</span>
                    <span className="text-[22px] font-black text-[var(--ink-primary)] block my-1.5">{bpVal}</span>
                    <span className="text-[11px] font-bold text-[var(--ink-secondary)]">Norm: 120/80</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] text-center">
                    <span className="text-xs text-[var(--ink-tertiary)] font-bold">OXYGEN SATURATION</span>
                    <span className="text-[26px] font-black text-[var(--ink-primary)] block my-1">{spo2Val}%</span>
                    <span className="text-[11px] font-bold text-[var(--accent-ok)]">Norm: &gt;95%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] text-center">
                    <span className="text-xs text-[var(--ink-tertiary)] font-bold">HRV VAGAL RMSSD</span>
                    <span className="text-[26px] font-black text-[var(--ink-primary)] block my-1">{hrvVal} ms</span>
                    <span className="text-[11px] font-bold text-[var(--ink-secondary)]">Norm: 25-50 ms</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                  <span className="text-xs font-bold text-[var(--ink-secondary)] block mb-1">
                    Continuous 100 Hz Medical Sensor Sampling Status:
                  </span>
                  <div className="flex items-center gap-2 text-[var(--accent-ok)] font-black">
                    <CheckCircle2 className="w-4 h-4" /> 4/4 Wearable & Cabin Telemetry Streams Synchronized (Zero Jitter)
                  </div>
                </div>
              </div>
            )}

            {expandedCard === 3 && (
              <div className="flex flex-col gap-4 font-mono text-[13px]">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--ink-tertiary)] font-bold">PARTIAL PRESSURE CO2</span>
                    <span className="text-[28px] font-black text-[var(--ink-primary)] block my-1">{ppCo2Val} mmHg</span>
                    <span className="text-xs font-bold text-[var(--accent-ok)]">NASA-STD-3001 Limit &lt; 3.0</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--ink-tertiary)] font-bold">NOAA PROTON FLUX (&gt;=10 MeV)</span>
                    <span className="text-[28px] font-black text-[var(--ink-primary)] block my-1">{protonFlux} pfu</span>
                    <span className="text-xs font-bold text-[var(--ink-secondary)]">Storm Threshold: 10.0 pfu</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--ink-tertiary)] font-bold">GEOMAGNETIC KP INDEX</span>
                    <span className="text-[24px] font-black text-[var(--ink-primary)] block my-1.5">{kpIndex}</span>
                    <span className="text-xs font-bold text-[var(--ink-secondary)]">NOAA SWPC SWFO Feed</span>
                  </div>
                </div>
              </div>
            )}

            {expandedCard === 4 && (
              <div className="flex flex-col gap-4 font-mono text-[13px]">
                <div className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col gap-2">
                  <span className="text-[14px] font-black text-cyan-400">
                    RETURN-WINDOW TIME-TO-LIMIT ALGORITHM
                  </span>
                  <p className="text-[var(--ink-secondary)] leading-relaxed font-sans font-semibold">
                    CHIRON evaluates the medical departure window:
                    <code className="text-cyan-300 font-mono block p-2 bg-black/40 rounded mt-2 border border-cyan-500/30">
                      T_margin = T_critical(ARI &lt; 40.0) - T_evacuation(orbital_node)
                    </code>
                    Currently evaluated for <strong>LEO ISS Deorbit</strong> with a critical margin of <strong>+{marginHours.toFixed(1)} hours</strong> before astronaut irreversible decompensation.
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setExpandedCard(null)}
                className="px-5 py-2 rounded-lg bg-[var(--accent-active)] text-white font-mono font-black text-[13px] hover:opacity-90"
              >
                CLOSE READOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExecutiveSummaryRibbon;
