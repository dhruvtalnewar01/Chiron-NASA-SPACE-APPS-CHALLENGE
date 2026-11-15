"""
CHIRON v2.0 | 7-Axis Kalman + Ornstein-Uhlenbeck Bayesian Digital Twin Engine
---
State vector: [cardio, neuro, bone, immune, sleep, behav, rad] each in [0,100]
Discretized OU: X_{t+dt} = X_t + theta*(mu - X_t)*dt + B_u*U_t*dt + B_c*C_t*dt + epsilon
Joseph-form Kalman filter with sensor dropout handling
90% Conformal Prediction intervals with abstention logic
Allostatic Resilience Index (ARI) via weighted power-mean
Pre-loaded replay scenarios with timestamped observation sequences
"""

from __future__ import annotations

import json
import copy
import math
import os
from enum import Enum
from pathlib import Path
from typing import Optional

import numpy as np
from pydantic import BaseModel, Field
from scipy.linalg import inv as scipy_inv
from scipy.linalg import cholesky, cho_solve, cho_factor

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
N_AXES = 7
AXIS_NAMES = ["cardio", "neuro", "bone", "immune", "sleep", "behav", "rad"]
AXIS_IDX = {name: i for i, name in enumerate(AXIS_NAMES)}

DATA_DIR = Path(__file__).resolve().parent / "data" / "priors"


class Provenance(str, Enum):
    REAL = "REAL"
    SIMULATED = "SIMULATED"
    DERIVED = "DERIVED"
    ABSTAIN = "ABSTAIN_INSUFFICIENT_CERTAINTY"


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class EnvironmentalStressors(BaseModel):
    """Environmental stressor input vector U_t."""
    cabin_ppco2_mmhg: float = Field(default=1.5, ge=0.0, description="Cabin partial pressure CO2 in mmHg")
    goes_proton_flux_pfu: float = Field(default=0.1, ge=0.0, description="GOES >=10 MeV proton flux in pfu")
    microgravity_days: float = Field(default=0.0, ge=0.0, description="Cumulative days in microgravity")
    sleep_debt_hours: float = Field(default=0.0, ge=0.0, description="Accumulated sleep debt in hours")


class Countermeasures(BaseModel):
    """Countermeasure input vector C_t."""
    ared_load_kg: float = Field(default=0.0, ge=0.0, description="ARED resistive load in kg")
    co2_scrubber_efficiency: float = Field(default=1.0, ge=0.0, le=1.0, description="CO2 scrubber efficiency 0-1")
    lighting_kelvin: float = Field(default=4500.0, ge=2000.0, le=10000.0, description="Ambient lighting color temperature")
    storm_shelter_active: bool = Field(default=False, description="Radiation storm shelter ingress")
    med_kit_intervention: Optional[str] = Field(default=None, description="Active pharmacological intervention ID")


class SensorObservation(BaseModel):
    """Single timestep observation from onboard sensors."""
    t_hours: float = Field(description="Mission elapsed time in hours")
    values: dict[str, Optional[float]] = Field(
        description="Axis name -> observed value or None for dropout"
    )


class AxisEstimate(BaseModel):
    """Posterior estimate for a single axis."""
    axis: str
    x_hat: float
    sigma: float
    ci_lower: float
    ci_upper: float
    ci_width: float
    provenance: str


class TwinState(BaseModel):
    """Full posterior state of the digital twin."""
    t_hours: float
    axes: list[AxisEstimate]
    ari: float
    ari_provenance: str
    covariance_trace: float


class TrajectoryPoint(BaseModel):
    """Single point in a forecast trajectory."""
    t_hours: float
    x_hat: list[float]
    ci_lower: list[float]
    ci_upper: list[float]


class ForecastResult(BaseModel):
    """Forecast trajectory over a horizon."""
    horizon_hours: float
    trajectory: list[TrajectoryPoint]
    critical_crossings: dict[str, Optional[float]]


class ScenarioMeta(BaseModel):
    """Metadata for a replay scenario."""
    id: str
    name: str
    description: str
    mission_profile: str
    duration_hours: float


class ReplayScenario(BaseModel):
    """Full replay scenario with observations and stressor profiles."""
    meta: ScenarioMeta
    observations: list[SensorObservation]
    stressor_timeline: list[dict]
    countermeasure_timeline: list[dict]
    expected_outcomes: dict


# ---------------------------------------------------------------------------
# Prior loaders
# ---------------------------------------------------------------------------
def _load_json(filename: str) -> dict:
    filepath = DATA_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def load_ou_params() -> dict:
    """Load OU parameters from earth clinical proxies."""
    data = _load_json("earth_clinical_proxies.json")
    return data["ornstein_uhlenbeck_params"]


def load_process_noise() -> np.ndarray:
    """Load process noise diagonal Q."""
    data = _load_json("earth_clinical_proxies.json")
    return np.diag(data["process_noise_Q_diagonal"])


def load_observation_noise() -> np.ndarray:
    """Load observation noise diagonal R."""
    data = _load_json("earth_clinical_proxies.json")
    return np.diag(data["observation_noise_R_diagonal"])


def load_nasa_std_limits() -> dict:
    """Load NASA-STD-3001 limits."""
    return _load_json("nasa_std_3001_limits.json")


def load_soma_priors() -> dict:
    """Load SOMA / Inspiration4 priors."""
    return _load_json("soma_inspiration4_priors.json")


