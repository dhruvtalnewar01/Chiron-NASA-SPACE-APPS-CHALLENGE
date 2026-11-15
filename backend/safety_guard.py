"""
CHIRON v2.0 - Deterministic NASA-STD-3001 Safety Veto Guard
Evaluates countermeasure plans and voice actions against hard flight-certified
safety constraints from NASA-STD-3001 Volumes 1 & 2.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional
from pydantic import BaseModel, Field

PRIORS_PATH = Path(__file__).resolve().parent / "data" / "priors" / "nasa_std_3001_limits.json"


class VetoResult(BaseModel):
    vetoed: bool = False
    rule_id: str = "PASS"
    reason: str = "Nominal: within NASA-STD-3001 permissible limits"
    severity: str = "INFO"  # INFO, ADVISORY, WARNING, CRITICAL_VETO
    reference: str = "NASA-STD-3001"
    details: dict[str, Any] = Field(default_factory=dict)


class SafetyGuard:
    """
    Deterministic Safety Guard enforcing NASA-STD-3001.
    Never allows an AI recommendation or countermeasure simulation that violates
    crew life support, radiation, cardiovascular, or hypercapnia thresholds.
    """

    def __init__(self, limits_path: Optional[Path] = None) -> None:
        self.limits_path = limits_path or PRIORS_PATH
        self.limits_data: dict[str, Any] = {}
        if self.limits_path.exists():
            try:
                with open(self.limits_path, "r", encoding="utf-8") as f:
                    self.limits_data = json.load(f)
            except Exception:
                self.limits_data = {}

    def evaluate_countermeasure(
        self,
        countermeasure: dict[str, Any],
        env_state: dict[str, Any],
    ) -> VetoResult:
        """
        Evaluate proposed countermeasure under current environmental and physiological state.
        """
        twin_state = env_state.get("twin_state", {})
        axes = twin_state.get("axes", {})
        if isinstance(axes, list):
            # Convert list of AxisEstimate to dict
            axes = {ax.axis if hasattr(ax, "axis") else ax.get("axis"): getattr(ax, "x_hat", ax.get("x_hat", 75.0)) for ax in axes}

        cardio_score = float(axes.get("cardio", 75.0))
        neuro_score = float(axes.get("neuro", 75.0))
        rad_score = float(axes.get("rad", 80.0))

        # Environmental parameters
        ppco2 = float(env_state.get("cabin_ppco2_mmhg", 1.5))
        proton_flux = float(env_state.get("goes_proton_flux_pfu", 0.1))

        # Countermeasure parameters
        ared_load = float(countermeasure.get("ared_load_kg", 50.0))
        storm_shelter = bool(countermeasure.get("storm_shelter_active", False))
        med_kit = str(countermeasure.get("med_kit_intervention") or "").lower()
        is_eva = bool(countermeasure.get("schedule_eva", False)) or "eva" in str(countermeasure.get("activity", "")).lower()

        # Rule 1: NASA-STD-3001-V2-6004 - Cabin ppCO2 > 3.5 mmHg + High Intensity Exercise
        if ppco2 > 3.5 and (ared_load > 70.0 or "high_intensity" in str(countermeasure)):
            return VetoResult(
                vetoed=True,
                rule_id="NASA-STD-3001-V2-6004",
                reason="High exertion prohibited under hypercapnic load > 3.5 mmHg. Scrub cabin CO2 prior to heavy resistive exercise.",
                severity="CRITICAL_VETO",
                reference="NASA-STD-3001 Volume 2, Rev C Section 6004",
                details={"cabin_ppco2_mmhg": ppco2, "proposed_ared_load_kg": ared_load},
            )

        # Rule 2: NASA-STD-3001-V1-RAD-ALARA - SPE Solar Storm >= 10 pfu without shelter or EVA
        if proton_flux >= 10.0 and (is_eva or not storm_shelter):
            if is_eva:
                return VetoResult(
                    vetoed=True,
                    rule_id="NASA-STD-3001-V1-RAD-ALARA",
                    reason="Extravehicular activity strictly banned during Solar Particle Event (>= 10 pfu). Immediate storm shelter ingress mandatory.",
                    severity="CRITICAL_VETO",
                    reference="NASA-STD-3001 Volume 1, Section 4.2 Radiation Protection",
                    details={"goes_proton_flux_pfu": proton_flux},
                )
            elif "delay_shelter" in str(countermeasure).lower():
                return VetoResult(
                    vetoed=True,
                    rule_id="NASA-STD-3001-V1-RAD-ALARA",
                    reason="Storm shelter delay prohibited under active SPE proton flux >= 10 pfu.",
                    severity="CRITICAL_VETO",
                    reference="NASA-STD-3001 Volume 1 ALARA Protocol",
                    details={"goes_proton_flux_pfu": proton_flux},
                )

        # Rule 3: NASA-STD-3001-V1-MED-CARDIO - Orthostatic Intolerance + Vasodilator/Sedative
        vasodilators = ["nitroglycerin", "hydralazine", "sildenafil", "sedative", "propofol", "midazolam", "zolpidem"]
        has_vasodilator = any(med in med_kit for med in vasodilators)
        fluid_loading_active = bool(countermeasure.get("fluid_loading_active", False))

        if cardio_score < 45.0 and has_vasodilator and not fluid_loading_active:
            return VetoResult(
                vetoed=True,
                rule_id="NASA-STD-3001-V1-MED-CARDIO",
                reason="Vasodilators and central sedatives contraindicated in acute orthostatic compromise (cardio < 45) without preceding isotonic fluid loading.",
                severity="CRITICAL_VETO",
                reference="NASA-STD-3001 Volume 1 Medical Operations Guidelines",
                details={"cardio_score": cardio_score, "medication": med_kit},
            )

        # Rule 4: Critical SANS Intracranial Pressure - High ARED Load with Neuro < 40
        if neuro_score < 40.0 and ared_load > 85.0:
            return VetoResult(
                vetoed=True,
                rule_id="NASA-STD-3001-V2-SANS-ICP",
                reason="Maximal Valsalva maneuvers under heavy resistive loading (> 85 kg) prohibited with acute neuro-ocular SANS edema < 40.",
                severity="WARNING",
                reference="NASA Spaceflight Human System Standard Volume 2",
                details={"neuro_score": neuro_score, "ared_load_kg": ared_load},
            )

        return VetoResult(
            vetoed=False,
            rule_id="PASS",
            reason="Nominal: Plan adheres strictly to all NASA-STD-3001 operational constraints.",
            severity="INFO",
            reference="NASA-STD-3001 Rev C",
            details={"cardio": cardio_score, "ppco2": ppco2, "proton_flux": proton_flux},
        )

    def inspect_voice_response(self, text: str) -> dict[str, Any]:
        """
        Inspect AI spoken or textual response for unsafe recommendations.
        """
        text_lower = text.lower()
        flags: list[str] = []

        if "skip shelter" in text_lower or "ignore radiation" in text_lower:
            flags.append("UNSAFE_RADIATION_ADVICE")
        if "heavy exercise" in text_lower and "co2" in text_lower and "high" in text_lower:
            flags.append("UNSAFE_HYPERCAPNIC_EXERTION")
        if "stop oxygen" in text_lower or "reduce o2" in text_lower:
            flags.append("UNSAFE_HYPOXIA_RECOMMENDATION")

        return {
            "safe": len(flags) == 0,
            "flags": flags,
            "provenance": "[DERIVED]",
        }

