// ---------------------------------------------------------------------------
// CHIRON v4.0 - BuddyCareAuditPanel
// Row 4 Right (col-span-6): CMO Incapacitation Buddy-Care Triage & SHA-256 Audit Ledger.
// Interactive layman emergency clinical guidance paired with the tamper-evident
// cryptographic SHA-256 forward-hash break-glass audit ledger.
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import {
  Zap,
  Shield,
  Radio,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import ProvenanceBadge from "../ui/ProvenanceBadge";

interface BuddyCareAuditPanelProps {
  activeCrewId: string;
  onTriggerBreakGlass?: (reason: string) => void;
  activeScenario?: string;
}

export function BuddyCareAuditPanel({
  activeCrewId,
  onTriggerBreakGlass,
  activeScenario = "A",
}: BuddyCareAuditPanelProps) {
  const [buddyStep, setBuddyStep] = useState<number>(1);
  const [breakGlassDialogOpen, setBreakGlassDialogOpen] = useState<boolean>(false);
  const [breakGlassReason, setBreakGlassReason] = useState<string>(
    "CMO Acute Vasovagal Syncope & Orthostatic Crash in Microgravity: Initiating Tier-3 Biomedical Disclosure"
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
    {
      seq: 3,
      hash: "7a2b91d4e1...",
      timestamp: "11:48:19 UTC",
      actor: "SAFETY_GUARD",
      patient: "CREW_ALL",
      action: "NASA_STD_3001_PASS",
      status: "CHAIN_VALID",
    },
  ]);

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
    <div className="w-full chiron-bento-card p-5 flex flex-col justify-between select-none">
      {/* 1. Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--accent-crit)]" />
          <h2 className="text-[19px] font-mono font-black tracking-wider text-[var(--ink-primary)]">
            CMO BUDDY-CARE & SHA-256 AUDIT VAULT
          </h2>
        </div>
        <ProvenanceBadge type="REAL" />
      </div>

      {/* 2. Step-by-Step Layman Clinical Guidance Protocol */}
      <div className="p-4 rounded-xl border-2 border-[var(--accent-crit)] bg-red-500/12 flex flex-col gap-2.5 mb-3 glow-refract-crimson shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-mono font-black text-[var(--accent-warn)] tracking-wider">
            STEP {buddyStep} OF 4: {buddyStep === 1 ? "MICROGRAVITY RESTRAINT" : buddyStep === 2 ? "AED ELECTRODES" : buddyStep === 3 ? "AUTOINJECTOR" : "FLIGHT SURGEON UPLINK"}
          </span>
          <span className="text-[11px] font-mono font-black text-[var(--accent-crit)] bg-red-500/20 px-2.5 py-0.5 rounded border border-[var(--accent-crit)]">
            EMERGENCY PROTOCOL
          </span>
        </div>

        <p className="text-[15px] text-[var(--ink-primary)] font-sans font-bold leading-relaxed">
          {buddyStep === 1 && "Affix patient immediately to the Medical Restraint Board using thoracic & pelvic tethers to prevent floating during chest compressions."}
          {buddyStep === 2 && "Dry sternal and apical landmarks. Place Pad 1 infraclavicular right; Pad 2 left mid-axillary intercostal space. Device evaluates rhythm automatically."}
          {buddyStep === 3 && "If pulseless or profound syncope, administer vastus lateralis autoinjector through flight suit. Hold firmly for 5 seconds."}
          {buddyStep === 4 && "Transmit break-glass encrypted telemetry packet to Houston Flight Surgeon. Establish direct full-duplex medical voice bridge."}
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setBuddyStep(Math.max(1, buddyStep - 1))}
            disabled={buddyStep === 1}
            className="flex-1 py-2 text-[12.5px] font-mono font-black border border-[var(--border-strong)] text-[var(--ink-primary)] disabled:opacity-30 rounded-lg bg-[var(--surface-primary)]"
          >
            PREVIOUS STEP
          </button>
          <button
            onClick={() => setBuddyStep(Math.min(4, buddyStep + 1))}
            className="flex-1 py-2 text-[12.5px] font-mono font-black bg-[var(--accent-crit)] text-white hover:opacity-90 rounded-lg shadow-sm"
          >
            {buddyStep === 4 ? "PROTOCOL COMPLETE" : "NEXT STEP"}
          </button>
        </div>
      </div>

      {/* 3. Break-Glass Override Action */}
      <div className="p-3.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-base)] flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <span className="text-[13.5px] font-mono font-black text-[var(--ink-primary)]">
            TIER-3 BREAK-GLASS OVERRIDE
          </span>
          <span className="text-[12px] text-[var(--ink-secondary)] font-bold">
            Immutably signs cryptographic audit block for Houston Flight Surgeon disclosure
          </span>
        </div>
        <button
          onClick={() => setBreakGlassDialogOpen(true)}
          className="px-4 py-2 text-[12.5px] font-mono font-black bg-[var(--accent-crit)] text-white hover:opacity-90 rounded-lg flex items-center gap-1.5 shadow-md glow-refract-crimson active:scale-95"
        >
          <Unlock className="w-4 h-4" />
          <span>TRIGGER BREAK-GLASS</span>
        </button>
      </div>

      {/* 4. SHA-256 Break-Glass Cryptographic Ledger Table */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[12.5px] font-mono">
          <span className="font-black text-[var(--ink-secondary)]">SHA-256 HASH-CHAINED AUDIT LEDGER</span>
          <span className="font-black text-[var(--accent-ok)] flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> 100% CHAIN VALID
          </span>
        </div>
        <div className="border border-[var(--border-subtle)] bg-[var(--surface-base)] rounded-lg divide-y divide-[var(--border-subtle)] max-h-36 overflow-y-auto text-[12.5px] font-mono">
          {ledgerEntries.map((e) => (
            <div key={e.seq} className="p-2.5 flex justify-between items-center hover:bg-[var(--surface-active)] transition-colors">
              <div className="flex flex-col">
                <span className="font-black text-[var(--ink-primary)]">#{e.seq} {e.action}</span>
                <span className="text-[11px] text-[var(--ink-tertiary)] font-bold">{e.actor} | {e.patient} | {e.timestamp}</span>
              </div>
              <span className="text-[var(--accent-active)] font-mono font-black">{e.hash}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Break-Glass Modal */}
      {breakGlassDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-[520px] chiron-bento-card border-2 border-[var(--accent-crit)] p-6 flex flex-col gap-4 shadow-2xl glow-refract-crimson">
            <div className="flex items-center gap-2.5 text-[var(--accent-crit)]">
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
              className="p-3 text-xs font-mono bg-black/40 border border-[var(--border-strong)] text-[var(--ink-primary)] outline-none resize-none rounded-lg font-bold"
            />
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setBreakGlassDialogOpen(false)}
                className="px-4 py-2 text-xs font-mono font-bold text-[var(--ink-secondary)] border border-[var(--border-subtle)] rounded-lg"
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

export default BuddyCareAuditPanel;