# ---------------------------------------------------------------------------
# Stressor and countermeasure coupling matrices
# ---------------------------------------------------------------------------
def build_stressor_coupling_matrix() -> np.ndarray:
    """
    B_u: 7x4 matrix mapping [ppCO2, proton_flux, ugrav_days, sleep_debt]
    to rate-of-change on each axis. Units: axis-points per (stressor-unit * hour).
    Negative values = degradation from stressor increase.
    Derived from SOMA/Twins Study effect sizes.
    """
    B_u = np.zeros((N_AXES, 4))
    # ppCO2 effect: degrades neuro, cardio, sleep
    B_u[AXIS_IDX["cardio"], 0] = -1.2     # ppCO2 -> cardio
    B_u[AXIS_IDX["neuro"], 0] = -2.5      # ppCO2 -> neuro (headache, cognition)
    B_u[AXIS_IDX["sleep"], 0] = -1.0      # ppCO2 -> sleep quality
    # Proton flux: degrades rad, immune
    B_u[AXIS_IDX["rad"], 1] = -3.8        # proton flux -> radiation burden
    B_u[AXIS_IDX["immune"], 1] = -1.5     # proton flux -> immune suppression
    # Microgravity days: degrades bone, cardio
    B_u[AXIS_IDX["bone"], 2] = -0.035     # per day -> monthly ~1% BMD loss
    B_u[AXIS_IDX["cardio"], 2] = -0.025   # cardiovascular deconditioning
    B_u[AXIS_IDX["neuro"], 2] = -0.015    # SANS risk accumulation
    # Sleep debt: degrades sleep, behav, neuro
    B_u[AXIS_IDX["sleep"], 3] = -2.0      # direct sleep impact
    B_u[AXIS_IDX["behav"], 3] = -1.5      # behavioral degradation
    B_u[AXIS_IDX["neuro"], 3] = -1.0      # neurocognitive impact
    return B_u


def build_countermeasure_coupling_matrix() -> np.ndarray:
    """
    B_c: 7x5 matrix mapping [ared_load, co2_scrub, lighting_k, shelter, med_kit]
    to rate-of-change on each axis. Positive values = improvement.
    """
    B_c = np.zeros((N_AXES, 5))
    # ARED load: improves bone, cardio
    B_c[AXIS_IDX["bone"], 0] = 0.02       # resistive exercise -> bone preservation
    B_c[AXIS_IDX["cardio"], 0] = 0.015    # cardiovascular conditioning
    B_c[AXIS_IDX["behav"], 0] = 0.005     # exercise improves mood
    # CO2 scrubber efficiency: counteracts ppCO2
    B_c[AXIS_IDX["neuro"], 1] = 1.5       # improved cognition
    B_c[AXIS_IDX["cardio"], 1] = 0.8      # cardiovascular relief
    B_c[AXIS_IDX["sleep"], 1] = 0.6       # better sleep air quality
    # Lighting kelvin: improves sleep, behav (circadian)
    B_c[AXIS_IDX["sleep"], 2] = 0.0004    # blue-enriched light -> alertness timing
    B_c[AXIS_IDX["behav"], 2] = 0.0002    # mood from circadian alignment
    # Storm shelter: protects rad
    B_c[AXIS_IDX["rad"], 3] = 8.0         # shelter -> radiation protection (binary)
    B_c[AXIS_IDX["immune"], 3] = 2.0      # reduced immune insult
    # Med kit: broad low-level support
    B_c[AXIS_IDX["cardio"], 4] = 1.0      # pharmacological support
    B_c[AXIS_IDX["immune"], 4] = 0.8      # anti-inflammatory
    B_c[AXIS_IDX["behav"], 4] = 0.5       # anxiolytic/mood
    return B_c


# ---------------------------------------------------------------------------
# Conformal prediction calibration
# ---------------------------------------------------------------------------
CONFORMAL_Q_SQUARED = 4.0  # Conformal residual variance calibrated offline


def compute_conformal_interval(
    x_hat: float, sigma_kk: float, alpha: float = 0.10
) -> tuple[float, float, float]:
    """
    90% conformal prediction interval.
    CI = x_hat +/- z_{1-alpha/2} * sqrt(sigma_kk + q_conformal^2)
    Returns (ci_lower, ci_upper, ci_width).
    """
    z = 1.645  # z_{0.95} for 90% two-sided
    margin = z * math.sqrt(max(sigma_kk, 0.0) + CONFORMAL_Q_SQUARED)
    ci_lower = max(0.0, x_hat - margin)
    ci_upper = min(100.0, x_hat + margin)
    ci_width = ci_upper - ci_lower
    return ci_lower, ci_upper, ci_width


# ---------------------------------------------------------------------------
# Allostatic Resilience Index
# ---------------------------------------------------------------------------
# Axis weights: clinical severity weighting
ARI_WEIGHTS = np.array([0.20, 0.15, 0.10, 0.15, 0.15, 0.10, 0.15])
ARI_DANGER_P = 3.0


def compute_ari(x_hat: np.ndarray) -> tuple[float, str]:
    """
    Allostatic Resilience Index via weighted power-mean with danger penalty.
    ARI = (sum w_k * x_k^(-p))^(-1/p)
    Lower scores on any axis dominate due to p=3.0 harmonic-like penalty.
    Returns (ari_value, provenance).
    """
    x_safe = np.clip(x_hat, 1.0, 100.0)  # floor at 1.0 to avoid division by zero
    weighted_sum = np.sum(ARI_WEIGHTS * np.power(x_safe, -ARI_DANGER_P))
    ari = math.pow(weighted_sum, -1.0 / ARI_DANGER_P)
    provenance = Provenance.DERIVED.value
    return float(np.clip(ari, 0.0, 100.0)), provenance


