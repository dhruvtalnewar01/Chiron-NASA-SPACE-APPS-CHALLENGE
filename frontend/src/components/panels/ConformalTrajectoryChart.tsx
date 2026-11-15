// ---------------------------------------------------------------------------
// CHIRON v4.0 - ConformalTrajectoryChart
// Row 3 Left (col-span-7): 14-Day Conformal Trajectory Fan Chart & Live Counterfactual Sliders.
// High-visibility animated chart (height: 300px) with 14px labels, glowing trajectories,
// pulsing NOW beacon, shaded 90% Conformal Uncertainty Fan, and green recovery curve
// coupled live to the Integrated Counterfactual Sliders and NASA-STD-3001 Veto Banner.
// ---------------------------------------------------------------------------

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import ProvenanceBadge from "../ui/ProvenanceBadge";
import {
  AlertTriangle,
  Radio,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Play,
} from "lucide-react";

export type ViewAxis =
  | "ARI"
  | "CARDIO"
  | "NEURO"
  | "BONE"
  | "SLEEP"
  | "IMMUNE"
  | "BEHAV"
  | "RAD";

export interface ConformalTrajectoryChartProps {
  counterfactualActive?: boolean;
  onSimulateCounterfactual?: (cm: any) => void;
  sensorDropoutActive?: boolean;
  onToggleDropout?: () => void;
  selectedAxis?: string | null;
  onSelectAxis?: (axis: string) => void;
  activeScenario?: string;
}

interface TrajectoryPoint {
  day: number;
  label: string;
  isHistorical: boolean;
  value: number;
  ciLower: number;
  ciUpper: number;
  counterfactualValue: number | null;
}

const AXIS_BASES: Record<ViewAxis, { baseline: number; driftRate: number; name: string }> = {
  ARI: { baseline: 82, driftRate: 0.95, name: "Composite Allostatic Resilience" },
  CARDIO: { baseline: 84, driftRate: 0.8, name: "Cardiovascular / Orthostatic" },
  NEURO: { baseline: 80, driftRate: 1.45, name: "Neuro-Ocular SANS" },
  BONE: { baseline: 92, driftRate: 0.35, name: "Thoracolumbar BMD" },
  SLEEP: { baseline: 78, driftRate: 0.75, name: "Sleep & Circadian Phase" },
  IMMUNE: { baseline: 85, driftRate: 0.6, name: "Immune / Cytokine Balance" },
  BEHAV: { baseline: 82, driftRate: 0.5, name: "Behavioral & Vocal Stability" },
  RAD: { baseline: 90, driftRate: 1.1, name: "Radiation Burden Reserve" },
};

