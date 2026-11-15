"""
CHIRON v2.0 | Shannon Entropy Value-of-Information Next-Best-Measurement Planner
---
Ranks 5 onboard diagnostic procedures by expected uncertainty reduction.
Uses posterior covariance from the digital twin to compute information gain.
Clinical proximity weighting emphasizes axes near danger thresholds.
"""

from __future__ import annotations

import math
from typing import Optional

import numpy as np
from pydantic import BaseModel, Field
from scipy.linalg import det as scipy_det
from scipy.linalg import inv as scipy_inv

try:
    from twin_engine import (
        AXIS_IDX,
        AXIS_NAMES,
        N_AXES,
        DigitalTwinEngine,
        Provenance,
    )
except ImportError:
    from backend.twin_engine import (
        AXIS_IDX,
        AXIS_NAMES,
        N_AXES,
        DigitalTwinEngine,
        Provenance,
    )

# ---------------------------------------------------------------------------
# Diagnostic Procedure Definitions
# ---------------------------------------------------------------------------
LN2 = math.log(2.0)

# Critical threshold below which clinical proximity weighting activates
CLINICAL_DANGER_THRESHOLD = 60.0
PROXIMITY_SCALE = 15.0  # exponential decay scale for psi_k


class DiagnosticProcedure(BaseModel):
    """Definition of an onboard diagnostic measurement."""
    id: str
    name: str
    duration_minutes: float
    cost_minutes: float
    target_axes: list[str]
    observation_noise_variance: dict[str, float]
    description: str


# 5 diagnostic procedures with realistic parameters
PROCEDURES: list[DiagnosticProcedure] = [
    DiagnosticProcedure(
        id="M1_SEATED_BP_HRV",
        name="Seated Blood Pressure + HRV",
        duration_minutes=2.0,
        cost_minutes=2.0,
        target_axes=["cardio", "behav"],
        observation_noise_variance={"cardio": 4.0, "behav": 12.0},
        description="Automated cuff BP with 60s HRV window via chest-strap ECG",
    ),
    DiagnosticProcedure(
        id="M2_PVT_VOCAL",
        name="PVT + Vocal Stress Analysis",
        duration_minutes=3.0,
        cost_minutes=3.0,
        target_axes=["sleep", "behav", "neuro"],
        observation_noise_variance={"sleep": 16.0, "behav": 9.0, "neuro": 14.0},
        description="3-minute Psychomotor Vigilance Task with vocal biomarker extraction",
    ),
    DiagnosticProcedure(
        id="M3_OCULAR_POCUS",
        name="Ocular Point-of-Care Ultrasound",
        duration_minutes=6.0,
        cost_minutes=6.0,
        target_axes=["neuro"],
        observation_noise_variance={"neuro": 6.0},
        description="ONSD measurement via handheld B-mode ultrasound for SANS screening",
    ),
    DiagnosticProcedure(
        id="M4_CAP_CHEM_STRIP",
        name="Capillary Blood Chemistry Strip",
        duration_minutes=8.0,
        cost_minutes=8.0,
        target_axes=["immune", "rad", "bone"],
        observation_noise_variance={"immune": 20.0, "rad": 10.0, "bone": 8.0},
        description="Fingerstick i-STAT cartridge: CBC differential, CRP, ALP, ionized Ca",
    ),
    DiagnosticProcedure(
        id="M5_DOSIMETER_SYNC",
        name="Personal Dosimeter Sync",
        duration_minutes=1.0,
        cost_minutes=1.0,
        target_axes=["rad"],
        observation_noise_variance={"rad": 3.0},
        description="Sync accumulated dose from crew personal TLD/OSLD dosimeter",
    ),
]


def get_procedure(proc_id: str) -> DiagnosticProcedure:
    """Retrieve a diagnostic procedure by ID."""
    for proc in PROCEDURES:
        if proc.id == proc_id:
            return proc
    raise ValueError(f"Unknown procedure: {proc_id}")


# ---------------------------------------------------------------------------
# Pydantic result models
# ---------------------------------------------------------------------------
class VoIResult(BaseModel):
    """Value of Information result for a single diagnostic procedure."""
    procedure_id: str
    procedure_name: str
    duration_minutes: float
    voi_score: float
    uncertainty_reduction_pct: float
    target_axes: list[str]
    provenance: str


class VoIPlan(BaseModel):
    """Ranked plan of next-best measurements."""
    rankings: list[VoIResult]
    current_covariance_trace: float
    clinical_proximity_weights: dict[str, float]
    provenance: str