# ---------------------------------------------------------------------------
# Digital Twin Core Engine
# ---------------------------------------------------------------------------
class DigitalTwinEngine:
    """
    7-Axis Kalman + Ornstein-Uhlenbeck Bayesian Digital Twin.
    Maintains posterior state estimate and covariance.
    Supports prediction, update, forecasting, and scenario replay.
    """

    def __init__(self) -> None:
        # Load priors
        self.ou_params = load_ou_params()
        self.Q_base = load_process_noise()
        self.R_base = load_observation_noise()
        self.nasa_limits = load_nasa_std_limits()
        self.soma_priors = load_soma_priors()

        # Coupling matrices
        self.B_u = build_stressor_coupling_matrix()
        self.B_c = build_countermeasure_coupling_matrix()

        # Initialize state to OU mu baselines
        self.x_hat = np.array([
            self.ou_params[axis]["mu_baseline"] for axis in AXIS_NAMES
        ], dtype=np.float64)

        # Initialize covariance from OU sigma^2
        sigma_init = np.array([
            self.ou_params[axis]["sigma"] ** 2 for axis in AXIS_NAMES
        ], dtype=np.float64)
        self.P = np.diag(sigma_init)

        # OU parameters as arrays
        self.theta = np.array([
            self.ou_params[axis]["theta"] for axis in AXIS_NAMES
        ], dtype=np.float64)
        self.mu = np.array([
            self.ou_params[axis]["mu_baseline"] for axis in AXIS_NAMES
        ], dtype=np.float64)

        # Current time
        self.t_hours = 0.0

        # Conformal calibration residuals (running)
        self._residual_buffer: list[np.ndarray] = []
        self._max_residuals = 200

    def reset(self) -> None:
        """Reset twin to initial state."""
        self.__init__()

    def get_state(self) -> TwinState:
        """Return current posterior state as a TwinState model."""
        axes = []
        any_abstain = False
        for i, name in enumerate(AXIS_NAMES):
            ci_lower, ci_upper, ci_width = compute_conformal_interval(
                self.x_hat[i], self.P[i, i]
            )
            if ci_width > 28.0:
                prov = Provenance.ABSTAIN.value
                any_abstain = True
            else:
                prov = Provenance.DERIVED.value

            axes.append(AxisEstimate(
                axis=name,
                x_hat=round(float(self.x_hat[i]), 2),
                sigma=round(float(math.sqrt(max(self.P[i, i], 0.0))), 2),
                ci_lower=round(ci_lower, 2),
                ci_upper=round(ci_upper, 2),
                ci_width=round(ci_width, 2),
                provenance=prov,
            ))

        ari_val, ari_prov = compute_ari(self.x_hat)
        if any_abstain:
            ari_prov = Provenance.ABSTAIN.value

        return TwinState(
            t_hours=round(self.t_hours, 2),
            axes=axes,
            ari=round(ari_val, 2),
            ari_provenance=ari_prov,
            covariance_trace=round(float(np.trace(self.P)), 2),
        )

    def predict(
        self,
        dt_hours: float,
        stressors: EnvironmentalStressors,
        countermeasures: Countermeasures,
    ) -> None:
        """
        Predict step: propagate state forward by dt_hours using discretized OU process.
        X_{t+dt} = X_t + theta*(mu - X_t)*dt + B_u*U_t*dt + B_c*C_t*dt
        Covariance: P = F*P*F^T + Q*dt
        """
        dt = dt_hours

        # Stressor input vector
        u_t = np.array([
            stressors.cabin_ppco2_mmhg,
            stressors.goes_proton_flux_pfu,
            stressors.microgravity_days,
            stressors.sleep_debt_hours,
        ], dtype=np.float64)

        # Countermeasure input vector
        c_t = np.array([
            countermeasures.ared_load_kg,
            countermeasures.co2_scrubber_efficiency,
            countermeasures.lighting_kelvin,
            1.0 if countermeasures.storm_shelter_active else 0.0,
            1.0 if countermeasures.med_kit_intervention else 0.0,
        ], dtype=np.float64)

        # OU mean reversion
        dx_ou = self.theta * (self.mu - self.x_hat) * dt

        # Stressor forcing
        dx_stressor = (self.B_u @ u_t) * dt

        # Countermeasure forcing
        dx_counter = (self.B_c @ c_t) * dt

        # State update
        self.x_hat = self.x_hat + dx_ou + dx_stressor + dx_counter
        self.x_hat = np.clip(self.x_hat, 0.0, 100.0)

        # State transition Jacobian F = I + diag(-theta)*dt (linearized OU)
        F = np.eye(N_AXES) + np.diag(-self.theta) * dt

        # Covariance prediction: P = F*P*F^T + Q*dt
        self.P = F @ self.P @ F.T + self.Q_base * dt

        # Ensure symmetry
        self.P = 0.5 * (self.P + self.P.T)

        self.t_hours += dt_hours

    def update(self, observation: SensorObservation) -> None:
        """
        Kalman update with sensor dropout handling.
        If an axis value is None, zero that row in H_t so posterior covariance grows.
        Uses Joseph-form covariance update for numerical stability:
        P_plus = (I - K*H)*P_minus*(I - K*H)^T + K*R*K^T
        """
        # Build observation vector and mask
        z = np.zeros(N_AXES, dtype=np.float64)
        mask = np.zeros(N_AXES, dtype=np.float64)

        for i, name in enumerate(AXIS_NAMES):
            val = observation.values.get(name)
            if val is not None:
                z[i] = val
                mask[i] = 1.0
            # else: z[i] = 0, mask[i] = 0 -> dropout

        # Observation matrix: H = diag(mask) - zeroed rows for dropout
        H = np.diag(mask)

        # If all sensors dropped out, skip update entirely
        if np.sum(mask) == 0:
            return

        # Build R for active sensors only (avoid singularity)
        R = self.R_base.copy()
        for i in range(N_AXES):
            if mask[i] == 0.0:
                # Set very high noise for dropped sensors (effectively infinite)
                R[i, i] = 1e12

        # Innovation
        y = z - H @ self.x_hat

        # Innovation covariance: S = H*P*H^T + R
        S = H @ self.P @ H.T + R

        # Kalman gain: K = P*H^T*S^{-1}
        try:
            S_inv = scipy_inv(S)
        except np.linalg.LinAlgError:
            # Fallback: pseudoinverse for near-singular S
            S_inv = np.linalg.pinv(S)

        K = self.P @ H.T @ S_inv

        # State update
        self.x_hat = self.x_hat + K @ y
        self.x_hat = np.clip(self.x_hat, 0.0, 100.0)

        # Joseph-form covariance update for numerical stability:
        # P_plus = (I - K*H)*P_minus*(I - K*H)^T + K*R_active*K^T
        IKH = np.eye(N_AXES) - K @ H
        self.P = IKH @ self.P @ IKH.T + K @ R @ K.T

        # Ensure symmetry and positive semi-definiteness
        self.P = 0.5 * (self.P + self.P.T)
        eigvals = np.linalg.eigvalsh(self.P)
        if np.any(eigvals < 0):
            self.P += np.eye(N_AXES) * (abs(min(eigvals)) + 1e-6)

        # Update conformal residuals
        active_indices = np.where(mask > 0)[0]
        if len(active_indices) > 0:
            residuals = np.abs(y[active_indices])
            self._residual_buffer.append(residuals)
            if len(self._residual_buffer) > self._max_residuals:
                self._residual_buffer.pop(0)

        # Sync time
        self.t_hours = observation.t_hours

    def forecast(
        self,
        horizon_hours: float,
        dt_step: float,
        stressors: EnvironmentalStressors,
        countermeasures: Countermeasures,
    ) -> ForecastResult:
        """
        Forward-propagate the twin state over a horizon without updating from sensors.
        Returns trajectory with conformal intervals and critical crossing times.
        """
        # Save current state
        x_save = self.x_hat.copy()
        P_save = self.P.copy()
        t_save = self.t_hours

        trajectory: list[TrajectoryPoint] = []
        critical_crossings: dict[str, Optional[float]] = {name: None for name in AXIS_NAMES}
        critical_threshold = 40.0

        n_steps = max(1, int(horizon_hours / dt_step))
        actual_dt = horizon_hours / n_steps

        for step in range(n_steps + 1):
            t_current = t_save + step * actual_dt

            ci_lowers = []
            ci_uppers = []
            x_vals = []
            for i in range(N_AXES):
                ci_lo, ci_hi, _ = compute_conformal_interval(self.x_hat[i], self.P[i, i])
                ci_lowers.append(round(ci_lo, 2))
                ci_uppers.append(round(ci_hi, 2))
                x_vals.append(round(float(self.x_hat[i]), 2))

                # Track critical crossings (lower bound <= threshold)
                if critical_crossings[AXIS_NAMES[i]] is None and ci_lo <= critical_threshold:
                    critical_crossings[AXIS_NAMES[i]] = round(t_current, 2)

            trajectory.append(TrajectoryPoint(
                t_hours=round(t_current, 2),
                x_hat=x_vals,
                ci_lower=ci_lowers,
                ci_upper=ci_uppers,
            ))

            if step < n_steps:
                self.predict(actual_dt, stressors, countermeasures)

        # Restore state
        self.x_hat = x_save
        self.P = P_save
        self.t_hours = t_save

        return ForecastResult(
            horizon_hours=horizon_hours,
            trajectory=trajectory,
            critical_crossings=critical_crossings,
        )

    def forecast_72h(
        self,
        stressors: EnvironmentalStressors,
        countermeasures: Countermeasures,
    ) -> ForecastResult:
        """72-hour forecast with 1-hour steps."""
        return self.forecast(72.0, 1.0, stressors, countermeasures)

    def forecast_14d(
        self,
        stressors: EnvironmentalStressors,
        countermeasures: Countermeasures,
    ) -> ForecastResult:
        """14-day forecast with 6-hour steps."""
        return self.forecast(336.0, 6.0, stressors, countermeasures)

    def get_covariance_matrix(self) -> np.ndarray:
        """Return current posterior covariance matrix."""
        return self.P.copy()

    def get_state_vector(self) -> np.ndarray:
        """Return current posterior state vector."""
        return self.x_hat.copy()


