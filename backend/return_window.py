"""
CHIRON v2.0 - Return-Window Horizon Solver
Crew-11 Operational Lesson Implementation.

Compares forecasted physiological hazard crossing time (T_crit) against
mission evacuation profiles (T_evac) across LEO (14h), Lunar NRHO (96h),
and Mars Transit (SHELTER_IN_PLACE).
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Evacuation Profiles
# ---------------------------------------------------------------------------
EVACUATION_PROFILES: dict[str, dict[str, Any]] = {
    "LEO_ISS": {
        "id": "LEO_ISS",
        "name": "LEO ISS Commercial / Dragon",
        "t_evac_nominal_hours": 14.0,
        "t_evac_min_hours": 6.0,
        "t_evac_max_hours": 18.0,
        "delta_v_required_mps": 120.0,
        "landing_zones": ["Gulf of Mexico", "Atlantic Splashdown", "Pacific Splashdown"],
        "abort_type": "DIRECT_DEORBIT_SPLASHDOWN",
    },
    "ISS_LEO": {
        "id": "ISS_LEO",
        "name": "LEO ISS Commercial / Dragon",
        "t_evac_nominal_hours": 14.0,
        "t_evac_min_hours": 6.0,
        "t_evac_max_hours": 18.0,
        "delta_v_required_mps": 120.0,
        "landing_zones": ["Gulf of Mexico", "Atlantic Splashdown"],
        "abort_type": "DIRECT_DEORBIT_SPLASHDOWN",
    },
    "LUNAR_NRHO": {
        "id": "LUNAR_NRHO",
        "name": "Lunar Near Rectilinear Halo Orbit (Artemis / Gateway)",
        "t_evac_nominal_hours": 96.0,
        "t_evac_min_hours": 84.0,
        "t_evac_max_hours": 120.0,
        "delta_v_required_mps": 430.0,
        "landing_zones": ["Pacific Ocean Primary", "San Diego Recovery Zone"],
        "abort_type": "TRANS_EARTH_INJECTION_ORION",
    },
    "MARS_TRANSIT": {
        "id": "MARS_TRANSIT",
        "name": "Mars Transit Deep-Space Corridor",
        "t_evac_nominal_hours": 4320.0,  # 180 days
        "t_evac_min_hours": 3600.0,
        "t_evac_max_hours": 7200.0,
        "delta_v_required_mps": 2400.0,
        "landing_zones": ["Earth Return Unavailable (Corridor Bound)"],
        "abort_type": "SHELTER_IN_PLACE_AUTONOMOUS",
    },
}

CRITICAL_HAZARD_THRESHOLD = 40.0
ARI_CRITICAL_THRESHOLD = 45.0


# ---------------------------------------------------------------------------
# Result Data Structures
# ---------------------------------------------------------------------------
class ReturnWindow(BaseModel):
    window_id: str
    departure_t_hours: float
    transit_duration_hours: float
    total_evac_hours: float
    t_crit_hours: float
    delta_t_margin_hours: float
    status: str  # WINDOW_OPEN_NOMINAL, PREPARE_DEPARTURE_OR_INTERVENE, RETURN_WINDOW_CRITICAL_BREACH
    delta_v_m_s: float
    reentry_site: str
    provenance: str = "[DERIVED]"


class ReturnWindowResult:
    """Container for return-window evaluation outcome."""

    def __init__(
        self,
        mission_profile: str,
        t_crit: float,
        t_evac: float,
        delta_t_margin: float,
        status: str,
        recommendation: str,
        threshold: float,
        windows: list[dict[str, Any]],
        earliest_window: dict[str, Any],
        critical_axis: Optional[str] = None,
    ) -> None:
        self.mission_profile = mission_profile
        self.t_crit = t_crit
        self.t_evac = t_evac
        self.delta_t_margin = delta_t_margin
        self.status = status
        self.recommendation = recommendation
        self.threshold = threshold
        self.windows = windows
        self.earliest_window = earliest_window
        self.critical_axis = critical_axis
        self.provenance = "[DERIVED]"

    def dict(self) -> dict[str, Any]:
        return {
            "mission_profile": self.mission_profile,
            "t_crit": self.t_crit,
            "t_evac": self.t_evac,
            "delta_t_margin": self.delta_t_margin,
            "status": self.status,
            "recommendation": self.recommendation,
            "threshold": self.threshold,
            "windows": self.windows,
            "earliest_window": self.earliest_window,
            "critical_axis": self.critical_axis,
            "provenance": self.provenance,
        }


# ---------------------------------------------------------------------------
# ReturnWindowSolver
# ---------------------------------------------------------------------------
class ReturnWindowSolver:
    """
    Crew-11 Return-Window Horizon Solver.
    Evaluates physiological trajectory against orbital evacuation opportunities.
    """

    def __init__(self) -> None:
        self.profiles = EVACUATION_PROFILES

    def evaluate(
        self,
        twin: Any,
        mission_profile: str = "LEO_ISS",
    ) -> ReturnWindowResult:
        """
        Evaluate medical return windows for a crew member twin.
        """
        norm_profile = mission_profile.upper().replace("-", "_").replace(" ", "_")
        if norm_profile not in self.profiles:
            # Map common variants
            if "MARS" in norm_profile:
                norm_profile = "MARS_TRANSIT"
            elif "LUNAR" in norm_profile or "ARTEMIS" in norm_profile or "NRHO" in norm_profile:
                norm_profile = "LUNAR_NRHO"
            else:
                norm_profile = "LEO_ISS"

        profile_data = self.profiles[norm_profile]
        t_evac = float(profile_data["t_evac_nominal_hours"])

        # Determine T_crit from 14d trajectory forecast (336 hours)
        trajectory: list[dict[str, Any]] = []
        if hasattr(twin, "predict_trajectory"):
            trajectory = twin.predict_trajectory(336)
        elif hasattr(twin, "engine") and hasattr(twin.engine, "forecast"):
            from twin_engine import EnvironmentalStressors, Countermeasures
            res = twin.engine.forecast(336.0, 4.0, EnvironmentalStressors(), Countermeasures())
            for pt in res.trajectory:
                trajectory.append({
                    "t_hours": pt.t_hours,
                    "axes": {f"ax_{i}": pt.x_hat[i] for i in range(len(pt.x_hat))},
                    "ci_lower": {f"ax_{i}": pt.ci_lower[i] for i in range(len(pt.ci_lower))},
                })

        t_crit: float = 336.0
        critical_axis: Optional[str] = None

        for pt in trajectory:
            t = float(pt.get("t_hours", 0.0))
            # Check lower 90% conformal bound across all axes
            ci_lowers = pt.get("ci_lower", {})
            if isinstance(ci_lowers, dict):
                for ax_name, lower_val in ci_lowers.items():
                    if float(lower_val) <= CRITICAL_HAZARD_THRESHOLD:
                        if t < t_crit:
                            t_crit = t
                            critical_axis = ax_name
            elif isinstance(ci_lowers, list):
                for idx, lower_val in enumerate(ci_lowers):
                    if float(lower_val) <= CRITICAL_HAZARD_THRESHOLD:
                        if t < t_crit:
                            t_crit = t
                            critical_axis = f"axis_{idx}"

            # Check point ARI if available
            pt_ari = float(pt.get("ari", 100.0))
            if pt_ari <= ARI_CRITICAL_THRESHOLD:
                if t < t_crit:
                    t_crit = t
                    if not critical_axis:
                        critical_axis = "composite_ari"

        delta_t_margin = round(t_crit - t_evac, 2)

        # Decision logic based on orbital return window specification
        if delta_t_margin > 24.0:
            status = "WINDOW_OPEN_NOMINAL"
            recommendation = (
                f"Trajectory stable. Safety margin {delta_t_margin:.1f}h exceeds 24h threshold. "
                "Continue standard in-flight countermeasure protocol."
            )
        elif 0.0 < delta_t_margin <= 24.0:
            status = "PREPARE_DEPARTURE_OR_INTERVENE"
            recommendation = (
                f"Advisory: Critical margin narrowing to {delta_t_margin:.1f}h on {critical_axis or 'physiological state'}. "
                "Stage deorbit assets and execute prioritized VoI diagnostic protocol."
            )
        else:
            status = "RETURN_WINDOW_CRITICAL_BREACH"
            recommendation = (
                f"CRITICAL BREACH: T_crit ({t_crit:.1f}h) is less than evacuation duration T_evac ({t_evac:.1f}h). "
                "Immediate medical evacuation or full emergency countermeasure intervention required."
            )

        # Build departure windows schedule
        windows: list[dict[str, Any]] = []
        step_hours = 6.0 if norm_profile != "MARS_TRANSIT" else 48.0
        for w_idx in range(4):
            dep_t = w_idx * step_hours
            total_time = dep_t + t_evac
            win_margin = round(t_crit - total_time, 2)
            if win_margin > 24.0:
                win_status = "WINDOW_OPEN_NOMINAL"
            elif win_margin > 0.0:
                win_status = "PREPARE_DEPARTURE_OR_INTERVENE"
            else:
                win_status = "RETURN_WINDOW_CRITICAL_BREACH"

            site = profile_data["landing_zones"][w_idx % len(profile_data["landing_zones"])]
            windows.append({
                "window_id": f"OPP_{w_idx + 1:02d}",
                "departure_t_hours": round(dep_t, 1),
                "transit_duration_hours": round(t_evac, 1),
                "total_evac_hours": round(total_time, 1),
                "t_crit_hours": round(t_crit, 1),
                "delta_t_margin_hours": win_margin,
                "status": win_status,
                "delta_v_m_s": profile_data["delta_v_required_mps"],
                "reentry_site": site,
                "provenance": "[DERIVED]",
            })

        earliest = windows[0] if windows else {
            "mission_day": 47,
            "delta_v_m_s": profile_data["delta_v_required_mps"],
            "transit_duration_hours": t_evac,
            "hazard_margin_hours": delta_t_margin,
            "status": status,
        }

        return ReturnWindowResult(
            mission_profile=norm_profile,
            t_crit=round(t_crit, 2),
            t_evac=round(t_evac, 2),
            delta_t_margin=delta_t_margin,
            status=status,
            recommendation=recommendation,
            threshold=CRITICAL_HAZARD_THRESHOLD,
            windows=windows,
            earliest_window=earliest,
            critical_axis=critical_axis,
        )