export function ConformalTrajectoryChart({
  counterfactualActive = false,
  onSimulateCounterfactual,
  sensorDropoutActive: externalDropout,
  onToggleDropout,
  selectedAxis = null,
  onSelectAxis,
  activeScenario = "A",
}: ConformalTrajectoryChartProps) {
  const [internalDropout, setInternalDropout] = useState<boolean>(false);
  const isDropout = externalDropout !== undefined ? externalDropout : internalDropout;

  const handleToggleDropout = () => {
    if (onToggleDropout) {
      onToggleDropout();
    } else {
      setInternalDropout(!internalDropout);
    }
  };

  const [activeHorizon, setActiveHorizon] = useState<"14d" | "72h">("14d");
  const [activeAxis, setActiveAxis] = useState<ViewAxis>("ARI");

  // Counterfactual Simulator Slider State
  const [co2ScrubberBoostPct, setCo2ScrubberBoostPct] = useState<number>(85);
  const [aredIntensityPct, setAredIntensityPct] = useState<number>(80);
  const [lightingKelvin, setLightingKelvin] = useState<number>(4500);
  const [shelterTiming, setShelterTiming] = useState<"IMMEDIATE" | "DELAYED">("IMMEDIATE");
  const [selectedMed, setSelectedMed] = useState<string>("NONE");

  // NASA-STD-3001 Veto Check State
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

  useEffect(() => {
    if (selectedAxis) {
      const match = selectedAxis.toUpperCase() as ViewAxis;
      if (AXIS_BASES[match]) {
        setActiveAxis(match);
      }
    }
  }, [selectedAxis]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(850);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute live counterfactual recovery effect based on sliders
  const liveRecoveryBoost = useMemo(() => {
    let boost = (co2ScrubberBoostPct / 100) * 4.5 + (aredIntensityPct / 100) * 3.5;
    if (shelterTiming === "IMMEDIATE" && activeScenario === "B") boost += 5.0;
    if (selectedMed === "ACETAZOLAMIDE") boost += 4.0;
    return boost;
  }, [co2ScrubberBoostPct, aredIntensityPct, shelterTiming, selectedMed, activeScenario]);

  // Generate Smooth Clinical Time Series (-7d to +14d)
  const trajectoryData = useMemo(() => {
    const config = AXIS_BASES[activeAxis];
    const maxFutureDays = activeHorizon === "14d" ? 14 : 3;
    const points: TrajectoryPoint[] = [];

    let scenarioDrift = 1.0;
    if (activeScenario === "B" && (activeAxis === "RAD" || activeAxis === "IMMUNE" || activeAxis === "ARI")) {
      scenarioDrift = 2.4;
    } else if (activeScenario === "C" && (activeAxis === "CARDIO" || activeAxis === "ARI" || activeAxis === "BEHAV")) {
      scenarioDrift = 3.2;
    } else if (activeScenario === "A" && (activeAxis === "NEURO" || activeAxis === "ARI")) {
      scenarioDrift = 1.8;
    }

    for (let d = -7; d <= 0; d++) {
      const historicalProg = (d + 7) / 7;
      const val = config.baseline - historicalProg * 12 * (config.driftRate / 1.0);
      points.push({
        day: d,
        label: d === 0 ? "NOW" : `${d}d`,
        isHistorical: true,
        value: Math.round(val * 10) / 10,
        ciLower: Math.round((val - 4.2) * 10) / 10,
        ciUpper: Math.round((val + 4.2) * 10) / 10,
        counterfactualValue: null,
      });
    }

    const nowVal = points[points.length - 1].value;
    for (let d = 1; d <= maxFutureDays; d++) {
      const forecastVal = Math.max(
        15,
        nowVal - d * 2.2 * config.driftRate * scenarioDrift * Math.exp(-0.03 * d)
      );

      let uncertaintyWidth = 6.0 + Math.sqrt(d) * 5.2;
      if (isDropout) {
        uncertaintyWidth += 16.5;
      }

      const recoveryDelta = d * 1.6 + liveRecoveryBoost;
      const cfVal = Math.min(94, forecastVal + recoveryDelta + (counterfactualActive ? 8.5 : 3.0));

      points.push({
        day: d,
        label: `+${d}d`,
        isHistorical: false,
        value: Math.round(forecastVal * 10) / 10,
        ciLower: Math.max(5, Math.round((forecastVal - uncertaintyWidth) * 10) / 10),
        ciUpper: Math.min(100, Math.round((forecastVal + uncertaintyWidth) * 10) / 10),
        counterfactualValue: Math.round(cfVal * 10) / 10,
      });
    }

    return points;
  }, [activeAxis, activeHorizon, isDropout, counterfactualActive, activeScenario, liveRecoveryBoost]);

  // Chart Layout Math
  const height = 280;
  const padding = { top: 32, right: 40, bottom: 36, left: 54 };
  const plotW = Math.max(200, containerWidth - padding.left - padding.right);
  const plotH = Math.max(70, height - padding.top - padding.bottom);

  const minDay = -7;
  const maxDay = activeHorizon === "14d" ? 14 : 3;
  const dayRange = maxDay - minDay;

  const getX = useCallback(
    (day: number) => padding.left + ((day - minDay) / dayRange) * plotW,
    [minDay, dayRange, plotW, padding.left]
  );

  const getY = useCallback(
    (score: number) => padding.top + plotH - (score / 100) * plotH,
    [plotH, padding.top]
  );

  const nowX = getX(0);
  const criticalY = getY(40);

  const histPoints = trajectoryData.filter((p) => p.day <= 0);
  const histPath = histPoints.reduce((acc, p, idx) => {
    return `${acc} ${idx === 0 ? "M" : "L"} ${getX(p.day)} ${getY(p.value)}`;
  }, "");

  const forecastPoints = trajectoryData.filter((p) => p.day >= 0);
  const forecastPath = forecastPoints.reduce((acc, p, idx) => {
    return `${acc} ${idx === 0 ? "M" : "L"} ${getX(p.day)} ${getY(p.value)}`;
  }, "");

  const fanUpper = forecastPoints.map((p) => `${getX(p.day)} ${getY(p.ciUpper)}`).join(" L ");
  const fanLower = [...forecastPoints]
    .reverse()
    .map((p) => `${getX(p.day)} ${getY(p.ciLower)}`)
    .join(" L ");
  const fanPolygon = `M ${fanUpper} L ${fanLower} Z`;

  const cfPath = forecastPoints.reduce((acc, p, idx) => {
    const val = p.counterfactualValue ?? p.value;
    return `${acc} ${idx === 0 ? "M" : "L"} ${getX(p.day)} ${getY(val)}`;
  }, "");

  const axesButtons: { id: ViewAxis; label: string }[] = [
    { id: "ARI", label: "COMPOSITE ARI" },
    { id: "CARDIO", label: "01 CARDIO" },
    { id: "NEURO", label: "02 NEURO" },
    { id: "BONE", label: "03 BONE" },
    { id: "SLEEP", label: "04 SLEEP" },
    { id: "IMMUNE", label: "05 IMMUNE" },
    { id: "BEHAV", label: "06 BEHAV" },
    { id: "RAD", label: "07 RAD" },
  ];

  return (
    <div
      ref={containerRef}
      className="w-full chiron-bento-card p-5 flex flex-col justify-between select-none"
    >
      {/* 1. Sub-Header Controls */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-xs font-mono font-black text-[var(--ink-secondary)] uppercase tracking-wider mr-1">
            TRAJECTORY:
          </span>
          {axesButtons.map((ax) => (
            <button
              key={ax.id}
              onClick={() => {
                setActiveAxis(ax.id);
                if (onSelectAxis && ax.id !== "ARI") {
                  onSelectAxis(ax.id.toLowerCase());
                }
              }}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                activeAxis === ax.id
                  ? "bg-[var(--surface-active)] text-[var(--accent-active)] border-[var(--accent-info)] glow-refract-cyan shadow-sm"
                  : "bg-black/20 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border-transparent"
              }`}
            >
              {ax.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleToggleDropout}
            className={`px-3 py-1.5 text-xs font-mono font-black flex items-center gap-1.5 border rounded-lg transition-all ${
              isDropout
                ? "bg-red-500/25 text-[var(--accent-crit)] border-[var(--accent-crit)] glow-refract-crimson animate-pulse"
                : "bg-black/20 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border-[var(--border-subtle)]"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            {isDropout ? "SENSOR DROPOUT [ACTIVE]" : "SIMULATE DROPOUT"}
          </button>

          <ProvenanceBadge type={isDropout ? "ABSTAIN" : counterfactualActive ? "SIMULATED" : "DERIVED"} />

          <div className="flex border border-[var(--border-subtle)] rounded-lg p-0.5 bg-black/20">
            <button
              onClick={() => setActiveHorizon("72h")}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded ${
                activeHorizon === "72h"
                  ? "bg-[var(--surface-active)] text-[var(--accent-active)] shadow-inner"
                  : "text-[var(--ink-secondary)]"
              }`}
            >
              72H
            </button>
            <button
              onClick={() => setActiveHorizon("14d")}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded ${
                activeHorizon === "14d"
                  ? "bg-[var(--surface-active)] text-[var(--accent-active)] shadow-inner"
                  : "text-[var(--ink-secondary)]"
              }`}
            >
              14D
            </button>
          </div>
        </div>
      </div>

      {/* 2. SVG Conformal Forecast Chart (height: 280px) */}
      <div className="w-full h-[280px] relative rounded-xl bg-black/30 border border-[var(--border-subtle)] p-2 mb-4 overflow-hidden">
        <svg width="100%" height="100%" viewBox={`0 0 ${containerWidth} ${height}`} className="overflow-visible">
          {[20, 40, 60, 80, 100].map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotW}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1.2"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="'JetBrains Mono', monospace"
                  fill="var(--ink-secondary)"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* NASA-STD-3001 Critical Threshold Line (y = 40.0) */}
          <line
            x1={padding.left}
            y1={criticalY}
            x2={padding.left + plotW}
            y2={criticalY}
            stroke="var(--accent-crit)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />
          <text
            x={padding.left + plotW - 12}
            y={criticalY - 8}
            textAnchor="end"
            fontSize="12"
            fontFamily="'JetBrains Mono', monospace"
            fill="var(--accent-crit)"
            fontWeight="900"
          >
            NASA-STD-3001 CRITICAL LIMIT (40.0)
          </text>

          {/* Vertical NOW Line */}
          <line
            x1={nowX}
            y1={padding.top}
            x2={nowX}
            y2={padding.top + plotH}
            stroke="var(--accent-active)"
            strokeWidth="2.5"
            strokeDasharray="4 3"
          />
          <text
            x={nowX}
            y={padding.top - 8}
            textAnchor="middle"
            fontSize="12.5"
            fontFamily="'JetBrains Mono', monospace"
            fill="var(--accent-active)"
            fontWeight="900"
          >
            NOW (MET 47d)
          </text>

          {/* Shaded 90% Conformal Uncertainty Fan */}
          <path
            d={fanPolygon}
            fill={isDropout ? "rgba(244, 63, 94, 0.25)" : "rgba(14, 165, 233, 0.2)"}
            stroke={isDropout ? "rgba(244, 63, 94, 0.6)" : "rgba(14, 165, 233, 0.5)"}
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Historical Baseline Curve (-7d to NOW) */}
          <path
            d={histPath}
            fill="none"
            stroke="var(--ink-primary)"
            strokeWidth="3.2"
          />

          {/* Forecasted Trajectory Curve (NOW to +14d) */}
          <path
            d={forecastPath}
            fill="none"
            stroke={isDropout ? "var(--accent-crit)" : "var(--accent-active)"}
            strokeWidth="3.5"
          />

          {/* Counterfactual Recovery Curve (Dashed Green) */}
          <path
            d={cfPath}
            fill="none"
            stroke="var(--accent-ok)"
            strokeWidth="3"
            strokeDasharray="6 4"
          />

          {/* Data Points */}
          {trajectoryData
            .filter((p) => p.day % 2 === 0 || p.day === 0)
            .map((p) => (
              <circle
                key={p.day}
                cx={getX(p.day)}
                cy={getY(p.value)}
                r={p.day === 0 ? 5.5 : 4}
                fill={p.day === 0 ? "var(--accent-active)" : "var(--ink-primary)"}
                stroke="var(--surface-canvas)"
                strokeWidth="2"
              />
            ))}

          {/* Day Labels */}
          {trajectoryData
            .filter((p) => p.day === -7 || p.day === -3 || p.day === 0 || p.day === 3 || p.day === 7 || p.day === 14)
            .map((p) => (
              <text
                key={p.day}
                x={getX(p.day)}
                y={padding.top + plotH + 24}
                textAnchor="middle"
                fontSize="12"
                fontFamily="'JetBrains Mono', monospace"
                fill={p.day === 0 ? "var(--accent-active)" : "var(--ink-secondary)"}
                fontWeight={p.day === 0 ? "900" : "bold"}
              >
                {p.label}
              </text>
            ))}
        </svg>

        {/* Chart Legend */}
        <div className="absolute top-3 left-16 flex items-center gap-4 text-xs font-mono px-3 py-1.5 rounded-lg bg-black/70 border border-[var(--border-subtle)] shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-[var(--ink-primary)] rounded" />
            <span className="text-[var(--ink-secondary)] font-bold">Historical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-[var(--accent-active)] rounded" />
            <span className="text-[var(--ink-secondary)] font-bold">OU Drift Forecast</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-2.5 bg-[var(--accent-active)] opacity-35 rounded" />
            <span className="text-[var(--ink-secondary)] font-bold">90% Conformal Fan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 border-b-2 border-dashed border-[var(--accent-ok)]" />
            <span className="text-[var(--accent-ok)] font-bold">Counterfactual</span>
          </div>
        </div>
      </div>

      {/* 3. Integrated Counterfactual Simulator Controls & NASA-STD-3001 Safety Veto Banner */}
      <div className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col gap-3.5">
        {/* Safety Veto Banner */}
        <div
          className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
            vetoResult.vetoed
              ? "border-[var(--accent-crit)] bg-red-500/18 text-[var(--accent-crit)] glow-refract-crimson shadow-md"
              : "border-[var(--accent-ok)] bg-emerald-500/15 text-[var(--accent-ok)] glow-refract-teal shadow-md"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {vetoResult.vetoed ? (
              <ShieldAlert className="w-5 h-5 shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 shrink-0" />
            )}
            <div className="flex flex-col text-xs font-mono">
              <span className="font-black text-[14.5px]">
                {vetoResult.vetoed ? `VETO: ${vetoResult.rule_id}` : "NASA-STD-3001 COMPLIANT"}
              </span>
              <span className="text-[12.5px] text-[var(--ink-secondary)] font-bold leading-tight">
                {vetoResult.reason}
              </span>
            </div>
          </div>
          <ProvenanceBadge type={vetoResult.vetoed ? "ABSTAIN" : "REAL"} />
        </div>

        {/* 4 Interactive Hardware Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Slider 1: Cabin CO2 Scrubber */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[var(--ink-secondary)] font-bold text-[12.5px]">CDRA CO2 Scrubber Boost</span>
              <span className="font-black text-[14px] text-[var(--ink-primary)]">{co2ScrubberBoostPct}% (1.8 mmHg target)</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={co2ScrubberBoostPct}
              onChange={(e) => setCo2ScrubberBoostPct(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--accent-active)] cursor-pointer h-2 bg-[var(--surface-canvas)] rounded-full"
            />
          </div>

          {/* Slider 2: ARED Exercise Load */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[var(--ink-secondary)] font-bold text-[12.5px]">ARED Resistive Exercise Load</span>
              <span className="font-black text-[14px] text-[var(--ink-primary)]">{aredIntensityPct}% ({Math.round(aredIntensityPct * 0.9)} kg)</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={aredIntensityPct}
              onChange={(e) => setAredIntensityPct(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--accent-active)] cursor-pointer h-2 bg-[var(--surface-canvas)] rounded-full"
            />
          </div>

          {/* Slider 3: Circadian Lighting */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[var(--ink-secondary)] font-bold text-[12.5px]">Circadian Lighting Kelvin</span>
              <span className="font-black text-[14px] text-[var(--ink-primary)]">{lightingKelvin} K</span>
            </div>
            <input
              type="range"
              min="2700"
              max="6500"
              step="100"
              value={lightingKelvin}
              onChange={(e) => setLightingKelvin(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--accent-active)] cursor-pointer h-2 bg-[var(--surface-canvas)] rounded-full"
            />
          </div>

          {/* Toggle: Storm Shelter Timing */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-[var(--border-subtle)]">
            <div className="flex flex-col text-xs font-mono">
              <span className="font-black text-[var(--ink-primary)]">Water-Wall Storm Shelter</span>
              <span className="text-[11px] text-[var(--ink-secondary)] font-semibold">SPE Radiation Barrier</span>
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
        </div>

        {/* Med-Kit Formulary Regimen & Commit Button */}
        <div className="flex flex-col md:flex-row gap-3 pt-1">
          <div className="flex-1 flex flex-col gap-1">
            <select
              value={selectedMed}
              onChange={(e) => setSelectedMed(e.target.value)}
              className="p-2 text-xs font-mono bg-black/30 border border-[var(--border-subtle)] text-[var(--ink-primary)] outline-none rounded-lg font-bold"
            >
              <option value="NONE">[SELECT PHARMACOLOGICAL REGIMEN]</option>
              <option value="ACETAZOLAMIDE">Acetazolamide 250mg PO (SANS CSF Pressure Reduction)</option>
              <option value="MIDODRINE">Oral Rehydration Salts + Midodrine 5mg (Orthostatic Support)</option>
              <option value="MODAFINIL">Modafinil 100mg PO (Vigilance Countermeasure)</option>
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
            className={`py-2 px-5 text-xs font-mono font-black flex items-center justify-center gap-2 rounded-lg border transition-all ${
              vetoResult.vetoed
                ? "bg-black/20 text-[var(--ink-tertiary)] border-[var(--border-subtle)] cursor-not-allowed"
                : "bg-[var(--accent-active)] text-black border-[var(--accent-active)] hover:opacity-90 glow-refract-cyan shadow-md"
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>APPLY COUNTERMEASURE PLAN</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConformalTrajectoryChart;