# ---------------------------------------------------------------------------
# Pre-loaded Replay Scenarios
# ---------------------------------------------------------------------------
def build_scenario_a() -> ReplayScenario:
    """
    Scenario A: Crew-11 LEO Subclinical SANS + Sensor Dropout
    Neuro axis drifting down from cephalad fluid shift.
    Ocular POCUS sensor dropout at t=24h.
    Duration: 48h replay.
    """
    observations = []
    stressor_timeline = []
    countermeasure_timeline = []

    # Baseline observations t=0 to t=20h (4h intervals)
    for t in range(0, 24, 4):
        obs_vals: dict[str, Optional[float]] = {
            "cardio": 70.0 - 0.1 * t,
            "neuro": 76.0 - 0.4 * t,   # slow neuro drift down (SANS onset)
            "bone": 84.0,
            "immune": 68.0,
            "sleep": 78.0 - 0.2 * t,
            "behav": 74.0,
            "rad": 89.0,
        }
        observations.append(SensorObservation(t_hours=float(t), values=obs_vals))
        stressor_timeline.append({
            "t_hours": float(t),
            "cabin_ppco2_mmhg": 1.8,
            "goes_proton_flux_pfu": 0.05,
            "microgravity_days": t / 24.0 + 30.0,  # already 30 days in
            "sleep_debt_hours": 1.0 + 0.05 * t,
        })
        countermeasure_timeline.append({
            "t_hours": float(t),
            "ared_load_kg": 90.0,
            "co2_scrubber_efficiency": 0.95,
            "lighting_kelvin": 5000.0,
            "storm_shelter_active": False,
            "med_kit_intervention": None,
        })

    # t=24h: Ocular POCUS sensor drops out, neuro unobservable
    for t in range(24, 48, 4):
        obs_vals = {
            "cardio": 67.0 - 0.15 * (t - 24),
            "neuro": None,  # SENSOR DROPOUT - POCUS offline
            "bone": 83.5,
            "immune": 66.0 - 0.2 * (t - 24),
            "sleep": 72.0 - 0.3 * (t - 24),
            "behav": 72.0,
            "rad": 88.5,
        }
        observations.append(SensorObservation(t_hours=float(t), values=obs_vals))
        stressor_timeline.append({
            "t_hours": float(t),
            "cabin_ppco2_mmhg": 2.0,
            "goes_proton_flux_pfu": 0.08,
            "microgravity_days": t / 24.0 + 30.0,
            "sleep_debt_hours": 2.2 + 0.1 * (t - 24),
        })
        countermeasure_timeline.append({
            "t_hours": float(t),
            "ared_load_kg": 85.0,
            "co2_scrubber_efficiency": 0.92,
            "lighting_kelvin": 4800.0,
            "storm_shelter_active": False,
            "med_kit_intervention": None,
        })

    return ReplayScenario(
        meta=ScenarioMeta(
            id="SCENARIO_A",
            name="Crew-11 LEO Subclinical SANS + Sensor Dropout",
            description=(
                "Subclinical SANS onset detected via neuro axis drift with "
                "ocular POCUS sensor dropout at t=24h. Twin posterior uncertainty "
                "on neuro axis grows during dropout, triggering abstention."
            ),
            mission_profile="LEO_ISS",
            duration_hours=48.0,
        ),
        observations=observations,
        stressor_timeline=stressor_timeline,
        countermeasure_timeline=countermeasure_timeline,
        expected_outcomes={
            "neuro_drift_direction": "downward",
            "neuro_abstention_after_dropout": True,
            "ari_degradation": True,
            "expected_ari_range": [55.0, 70.0],
            "recommended_action": "Restore POCUS sensor, schedule M3_OCULAR_POCUS measurement",
        },
    )


