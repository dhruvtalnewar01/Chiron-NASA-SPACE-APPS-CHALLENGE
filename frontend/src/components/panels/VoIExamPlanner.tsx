// ---------------------------------------------------------------------------
// CHIRON v4.0 - VoIExamPlanner
// Row 3 Right (col-span-5): Value-of-Information (VoI) Next-Best-Measurement Planner.
// Displays all 5 Ranked Diagnostic Procedures with bold 17.5px titles, 15px VoI scores,
// -64.2% CI badges, and cyan EXECUTE GUIDED EXAM buttons opening the Interactive Modal.
// Zero clipping: spacious layout with generous padding and 3D glassmorphic finish.
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import {
  Activity,
  Play,
  Camera,
  Timer,
  CheckCircle2,
  Eye,
  Heart,
  Radio,
  FileSpreadsheet,
} from "lucide-react";
import ProvenanceBadge from "../ui/ProvenanceBadge";

export interface RankedVoIItem {
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

interface VoIExamPlannerProps {
  activeCrewId: string;
  onLogMeasurement?: (axis: string, value: number, procId: string) => void;
}

export function VoIExamPlanner({ activeCrewId, onLogMeasurement }: VoIExamPlannerProps) {
  const [selectedExam, setSelectedExam] = useState<RankedVoIItem | null>(null);
  const [onsdCaliperMm, setOnsdCaliperMm] = useState<number>(5.9);
  const [pvtReactionMs, setPvtReactionMs] = useState<number>(242);
  const [pvtGameState, setPvtGameState] = useState<"WAIT" | "READY" | "CLICKED">("READY");
  const [pvtStartTime, setPvtStartTime] = useState<number>(0);

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
      onLogMeasurement(selectedExam.target_axes[0], committedVal, selectedExam.id);
    }
    setSelectedExam(null);
  };

  return (
    <div className="w-full chiron-bento-card p-5 flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--accent-ok)]" />
          <h2 className="text-[19px] font-mono font-black tracking-wider text-[var(--ink-primary)]">
            VOI NEXT-BEST-MEASUREMENT PLANNER
          </h2>
        </div>
        <ProvenanceBadge type="DERIVED" />
      </div>

      {/* 5 Ranked Diagnostic Cards (Zero Clipping!) */}
      <div className="flex flex-col gap-3 my-1">
        {DEFAULT_VOI_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
              item.rank === 1
                ? "bg-[var(--surface-active)]/30 border-[var(--accent-ok)] glow-refract-teal shadow-md"
                : "bg-[var(--surface-panel)] border-[var(--border-primary)] hover:border-[var(--border-strong)]"
            }`}
          >
            {/* Top Line: Rank, Title, VoI Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[12.5px] font-mono font-black px-2 py-0.5 rounded shadow-sm ${
                    item.rank === 1
                      ? "bg-[var(--accent-ok)] text-white"
                      : "bg-black/30 text-[var(--ink-primary)]"
                  }`}
                >
                  #{item.rank}
                </span>
                <span className="text-[17.5px] font-mono font-black text-[var(--ink-primary)] tracking-tight">
                  {item.name}
                </span>
              </div>
              <span className="text-[14.5px] font-mono font-black text-[var(--accent-ok)] px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                +{item.voi_bits.toFixed(3)} bits/min
              </span>
            </div>

            {/* Description */}
            <div className="text-[13.5px] font-semibold text-[var(--ink-secondary)] truncate my-1.5">
              {item.description}
            </div>

            {/* Bottom: Uncertainty reduction pill & Action Button */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[13px] font-mono">
              <span className="text-[var(--accent-active)] font-black">
                -{item.uncertainty_reduction_pct}% CI IN {item.duration_minutes} MIN
              </span>
              <button
                onClick={() => {
                  setSelectedExam(item);
                  if (item.id === "M2_PVT_VOCAL") startPvtTest();
                }}
                className="px-3.5 py-1.5 bg-[var(--surface-active)] hover:bg-[var(--accent-ok)] hover:text-white text-[var(--accent-ok)] border border-[var(--accent-ok)] font-mono font-black text-[12.5px] transition-all flex items-center gap-1.5 rounded-md shadow-sm active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>EXECUTE GUIDED EXAM</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Guided Diagnostic Exam Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-[580px] chiron-bento-card border-2 border-[var(--accent-ok)] p-6 flex flex-col gap-4 shadow-2xl glow-refract-teal">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-[var(--accent-ok)]" />
                <span className="text-[18px] font-mono font-black text-[var(--ink-primary)]">
                  GUIDED EXAM: {selectedExam.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="text-[13px] font-mono font-bold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              >
                DISMISS
              </button>
            </div>

            {/* Ocular POCUS Ultrasound */}
            {selectedExam.id === "M3_OCULAR_POCUS" && (
              <div className="flex flex-col gap-3 font-mono">
                <p className="text-[14px] text-[var(--ink-secondary)]">
                  Position ultrasound probe transversely over closed eyelid. Adjust caliper 3mm posterior to the globe retrobulbar margin.
                </p>
                <div className="p-3 bg-[var(--surface-base)] rounded-lg flex flex-col gap-2">
                  <div className="flex justify-between text-[14px] font-black">
                    <span>ONSD Caliper Measurement:</span>
                    <span className="text-[var(--accent-active)]">{onsdCaliperMm.toFixed(2)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="7.5"
                    step="0.05"
                    value={onsdCaliperMm}
                    onChange={(e) => setOnsdCaliperMm(parseFloat(e.target.value))}
                    className="w-full accent-[var(--accent-active)]"
                  />
                  <div className="flex justify-between text-[11px] text-[var(--ink-tertiary)]">
                    <span>4.0 mm (Nominal)</span>
                    <span>5.0 mm (Threshold)</span>
                    <span>7.5 mm (Severe Edema)</span>
                  </div>
                </div>
              </div>
            )}

            {/* PVT Reaction Speed Game */}
            {selectedExam.id === "M2_PVT_VOCAL" && (
              <div className="flex flex-col gap-3 font-mono">
                <p className="text-[14px] text-[var(--ink-secondary)]">
                  Psychomotor Vigilance Test: Click the target circle immediately when it illuminates green.
                </p>
                <div
                  onClick={handlePvtClick}
                  className={`w-full h-32 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                    pvtGameState === "READY"
                      ? "bg-emerald-500 text-black font-black text-2xl shadow-lg glow-refract-teal"
                      : pvtGameState === "WAIT"
                      ? "bg-amber-500/20 text-amber-300 font-bold text-lg"
                      : "bg-[var(--surface-base)] text-[var(--ink-primary)] font-bold text-lg"
                  }`}
                >
                  {pvtGameState === "READY" && "CLICK NOW!"}
                  {pvtGameState === "WAIT" && "WAIT FOR GREEN..."}
                  {pvtGameState === "CLICKED" && `Reaction: ${pvtReactionMs} ms`}
                </div>
              </div>
            )}

            {/* Other exams: BP Cuff or Dosimeter */}
            {selectedExam.id !== "M3_OCULAR_POCUS" && selectedExam.id !== "M2_PVT_VOCAL" && (
              <div className="flex flex-col gap-3 font-mono">
                <p className="text-[14px] text-[var(--ink-secondary)]">
                  Procedure: {selectedExam.description}. Connect patient interface and initiate 2-minute acquisition cycle.
                </p>
                <div className="p-3 bg-[var(--surface-base)] rounded-lg flex items-center justify-between">
                  <span className="text-[13px] text-[var(--ink-primary)] font-bold">Hardware Link:</span>
                  <span className="text-[13px] text-[var(--accent-ok)] font-black">DEVICE DETECTED [READY]</span>
                </div>
              </div>
            )}

            {/* Commit / Submit Button */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)] font-mono">
              <button
                onClick={() => setSelectedExam(null)}
                className="px-4 py-2 text-[13px] font-bold rounded text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              >
                CANCEL
              </button>
              <button
                onClick={handleCommitMeasurement}
                className="px-5 py-2 text-[13px] font-black rounded bg-[var(--accent-ok)] text-white hover:opacity-90 shadow-md"
              >
                COMMIT MEASUREMENT & UPDATE TWIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoIExamPlanner;
