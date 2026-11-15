// ---------------------------------------------------------------------------
// CHIRON v2.0 - IncapacitationOverlay
// Full-Screen High-Contrast Buddy-Care Incapacitation Mode.
// Step-by-step emergency guidance when CMO is incapacitated in microgravity.
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import {
  AlertOctagon,
  ChevronRight,
  ChevronLeft,
  Volume2,
  CheckCircle,
  Shield,
  Activity,
  Heart,
  Wind,
  Zap,
} from "lucide-react";

interface IncapacitationOverlayProps {
  onDismiss: () => void;
  onVoiceCommand?: (cmd: string) => void;
}

interface BuddyCareStep {
  number: number;
  title: string;
  icon: React.ReactNode;
  instruction: string;
  anatomicalReference: string;
  voicePrompt: string;
}

export function IncapacitationOverlay({
  onDismiss,
  onVoiceCommand,
}: IncapacitationOverlayProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps: BuddyCareStep[] = [
    {
      number: 1,
      title: "ASSESS CONSCIOUSNESS & SECURE CREW MEMBER",
      icon: <AlertOctagon className="w-8 h-8 text-[#EF4444]" />,
      instruction:
        "Call astronaut loudly by name and tap both shoulders firmly. If unresponsive, immediately tether the patient to the primary medical restraint board to prevent microgravity drift.",
      anatomicalReference: "Thoracic / pelvic restraint straps attached to cabin hardpoints.",
      voicePrompt: 'Say: "CHIRON, patient secured, proceeding to airway"',
    },
    {
      number: 2,
      title: "AIRWAY & HEAD-TILT IN MICROGRAVITY",
      icon: <Wind className="w-8 h-8 text-[#FB923C]" />,
      instruction:
        "Perform head-tilt chin-lift without hyperextending cervical spine. Inspect oropharynx for emesis or obstruction. Insert size-4 supraglottic i-gel airway if spontaneous respiration is absent.",
      anatomicalReference: "Submandibular / cephalad airway alignment.",
      voicePrompt: 'Say: "CHIRON, airway clear"',
    },
    {
      number: 3,
      title: "APPLY AED DEFIBRILLATOR PADS",
      icon: <Zap className="w-8 h-8 text-[#EAB308]" />,
      instruction:
        "Wipe sternal and lateral chest dry of perspiration. Affix Pad 1 to upper right sternal border below clavicle. Affix Pad 2 to left mid-axillary line 5th intercostal space.",
      anatomicalReference: "Anterior right infraclavicular + lateral left apex.",
      voicePrompt: 'Say: "CHIRON, analyze cardiac rhythm"',
    },
    {
      number: 4,
      title: "INTRAMUSCULAR AUTOINJECTOR (IF INDICATED)",
      icon: <Heart className="w-8 h-8 text-[#EF4444]" />,
      instruction:
        "If anaphylaxis or profound bradycardia is confirmed, remove safety cap from Med-Kit autoinjector. Press firmly into vastus lateralis (anterolateral mid-thigh) through flight suit for 5 seconds.",
      anatomicalReference: "Anterolateral thigh (vastus lateralis quadrant).",
      voicePrompt: 'Say: "CHIRON, autoinjector delivered"',
    },
    {
      number: 5,
      title: "FLUID LOADING & GROUND SURGEON HANDOFF",
      icon: <Activity className="w-8 h-8 text-[#10B981]" />,
      instruction:
        "Attach pressure bag with 500 mL normal saline IV. Connect telemetry transponder to CHIRON audio-visual uplink for real-time Houston Flight Surgeon co-pilot supervision.",
      anatomicalReference: "Antecubital fossa venous catheter.",
      voicePrompt: 'Say: "CHIRON, vitals logged, uplink nominal"',
    },
  ];

  const activeStep = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRepeatVoice = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeStep.instruction);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0C0607]/95 backdrop-blur-md flex flex-col p-8 select-none text-[#FECDD3] font-sans">
      {/* Top Emergency Banner */}
      <div className="flex items-center justify-between border-b-2 border-[#EF4444] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-[#EF4444] animate-ping" style={{ borderRadius: "2px" }} />
          <div>
            <h1 className="text-xl font-mono font-bold tracking-tight text-[#EF4444]">
              EMERGENCY BUDDY-CARE MODE: CHIEF MEDICAL OFFICER DOWN
            </h1>
            <p className="text-xs font-mono text-[#FDA4AF]">
              NASA-STD-3001 CONTINGENCY PROTOCOL 7.3 | AUTONOMOUS CLINICAL ESCORT ACTIVE
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="px-4 py-2 border border-[#FDA4AF] text-xs font-mono font-bold text-[#FDA4AF] hover:bg-[#FDA4AF] hover:text-black transition-colors"
          style={{ borderRadius: "2px" }}
        >
          DISMISS / CMO RECOVERED
        </button>
      </div>

      {/* Main Guided Card */}
      <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full bg-[#180A0C] border-2 border-[#EF4444] p-8 shadow-2xl" style={{ borderRadius: "4px" }}>
        {/* Step Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#4C1D24] pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#2A0E13] border border-[#EF4444]" style={{ borderRadius: "4px" }}>
              {activeStep.icon}
            </div>
            <div>
              <span className="text-xs font-mono text-[#FB923C] font-semibold tracking-wider">
                STEP {activeStep.number} OF {steps.length}
              </span>
              <h2 className="text-2xl font-mono font-bold text-[#FECDD3] mt-0.5">
                {activeStep.title}
              </h2>
            </div>
          </div>

          <button
            onClick={handleRepeatVoice}
            className="px-3 py-2 bg-[#2A0E13] border border-[#FDA4AF] text-[#FDA4AF] text-xs font-mono flex items-center gap-2 hover:bg-[#FDA4AF] hover:text-black transition-colors"
            style={{ borderRadius: "2px" }}
          >
            <Volume2 className="w-4 h-4" />
            REPEAT SPOKEN INSTRUCTION
          </button>
        </div>

        {/* Step Body */}
        <div className="py-6 flex flex-col gap-5">
          <p className="text-lg leading-relaxed text-[#FECDD3] font-normal">
            {activeStep.instruction}
          </p>

          <div className="p-4 bg-[#0C0607] border border-[#4C1D24] flex flex-col gap-1.5 font-mono text-xs">
            <span className="text-[#FB923C] font-semibold">ANATOMICAL PLACEMENT LANDMARK:</span>
            <span className="text-[#FDA4AF]">{activeStep.anatomicalReference}</span>
          </div>

          <div className="p-3 bg-[#2A0E13] border border-[#EAB308] text-xs font-mono text-[#EAB308] flex items-center gap-2">
            <span className="font-bold">VOICE RECOGNITION:</span>
            <span>{activeStep.voicePrompt}</span>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between border-t border-[#4C1D24] pt-5">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-5 py-3 text-sm font-mono font-bold flex items-center gap-2 border transition-colors ${
              currentStep === 0
                ? "border-[#4C1D24] text-[#4C1D24] cursor-not-allowed"
                : "border-[#FDA4AF] text-[#FDA4AF] hover:bg-[#FDA4AF] hover:text-black"
            }`}
            style={{ borderRadius: "2px" }}
          >
            <ChevronLeft className="w-4 h-4" />
            PREVIOUS STEP
          </button>

          <div className="flex gap-2">
            {steps.map((s, idx) => (
              <div
                key={s.number}
                className={`w-3 h-3 ${
                  idx === currentStep
                    ? "bg-[#EF4444]"
                    : idx < currentStep
                    ? "bg-[#10B981]"
                    : "bg-[#4C1D24]"
                }`}
                style={{ borderRadius: "1px" }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            className={`px-6 py-3 text-sm font-mono font-bold flex items-center gap-2 border transition-colors ${
              currentStep === steps.length - 1
                ? "bg-[#10B981] border-[#10B981] text-black"
                : "bg-[#EF4444] border-[#EF4444] text-black hover:opacity-90"
            }`}
            style={{ borderRadius: "2px" }}
          >
            {currentStep === steps.length - 1 ? "PROTOCOL COMPLETE" : "NEXT STEP"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