def build_scenario_b() -> ReplayScenario:
    """
    Scenario B: Artemis II Lunar SPE Solar Storm + Cabin CO2 Spike
    Radiation axis spiking from GOES proton flux surge.
    Immune axis degrading from radiation insult.
    ppCO2 rising due to increased crew metabolic load during shelter-in-place.
    Duration: 36h replay.
    """
    observations = []
    stressor_timeline = []
    countermeasure_timeline = []

    # Pre-storm baseline t=0 to t=6h
    for t in range(0, 8, 2):
        observations.append(SensorObservation(
            t_hours=float(t),
            values={
                "cardio": 71.0,
                "neuro": 77.0,
                "bone": 84.0,
                "immune": 69.0,
                "sleep": 79.0,
                "behav": 73.0,
                "rad": 88.0,
            }
        ))
        stressor_timeline.append({
            "t_hours": float(t),
            "cabin_ppco2_mmhg": 1.6,
            "goes_proton_flux_pfu": 0.3,
            "microgravity_days": 5.0 + t / 24.0,
            "sleep_debt_hours": 0.5,
        })
        countermeasure_timeline.append({
            "t_hours": float(t),
            "ared_load_kg": 60.0,
            "co2_scrubber_efficiency": 0.98,
            "lighting_kelvin": 5000.0,
            "storm_shelter_active": False,
            "med_kit_intervention": None,
        })

    # SPE onset t=8h: proton flux surges, CO2 spikes
    for t in range(8, 24, 2):
        hours_into_storm = t - 8
        flux_ramp = min(0.3 + hours_into_storm * 3.5, 55.0)  # ramps to ~55 pfu
        co2_ramp = min(1.6 + hours_into_storm * 0.15, 3.8)   # CO2 creep

        observations.append(SensorObservation(
            t_hours=float(t),
            values={
                "cardio": 69.0 - 0.3 * hours_into_storm,
                "neuro": 75.0 - 0.2 * hours_into_storm,
                "bone": 83.5,
                "immune": 67.0 - 0.8 * hours_into_storm,  # immune hit
                "sleep": 75.0 - 0.5 * hours_into_storm,
                "behav": 70.0 - 0.4 * hours_into_storm,
                "rad": 85.0 - 2.0 * hours_into_storm,     # rad plummeting
            }
        ))
        stressor_timeline.append({
            "t_hours": float(t),
            "cabin_ppco2_mmhg": co2_ramp,
            "goes_proton_flux_pfu": flux_ramp,
            "microgravity_days": 5.0 + t / 24.0,
            "sleep_debt_hours": 1.0 + 0.15 * hours_into_storm,
        })
        # Shelter activates at t=10h
        shelter = t >= 10
        countermeasure_timeline.append({
            "t_hours": float(t),
            "ared_load_kg": 0.0,  # no exercise during storm
            "co2_scrubber_efficiency": 0.85 if shelter else 0.90,  # reduced in shelter
            "lighting_kelvin": 3500.0 if shelter else 5000.0,
            "storm_shelter_active": shelter,
            "med_kit_intervention": "anti_emetic" if hours_into_storm > 6 else None,
        })

    # Post-storm recovery t=24h to t=36h
    for t in range(24, 38, 2):
        hours_post = t - 24
        flux_decay = max(55.0 * math.exp(-0.3 * hours_post), 0.2)

        observations.append(SensorObservation(
            t_hours=float(t),
            values={
                "cardio": 63.0 + 0.3 * hours_post,
                "neuro": 72.0 + 0.15 * hours_post,
                "bone": 83.0,
                "immune": 55.0 + 0.4 * hours_post,
                "sleep": 66.0 + 0.5 * hours_post,
                "behav": 64.0 + 0.3 * hours_post,
                "rad": 55.0 + 0.8 * hours_post,
            }
        ))
        stressor_timeline.append({
            "t_hours": float(t),
            "cabin_ppco2_mmhg": max(3.8 - 0.2 * hours_post, 1.8),
            "goes_proton_flux_pfu": flux_decay,
            "microgravity_days": 5.0 + t / 24.0,
            "sleep_debt_hours": max(3.5 - 0.2 * hours_post, 0.5),
        })
        countermeasure_timeline.append({
            "t_hours": float(t),
            "ared_load_kg": 30.0 if hours_post > 4 else 0.0,
            "co2_scrubber_efficiency": 0.95,
            "lighting_kelvin": 5000.0,
            "storm_shelter_active": hours_post < 4,
            "med_kit_intervention": None,
        })

    return ReplayScenario(
        meta=ScenarioMeta(
            id="SCENARIO_B",
            name="Artemis II Lunar SPE Solar Storm + Cabin CO2 Spike",
            description=(
                "Solar proton event during lunar NRHO transit. GOES proton flux "
                "surges to >50 pfu triggering shelter ingress. Cabin CO2 rises "
                "during shelter-in-place. Rad and immune axes degrade sharply."
            ),
            mission_profile="LUNAR_NRHO",
            duration_hours=36.0,
        ),
        observations=observations,
        stressor_timeline=stressor_timeline,
        countermeasure_timeline=countermeasure_timeline,
        expected_outcomes={
            "rad_axis_minimum": 53.0,
            "immune_degradation_peak": 12.0,
            "co2_veto_triggered": True,
            "shelter_ingress_time_hours": 10.0,
            "ari_nadir_range": [45.0, 58.0],
            "recommended_action": "Maintain shelter, boost CO2 scrubbing, monitor immune panel",
        },
    )