# ---------------------------------------------------------------------------
# VoI Computation
# ---------------------------------------------------------------------------
def _build_observation_model(
    procedure: DiagnosticProcedure,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Build observation matrix H_m (k x N_AXES) and observation noise R_m (k x k)
    for a diagnostic procedure that targets specific axes.
    k = number of target axes.
    """
    target_indices = [AXIS_IDX[ax] for ax in procedure.target_axes]
    k = len(target_indices)

    H_m = np.zeros((k, N_AXES), dtype=np.float64)
    R_m = np.zeros((k, k), dtype=np.float64)

    for row, ax_name in enumerate(procedure.target_axes):
        col = AXIS_IDX[ax_name]
        H_m[row, col] = 1.0
        R_m[row, row] = procedure.observation_noise_variance[ax_name]

    return H_m, R_m


def _compute_clinical_proximity_weights(x_hat: np.ndarray) -> np.ndarray:
    """
    Clinical proximity weighting: psi_k = exp(-margin_k / 15)
    margin_k = x_k - danger_threshold (higher x = healthier)
    Axes closer to danger get exponentially higher weight.
    """
    psi = np.zeros(N_AXES, dtype=np.float64)
    for i in range(N_AXES):
        margin = x_hat[i] - CLINICAL_DANGER_THRESHOLD
        psi[i] = math.exp(-margin / PROXIMITY_SCALE)
    return psi


def compute_voi(
    procedure: DiagnosticProcedure,
    Sigma: np.ndarray,
    psi: np.ndarray,
) -> tuple[float, float]:
    """
    Compute Value of Information for a single diagnostic procedure.

    VoI(m) = (1 / (2 * c_m * ln2)) * ln(det(Psi*Sigma*Psi) / det(Psi*Sigma_plus*Psi))

    where Sigma_plus = (Sigma^{-1} + H_m^T R_m^{-1} H_m)^{-1}

    Returns (voi_score, uncertainty_reduction_percentage).
    """
    H_m, R_m = _build_observation_model(procedure)
    c_m = procedure.cost_minutes

    # Posterior covariance after measurement:
    # Sigma_plus = (Sigma^{-1} + H_m^T R_m^{-1} H_m)^{-1}
    try:
        Sigma_inv = scipy_inv(Sigma)
    except np.linalg.LinAlgError:
        Sigma_inv = np.linalg.pinv(Sigma)

    try:
        R_m_inv = scipy_inv(R_m)
    except np.linalg.LinAlgError:
        R_m_inv = np.linalg.pinv(R_m)

    info_gain_matrix = H_m.T @ R_m_inv @ H_m
    Sigma_plus_inv = Sigma_inv + info_gain_matrix

    try:
        Sigma_plus = scipy_inv(Sigma_plus_inv)
    except np.linalg.LinAlgError:
        Sigma_plus = np.linalg.pinv(Sigma_plus_inv)

    # Apply clinical proximity weighting: Psi = diag(psi)
    Psi = np.diag(psi)

    # Weighted covariance matrices
    weighted_Sigma = Psi @ Sigma @ Psi
    weighted_Sigma_plus = Psi @ Sigma_plus @ Psi

    # Determinant ratio
    det_prior = scipy_det(weighted_Sigma)
    det_posterior = scipy_det(weighted_Sigma_plus)

    # Guard against numerical issues
    if det_posterior <= 0 or det_prior <= 0:
        # Fallback: use trace-based approximation
        trace_reduction = np.trace(weighted_Sigma) - np.trace(weighted_Sigma_plus)
        voi = max(0.0, trace_reduction / (2.0 * c_m))
        reduction_pct = max(0.0, (trace_reduction / max(np.trace(weighted_Sigma), 1e-10)) * 100.0)
        return voi, reduction_pct

    det_ratio = det_prior / det_posterior
    if det_ratio <= 0:
        return 0.0, 0.0

    voi = (1.0 / (2.0 * c_m * LN2)) * math.log(det_ratio)
    voi = max(0.0, voi)

    # Uncertainty reduction as percentage of trace
    trace_prior = np.trace(Sigma)
    trace_posterior = np.trace(Sigma_plus)
    reduction_pct = max(0.0, ((trace_prior - trace_posterior) / max(trace_prior, 1e-10)) * 100.0)

    return voi, reduction_pct


def plan_next_measurements(engine: DigitalTwinEngine) -> VoIPlan:
    """
    Rank all 5 diagnostic procedures by Value of Information.
    Returns top-5 ranked list with expected uncertainty reduction percentages.
    """
    Sigma = engine.get_covariance_matrix()
    x_hat = engine.get_state_vector()

    # Clinical proximity weights
    psi = _compute_clinical_proximity_weights(x_hat)
    psi_dict = {name: round(float(psi[i]), 4) for i, name in enumerate(AXIS_NAMES)}

    results: list[VoIResult] = []
    for proc in PROCEDURES:
        voi_score, reduction_pct = compute_voi(proc, Sigma, psi)

        results.append(VoIResult(
            procedure_id=proc.id,
            procedure_name=proc.name,
            duration_minutes=proc.duration_minutes,
            voi_score=round(voi_score, 4),
            uncertainty_reduction_pct=round(reduction_pct, 2),
            target_axes=proc.target_axes,
            provenance=Provenance.DERIVED.value,
        ))

    # Sort by VoI descending
    results.sort(key=lambda r: r.voi_score, reverse=True)

    return VoIPlan(
        rankings=results,
        current_covariance_trace=round(float(np.trace(Sigma)), 2),
        clinical_proximity_weights=psi_dict,
        provenance=Provenance.DERIVED.value,
    )


def suggest_urgent_measurement(engine: DigitalTwinEngine) -> Optional[VoIResult]:
    """
    Return the single highest-VoI measurement if any axis is near danger.
    Returns None if all axes are comfortably above threshold.
    """
    x_hat = engine.get_state_vector()
    any_near_danger = any(x_hat[i] < CLINICAL_DANGER_THRESHOLD + 10.0 for i in range(N_AXES))
    if not any_near_danger:
        return None
    plan = plan_next_measurements(engine)
    return plan.rankings[0] if plan.rankings else None



# ---------------------------------------------------------------------------
# VoIPlanner Class Interface
# ---------------------------------------------------------------------------
class VoIPlanner:
    """
    Shannon Entropy Value-of-Information (VoI) Next-Best-Measurement Planner.
    Calculates expected bits of uncertainty reduction per minute of crew time.
    """

    def __init__(self) -> None:
        self.procedures = PROCEDURES

    def rank_measurements(self, state_or_twin: Any) -> list[dict[str, Any]]:
        """
        Rank onboard diagnostic measurements based on current twin state.
        Accepts dict, TwinState, DigitalTwinEngine, or CrewDigitalTwin.
        Returns sorted list of diagnostic recommendations.
        """
        if hasattr(state_or_twin, "engine"):
            engine = state_or_twin.engine
            x_hat = engine.get_state_vector()
            Sigma = engine.get_covariance_matrix()
        elif hasattr(state_or_twin, "get_state_vector"):
            x_hat = state_or_twin.get_state_vector()
            Sigma = state_or_twin.get_covariance_matrix()
        elif isinstance(state_or_twin, dict):
            axes_dict = state_or_twin.get("axes", {})
            x_hat = np.array([float(axes_dict.get(ax, 75.0)) for ax in AXIS_NAMES], dtype=np.float64)
            uncertainties = state_or_twin.get("uncertainties", {})
            variances = [max(1.0, (float(uncertainties.get(ax, 10.0)) / (2.0 * 1.645)) ** 2) for ax in AXIS_NAMES]
            Sigma = np.diag(variances)
        else:
            x_hat = np.full(N_AXES, 75.0, dtype=np.float64)
            Sigma = np.eye(N_AXES) * 16.0

        psi = _compute_clinical_proximity_weights(x_hat)

        ranked: list[dict[str, Any]] = []
        for proc in self.procedures:
            voi_score, reduction_pct = compute_voi(proc, Sigma, psi)
            ranked.append({
                "rank": 0,
                "procedure_id": proc.id,
                "test": proc.name,
                "name": proc.name,
                "duration_minutes": proc.duration_minutes,
                "cost_minutes": proc.cost_minutes,
                "voi_bits": round(float(voi_score), 4),
                "voi": round(float(voi_score), 4),
                "uncertainty_reduction_pct": round(float(reduction_pct), 1),
                "target_axes": proc.target_axes,
                "axis": ", ".join(proc.target_axes),
                "description": proc.description,
                "provenance": Provenance.DERIVED.value,
            })

        ranked.sort(key=lambda item: item["voi_bits"], reverse=True)
        for idx, item in enumerate(ranked):
            item["rank"] = idx + 1

        return ranked