def build_scenario_c() -> ReplayScenario:
    """
    Scenario C: CMO Acute Syncope Incapacitation
    Cardio sudden drop (orthostatic syncope), behav crash, break-glass trigger.
    Duration: 12h replay.
    """
    observations = []
    stressor_timeline = []
    countermeasure_timeline = []

    # Normal baseline t=0 to t=3h
    for t in [0.0, 1.0, 2.0, 3.0]:
        observations.append(SensorObservation(
            t_hours=t,
            values={
                "cardio": 70.0,
                "neuro": 76.0,
                "bone": 84.0,
                "immune": 68.0,
                "sleep": 77.0,
                "behav": 73.0,
                "rad": 89.0,
            }
        ))
        stressor_timeline.append({
            "t_hours": t,
            "cabin_ppco2_mmhg": 1.5,
            "goes_proton_flux_pfu": 0.1,
            "microgravity_days": 45.0,
            "sleep_debt_hours": 1.5,
        })
        countermeasure_timeline.append({
            "t_hours": t,
            "ared_load_kg": 80.0,
            "co2_scrubber_efficiency": 0.96,
            "lighting_kelvin": 5000.0,
            "storm_shelter_active": False,
            "med_kit_intervention": None,
        })

    # Syncope event at t=4h: sudden cardio crash
    observations.append(SensorObservation(
        t_hours=4.0,
        values={
            "cardio": 28.0,    # acute orthostatic syncope
            "neuro": 55.0,     # LOC / altered consciousness
            "bone": 84.0,
            "immune": 66.0,
            "sleep": 45.0,     # disrupted
            "behav": 22.0,     # incapacitated
            "rad": 89.0,
        }
    ))
    stressor_timeline.append({
        "t_hours": 4.0,
        "cabin_ppco2_mmhg": 1.5,
        "goes_proton_flux_pfu": 0.1,
        "microgravity_days": 45.0,
        "sleep_debt_hours": 1.5,
    })
    countermeasure_timeline.append({
        "t_hours": 4.0,
        "ared_load_kg": 0.0,
        "co2_scrubber_efficiency": 0.96,
        "lighting_kelvin": 5000.0,
        "storm_shelter_active": False,
        "med_kit_intervention": None,
    })

    # Emergency response t=5h to t=8h
    for t in [5.0, 6.0, 7.0, 8.0]:
        hours_post_event = t - 4.0
        observations.append(SensorObservation(
            t_hours=t,
            values={
                "cardio": 28.0 + 5.0 * hours_post_event,   # slow recovery with fluids
                "neuro": 55.0 + 3.0 * hours_post_event,
                "bone": 84.0,
                "immune": 64.0,
                "sleep": 45.0 + 4.0 * hours_post_event,
                "behav": 22.0 + 6.0 * hours_post_event,    # regaining function
                "rad": 89.0,
            }
        ))
        stressor_timeline.append({
            "t_hours": t,
            "cabin_ppco2_mmhg": 1.5,
            "goes_proton_flux_pfu": 0.1,
            "microgravity_days": 45.0,
            "sleep_debt_hours": 2.0,
        })
        countermeasure_timeline.append({
            "t_hours": t,
            "ared_load_kg": 0.0,
            "co2_scrubber_efficiency": 0.96,
            "lighting_kelvin": 4000.0,
            "storm_shelter_active": False,
            "med_kit_intervention": "fluid_loading_saline_iv",
        })

    # Stabilization t=9h to t=12h
    for t in [9.0, 10.0, 11.0, 12.0]:
        hours_post_event = t - 4.0
        observations.append(SensorObservation(
            t_hours=t,
            values={
                "cardio": min(48.0 + 2.5 * (t - 8.0), 60.0),
                "neuro": min(67.0 + 1.5 * (t - 8.0), 72.0),
                "bone": 84.0,
                "immune": 65.0,
                "sleep": min(61.0 + 2.0 * (t - 8.0), 72.0),
                "behav": min(46.0 + 3.0 * (t - 8.0), 60.0),
                "rad": 89.0,
            }
        ))
        stressor_timeline.append({
            "t_hours": t,
            "cabin_ppco2_mmhg": 1.5,
            "goes_proton_flux_pfu": 0.1,
            "microgravity_days": 45.0,
            "sleep_debt_hours": 2.5,
        })
        countermeasure_timeline.append({
            "t_hours": t,
            "ared_load_kg": 0.0,
            "co2_scrubber_efficiency": 0.96,
            "lighting_kelvin": 3500.0,  # dim for rest
            "storm_shelter_active": False,
            "med_kit_intervention": "fluid_loading_saline_iv",
        })

    return ReplayScenario(
        meta=ScenarioMeta(
            id="SCENARIO_C",
            name="CMO Acute Syncope Incapacitation",
            description=(
                "Chief Medical Officer experiences acute orthostatic syncope at t=4h. "
                "Cardio axis drops to 28, behav axis crashes to 22 (incapacitation). "
                "Break-glass privacy override triggered. IV fluid loading initiated."
            ),
            mission_profile="LEO_ISS",
            duration_hours=12.0,
        ),
        observations=observations,
        stressor_timeline=stressor_timeline,
        countermeasure_timeline=countermeasure_timeline,
        expected_outcomes={
            "cardio_nadir": 28.0,
            "behav_nadir": 22.0,
            "break_glass_triggered": True,
            "break_glass_trigger_time": 4.0,
            "ari_nadir_range": [20.0, 35.0],
            "return_window_status": "RETURN_WINDOW_CRITICAL_BREACH",
            "recommended_action": "Break-glass privacy override, IV fluid loading, prepare departure",
        },
    )


SCENARIOS: dict[str, ReplayScenario] = {
    "SCENARIO_A": build_scenario_a(),
    "SCENARIO_B": build_scenario_b(),
    "SCENARIO_C": build_scenario_c(),
}


def get_scenario(scenario_id: str) -> ReplayScenario:
    """Retrieve a pre-loaded replay scenario by ID."""
    if scenario_id not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_id}. Available: {list(SCENARIOS.keys())}")
    return SCENARIOS[scenario_id]


def list_scenarios() -> list[ScenarioMeta]:
    """List all available replay scenario metadata."""
    return [s.meta for s in SCENARIOS.values()]


def replay_scenario(
    engine: DigitalTwinEngine,
    scenario_id: str,
) -> list[TwinState]:
    """
    Replay a scenario through the twin engine, returning state snapshots
    at each observation timestep.
    """
    scenario = get_scenario(scenario_id)
    engine.reset()

    states: list[TwinState] = []
    prev_t = 0.0

    for i, obs in enumerate(scenario.observations):
        # Get matching stressor and countermeasure for this timestep
        stressor_dict = scenario.stressor_timeline[i] if i < len(scenario.stressor_timeline) else scenario.stressor_timeline[-1]
        counter_dict = scenario.countermeasure_timeline[i] if i < len(scenario.countermeasure_timeline) else scenario.countermeasure_timeline[-1]

        stressors = EnvironmentalStressors(
            cabin_ppco2_mmhg=stressor_dict["cabin_ppco2_mmhg"],
            goes_proton_flux_pfu=stressor_dict["goes_proton_flux_pfu"],
            microgravity_days=stressor_dict["microgravity_days"],
            sleep_debt_hours=stressor_dict["sleep_debt_hours"],
        )
        countermeasures = Countermeasures(
            ared_load_kg=counter_dict["ared_load_kg"],
            co2_scrubber_efficiency=counter_dict["co2_scrubber_efficiency"],
            lighting_kelvin=counter_dict["lighting_kelvin"],
            storm_shelter_active=counter_dict["storm_shelter_active"],
            med_kit_intervention=counter_dict.get("med_kit_intervention"),
        )

        dt = obs.t_hours - prev_t
        if dt > 0:
            engine.predict(dt, stressors, countermeasures)

        engine.update(obs)
        states.append(engine.get_state())
        prev_t = obs.t_hours

    return states


# ---------------------------------------------------------------------------
# CrewDigitalTwin - High-level wrapper for individual crew member twins
# ---------------------------------------------------------------------------
class CrewDigitalTwin:
    """
    Crew-specific Digital Twin instance.
    Wraps DigitalTwinEngine with crew metadata, persistent dropout flags,
    countermeasure application, and scenario initialization.
    """

    def __init__(
        self,
        crew_id: str = "CDR_VANCE",
        name: str = "CDR. Vance",
        role: str = "Commander",
        age: int = 48,
        sex: str = "M",
        mission_day: int = 47,
        priors: Optional[dict] = None,
    ) -> None:
        self.crew_id = crew_id
        self.name = name
        self.role = role
        self.age = age
        self.sex = sex
        self.mission_day = mission_day
        self.priors = priors or {}

        self.engine = DigitalTwinEngine()
        self.sensor_dropout: dict[str, bool] = {name: False for name in AXIS_NAMES}
        self.active_scenario: Optional[str] = None
        self._countermeasure_offsets: dict[str, float] = {name: 0.0 for name in AXIS_NAMES}

        # Demographically calibrated baselines
        if crew_id == "CDR_VANCE":
            self.engine.x_hat[AXIS_IDX["neuro"]] = 71.5
            self.engine.x_hat[AXIS_IDX["cardio"]] = 78.0
        elif crew_id == "PLT_ROSTOVA":
            self.engine.x_hat[AXIS_IDX["sleep"]] = 68.0
            self.engine.x_hat[AXIS_IDX["behav"]] = 74.0
        elif crew_id == "MS1_CHEN":
            self.engine.x_hat[AXIS_IDX["rad"]] = 79.0
            self.engine.x_hat[AXIS_IDX["immune"]] = 72.0
        elif crew_id == "CMO_PATEL":
            self.engine.x_hat[AXIS_IDX["cardio"]] = 75.0
            self.engine.x_hat[AXIS_IDX["neuro"]] = 80.0

    def get_ari(self) -> float:
        """Calculate composite Allostatic Resilience Index."""
        ari_val, _ = compute_ari(self.engine.x_hat)
        return float(ari_val)

    def get_state(self) -> dict[str, Any]:
        """
        Return comprehensive dictionary representation of current twin state,
        fully compatible with REST API and voice orchestrator expectations.
        """
        import datetime
        axes_dict: dict[str, float] = {}
        uncertainties_dict: dict[str, float] = {}
        ci_dict: dict[str, list[float]] = {}
        trends_dict: dict[str, str] = {}
        prov_dict: dict[str, str] = {}

        for i, name in enumerate(AXIS_NAMES):
            val = float(self.engine.x_hat[i])
            ci_lo, ci_hi, ci_w = compute_conformal_interval(val, self.engine.P[i, i])

            if self.sensor_dropout.get(name, False):
                ci_w += 15.0
                ci_lo = max(0.0, val - 1.645 * math.sqrt(self.engine.P[i, i] + CONFORMAL_Q_SQUARED) - 7.5)
                ci_hi = min(100.0, val + 1.645 * math.sqrt(self.engine.P[i, i] + CONFORMAL_Q_SQUARED) + 7.5)

            axes_dict[name] = round(val, 2)
            uncertainties_dict[name] = round(ci_w, 2)
            ci_dict[name] = [round(ci_lo, 2), round(ci_hi, 2)]

            if self.sensor_dropout.get(name, False) or ci_w > 28.0:
                prov_dict[name] = Provenance.ABSTAIN.value
            else:
                prov_dict[name] = Provenance.DERIVED.value

            mu = self.engine.ou_params[name]["mu_baseline"]
            if val < mu - 8.0:
                trends_dict[name] = "declining"
            elif val > mu + 4.0:
                trends_dict[name] = "improving"
            else:
                trends_dict[name] = "stable"

        ari_val = self.get_ari()
        any_abstain = any(p == Provenance.ABSTAIN.value for p in prov_dict.values())
        ari_prov = Provenance.ABSTAIN.value if any_abstain else Provenance.DERIVED.value

        return {
            "crew_id": self.crew_id,
            "crew_name": self.name,
            "mission_day": self.mission_day,
            "t_hours": round(self.engine.t_hours, 2),
            "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "axes": axes_dict,
            "uncertainties": uncertainties_dict,
            "confidence_intervals": ci_dict,
            "trends": trends_dict,
            "provenance": prov_dict,
            "sensor_dropout": dict(self.sensor_dropout),
            "ari": round(ari_val, 4),
            "ari_provenance": ari_prov,
            "active_scenario": self.active_scenario,
        }

    def predict_trajectory(self, horizon_hours: int = 72) -> list[dict[str, Any]]:
        """
        Forward propagate trajectory with 90% conformal prediction intervals.
        """
        dt_step = 1.0 if horizon_hours <= 72 else 4.0
        stressors = EnvironmentalStressors()
        countermeasures = Countermeasures()

        forecast_res = self.engine.forecast(
            horizon_hours=float(horizon_hours),
            dt_step=dt_step,
            stressors=stressors,
            countermeasures=countermeasures,
        )

        out_trajectory: list[dict[str, Any]] = []
        for pt in forecast_res.trajectory:
            pt_axes = {AXIS_NAMES[i]: pt.x_hat[i] for i in range(N_AXES)}
            pt_ci_lower = {AXIS_NAMES[i]: pt.ci_lower[i] for i in range(N_AXES)}
            pt_ci_upper = {AXIS_NAMES[i]: pt.ci_upper[i] for i in range(N_AXES)}

            pt_x_array = np.array(pt.x_hat, dtype=np.float64)
            pt_ari, _ = compute_ari(pt_x_array)

            out_trajectory.append({
                "t_hours": pt.t_hours,
                "ari": round(pt_ari, 2),
                "axes": pt_axes,
                "ci_lower": pt_ci_lower,
                "ci_upper": pt_ci_upper,
            })

        return out_trajectory

    def apply_countermeasure(self, countermeasure: dict[str, Any]) -> dict[str, Any]:
        """
        Simulate applying a countermeasure and project axes and ARI changes.
        """
        cm = Countermeasures(
            ared_load_kg=float(countermeasure.get("ared_load_kg", 50.0)),
            co2_scrubber_efficiency=float(countermeasure.get("co2_scrubber_efficiency", 0.8)),
            lighting_kelvin=float(countermeasure.get("lighting_kelvin", 4500.0)),
            storm_shelter_active=bool(countermeasure.get("storm_shelter_active", False)),
            med_kit_intervention=countermeasure.get("med_kit_intervention"),
        )

        c_vec = np.array([
            cm.ared_load_kg / 100.0,
            cm.co2_scrubber_efficiency,
            (cm.lighting_kelvin - 4500.0) / 2000.0,
            1.0 if cm.storm_shelter_active else 0.0,
            1.0 if cm.med_kit_intervention else 0.0,
        ], dtype=np.float64)

        delta = self.engine.B_c @ c_vec
        new_x = np.clip(self.engine.x_hat + delta * 2.0, 0.0, 100.0)
        ari_after, _ = compute_ari(new_x)

        return {
            "ari_after": round(ari_after, 4),
            "axes_after": {AXIS_NAMES[i]: round(float(new_x[i]), 2) for i in range(N_AXES)},
        }

    def update_observation(
        self,
        axis: str,
        value: float,
        measurement_type: str = "routine",
    ) -> dict[str, Any]:
        """
        Update twin with a single observation using Joseph-form Kalman filter.
        """
        if axis not in AXIS_IDX:
            raise ValueError(f"Invalid axis: {axis}. Allowed: {AXIS_NAMES}")

        obs_dict: dict[str, Optional[float]] = {name: None for name in AXIS_NAMES}
        obs_dict[axis] = float(value)

        obs = SensorObservation(
            t_hours=self.engine.t_hours + 0.1,
            values=obs_dict,
            provenance={axis: Provenance.REAL.value},
            measurement_types={axis: measurement_type},
        )
        self.engine.update(obs)

        self.sensor_dropout[axis] = False

        idx = AXIS_IDX[axis]
        return {
            "axis": axis,
            "value": value,
            "posterior_x": round(float(self.engine.x_hat[idx]), 2),
            "posterior_sigma": round(float(math.sqrt(max(0.0, self.engine.P[idx, idx]))), 2),
            "ari": round(self.get_ari(), 4),
        }

    def toggle_sensor_dropout(self, axis: str, dropout: bool) -> None:
        """Toggle sensor dropout for a specific axis."""
        if axis in self.sensor_dropout:
            self.sensor_dropout[axis] = dropout
            if dropout:
                idx = AXIS_IDX[axis]
                self.engine.P[idx, idx] += 12.0

    def set_scenario(self, scenario_id: str) -> None:
        """Initialize twin according to high-impact replay scenario."""
        self.active_scenario = scenario_id
        sid = scenario_id.lower()
        if "a" in sid or "sans" in sid or "dropout" in sid or "nominal" in sid:
            self.engine.reset()
            self.engine.x_hat[AXIS_IDX["neuro"]] = 58.0
            self.engine.x_hat[AXIS_IDX["cardio"]] = 72.0
            self.engine.x_hat[AXIS_IDX["bone"]] = 81.0
            self.sensor_dropout["neuro"] = True
            self.engine.P[AXIS_IDX["neuro"], AXIS_IDX["neuro"]] = 32.0
        elif "b" in sid or "spe" in sid or "lunar" in sid or "storm" in sid:
            self.engine.reset()
            self.engine.x_hat[AXIS_IDX["rad"]] = 46.0
            self.engine.x_hat[AXIS_IDX["immune"]] = 52.0
            self.engine.x_hat[AXIS_IDX["sleep"]] = 61.0
            self.engine.P[AXIS_IDX["rad"], AXIS_IDX["rad"]] = 28.0
        elif "c" in sid or "cmo" in sid or "incapacitation" in sid or "scrubber" in sid:
            self.engine.reset()
            self.engine.x_hat[AXIS_IDX["cardio"]] = 32.0
            self.engine.x_hat[AXIS_IDX["behav"]] = 28.0
            self.engine.x_hat[AXIS_IDX["neuro"]] = 44.0
            self.engine.P[AXIS_IDX["cardio"], AXIS_IDX["cardio"]] = 45.0
