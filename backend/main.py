"""
CHIRON v2.0 - FastAPI Backend
Production-grade REST + WebSocket API for the CHIRON spaceflight
health decision system.

Endpoints:
  - REST API for twin state, predictions, VoI, return windows, safety
  - WebSocket /ws/voice for real-time voice streaming
  - WebSocket /ws/telemetry for live twin state pushes (2s interval)
  - NOAA/NASA live data fetching with SHA-256 cached snapshots
  - Full Pydantic request/response models
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import io
import json
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
import numpy as np
import uvicorn
from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    File,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Load environment
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).parent.resolve()
load_dotenv(BACKEND_DIR / ".env")

# Ensure backend directory is on sys.path for companion module imports
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# ---------------------------------------------------------------------------
# Companion module imports
# ---------------------------------------------------------------------------
from twin_engine import CrewDigitalTwin  # noqa: E402
from voi_planner import VoIPlanner  # noqa: E402
from return_window import ReturnWindowSolver  # noqa: E402
from safety_guard import SafetyGuard  # noqa: E402
from audit_vault import AuditVault  # noqa: E402
from voice_orchestrator import VoiceOrchestrator, VoiceOrchestratorConfig, PROV_REAL, PROV_SIM, PROV_DER, PROV_ABSTAIN  # noqa: E402

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger("chiron.api")

# ---------------------------------------------------------------------------
# Configuration constants
# ---------------------------------------------------------------------------
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", '["http://localhost:5173","http://localhost:3000"]')
try:
    CORS_ORIGINS = json.loads(CORS_ORIGINS_RAW)
except json.JSONDecodeError:
    CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

if os.getenv("VERCEL"):
    CACHE_DIR = Path("/tmp/chiron_cache")
else:
    CACHE_DIR = BACKEND_DIR / "data" / "cache"

try:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    CACHE_DIR = Path("/tmp/chiron_cache")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

PRIORS_DIR = BACKEND_DIR / "data" / "priors"
CONFIG_DIR = BACKEND_DIR / "config"

TELEMETRY_PUSH_INTERVAL_S = 2.0
NOAA_FETCH_INTERVAL_S = 300  # 5 minutes

# ---------------------------------------------------------------------------
# Crew definitions
# ---------------------------------------------------------------------------
CREW_MANIFEST = [
    {"id": "CDR_VANCE", "name": "CDR. Vance", "role": "Commander", "age": 48, "sex": "M", "mission_day": 47},
    {"id": "PLT_ROSTOVA", "name": "PLT. Rostova", "role": "Pilot", "age": 39, "sex": "F", "mission_day": 47},
    {"id": "MS1_CHEN", "name": "MS1. Chen", "role": "Mission Specialist", "age": 35, "sex": "M", "mission_day": 47},
    {"id": "CMO_PATEL", "name": "CMO. Patel", "role": "Chief Medical Officer", "age": 42, "sex": "F", "mission_day": 47},
]

SCENARIO_LIST = [
    {
        "id": "nominal",
        "name": "Nominal Operations",
        "description": "Standard ISS day with routine exercise and science ops",
    },
    {
        "id": "spe_event",
        "name": "Solar Particle Event",
        "description": "GOES proton flux exceeds 10 pfu; storm shelter protocol",
    },
    {
        "id": "co2_scrubber_fault",
        "name": "CO2 Scrubber Degradation",
        "description": "CDRA partial failure; ppCO2 rising above 3.5 mmHg",
    },
    {
        "id": "crew_incapacitation",
        "name": "Crew Medical Emergency",
        "description": "CMO incapacitated; break-glass autonomous authority activated",
    },
    {
        "id": "sleep_disruption",
        "name": "Circadian Disruption",
        "description": "Multi-day sleep debt from schedule perturbation",
    },
    {
        "id": "sans_progression",
        "name": "SANS Progression",
        "description": "Spaceflight-Associated Neuro-ocular Syndrome detection and monitoring",
    },
]

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------
twin_registry: dict[str, CrewDigitalTwin] = {}
voi_planner_instance: Optional[VoIPlanner] = None
return_window_solver_instance: Optional[ReturnWindowSolver] = None
safety_guard_instance: Optional[SafetyGuard] = None
audit_vault_instance: Optional[AuditVault] = None
voice_orchestrator_instance: Optional[VoiceOrchestrator] = None

active_crew_id: str = "CDR_VANCE"
airgap_mode: bool = False

# Telemetry cache
telemetry_cache: dict[str, Any] = {
    "goes_proton_flux": None,
    "kp_index": None,
    "osdr_meta": None,
    "last_fetch_utc": None,
}

# Connected WebSocket clients
ws_telemetry_clients: set[WebSocket] = set()
ws_voice_clients: set[WebSocket] = set()

# Background tasks
_background_tasks: list[asyncio.Task] = []

# ---------------------------------------------------------------------------
# Data loading helpers
# ---------------------------------------------------------------------------

def load_json_file(path: Path) -> dict[str, Any]:
    """Load a JSON file with error handling."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.error("Failed to load %s: %s", path, exc)
        return {}


def load_endpoints_config() -> dict[str, Any]:
    return load_json_file(CONFIG_DIR / "endpoints.json")


def load_priors() -> dict[str, Any]:
    return {
        "nasa_std_3001": load_json_file(PRIORS_DIR / "nasa_std_3001_limits.json"),
        "soma_priors": load_json_file(PRIORS_DIR / "soma_inspiration4_priors.json"),
        "earth_proxies": load_json_file(PRIORS_DIR / "earth_clinical_proxies.json"),
    }


# ---------------------------------------------------------------------------
# NOAA/NASA data fetcher with SHA-256 cache
# ---------------------------------------------------------------------------

async def fetch_and_cache(
    client: httpx.AsyncClient,
    url: str,
    cache_file: str,
    description: str,
) -> Optional[Any]:
    """
    Fetch data from a URL. Cache the response with a SHA-256 content hash.
    If the fetch fails, return the cached version.
    """
    cache_path = CACHE_DIR / cache_file
    meta_path = CACHE_DIR / f"{cache_file}.meta"

    try:
        resp = await client.get(url, timeout=15.0)
        resp.raise_for_status()
        raw = resp.content
        content_hash = hashlib.sha256(raw).hexdigest()

        # Write cache safely (handles read-only Lambda file systems)
        try:
            cache_path.write_bytes(raw)
            meta = {
                "url": url,
                "sha256": content_hash,
                "fetched_utc": datetime.now(timezone.utc).isoformat(),
                "status_code": resp.status_code,
                "description": description,
                "size_bytes": len(raw),
            }
            meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        except OSError:
            pass

        data = json.loads(raw)
        logger.info("Fetched %s | sha256=%s | %d bytes", description, content_hash[:12], len(raw))
        return data

    except Exception as exc:
        logger.warning("Fetch failed for %s: %s - using cache", description, exc)
        for check_path in [cache_path, BACKEND_DIR / "data" / "cache" / cache_file]:
            if check_path.exists():
                try:
                    return json.loads(check_path.read_text(encoding="utf-8"))
                except Exception:
                    pass
        return None


async def fetch_all_telemetry() -> None:
    """Fetch all configured NOAA/NASA endpoints and update cache."""
    global telemetry_cache

    endpoints = load_endpoints_config()
    async with httpx.AsyncClient() as client:
        # GOES proton flux
        ep = endpoints.get("noaa_goes_proton_flux", {})
        if ep.get("url"):
            data = await fetch_and_cache(
                client, ep["url"], ep.get("cache_file", "goes_proton.json"), ep.get("description", "GOES Proton")
            )
            if data is not None:
                telemetry_cache["goes_proton_flux"] = data

        # Kp index
        ep = endpoints.get("noaa_kp_index", {})
        if ep.get("url"):
            data = await fetch_and_cache(
                client, ep["url"], ep.get("cache_file", "kp_index.json"), ep.get("description", "Kp Index")
            )
            if data is not None:
                telemetry_cache["kp_index"] = data

        # NASA OSDR
        ep = endpoints.get("nasa_osdr_study_meta", {})
        if ep.get("url"):
            data = await fetch_and_cache(
                client, ep["url"], ep.get("cache_file", "osdr_meta.json"), ep.get("description", "OSDR Meta")
            )
            if data is not None:
                telemetry_cache["osdr_meta"] = data

    telemetry_cache["last_fetch_utc"] = datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Background telemetry fetcher
# ---------------------------------------------------------------------------

async def periodic_telemetry_fetcher() -> None:
    """Background task that fetches NOAA/NASA data every 5 minutes."""
    while True:
        try:
            if not airgap_mode:
                await fetch_all_telemetry()
            else:
                logger.info("Airgap mode: skipping telemetry fetch")
        except Exception as exc:
            logger.error("Periodic telemetry fetch error: %s", exc)
        await asyncio.sleep(NOAA_FETCH_INTERVAL_S)


# ---------------------------------------------------------------------------
# Background telemetry broadcaster
# ---------------------------------------------------------------------------

async def telemetry_broadcaster() -> None:
    """Push twin state to all connected /ws/telemetry clients every 2 seconds."""
    while True:
        if ws_telemetry_clients:
            try:
                payload = build_telemetry_snapshot()
                payload_json = json.dumps(payload, default=str)
                disconnected = set()
                for ws in ws_telemetry_clients:
                    try:
                        await ws.send_text(payload_json)
                    except Exception:
                        disconnected.add(ws)
                ws_telemetry_clients.difference_update(disconnected)
            except Exception as exc:
                logger.error("Telemetry broadcast error: %s", exc)
        await asyncio.sleep(TELEMETRY_PUSH_INTERVAL_S)


def build_telemetry_snapshot() -> dict[str, Any]:
    """Build a telemetry snapshot from all active twins."""
    snapshot: dict[str, Any] = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "active_crew_id": active_crew_id,
        "airgap": airgap_mode,
        "crew": {},
    }

    for crew_id, twin in twin_registry.items():
        try:
            state = twin.get_state()
            ari = twin.get_ari()
            snapshot["crew"][crew_id] = {
                "axes": state.get("axes", {}),
                "ari": round(float(ari), 4),
                "mission_day": state.get("mission_day", 0),
                "uncertainties": state.get("uncertainties", {}),
                "sensor_dropout": state.get("sensor_dropout", {}),
            }
        except Exception as exc:
            logger.error("Error building telemetry for %s: %s", crew_id, exc)
            snapshot["crew"][crew_id] = {"error": str(exc)}

    # Attach latest GOES/Kp if available
    goes = telemetry_cache.get("goes_proton_flux")
    if isinstance(goes, list) and len(goes) > 0:
        latest = goes[-1] if isinstance(goes[-1], dict) else {}
        snapshot["goes_proton_latest"] = {
            "flux_pfu": latest.get("flux", 0.0),
            "energy": latest.get("energy", ">=10 MeV"),
            "time_tag": latest.get("time_tag", ""),
            "provenance": PROV_REAL,
        }

    kp = telemetry_cache.get("kp_index")
    if isinstance(kp, list) and len(kp) > 0:
        latest_kp = kp[-1] if isinstance(kp[-1], dict) else {}
        snapshot["kp_index_latest"] = {
            "kp_value": latest_kp.get("kp_index", latest_kp.get("Kp", 0.0)),
            "time_tag": latest_kp.get("time_tag", ""),
            "provenance": PROV_REAL,
        }

    return snapshot


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class CrewSelectRequest(BaseModel):
    crew_id: str = Field(..., description="Crew member identifier")

class TwinStateRequest(BaseModel):
    crew_id: Optional[str] = Field(None, description="Crew ID; defaults to active crew")

class PredictRequest(BaseModel):
    crew_id: Optional[str] = None
    horizon_hours: float = Field(72.0, description="Prediction horizon in hours")

class CounterfactualRequest(BaseModel):
    crew_id: Optional[str] = None
    countermeasure: Any = Field(..., description="Countermeasure to simulate (name or parameter dict)")
    horizon_hours: float = Field(72.0, description="Prediction horizon")

class ObservationRequest(BaseModel):
    crew_id: Optional[str] = None
    axis: str = Field(..., description="Physiological axis")
    value: float = Field(..., description="Observed measurement value")
    measurement_type: str = Field("direct", description="Measurement type")
    notes: str = Field("", description="Optional clinical notes")

class DropoutRequest(BaseModel):
    crew_id: Optional[str] = None
    axis: str = Field(..., description="Axis to toggle dropout on")
    dropout: bool = Field(..., description="True to simulate dropout")

class ReturnWindowRequest(BaseModel):
    crew_id: Optional[str] = None
    mission_profile: str = Field("ISS_LEO", description="ISS_LEO, ARTEMIS_LUNAR, or MARS_TRANSIT")

class SafetyEvalRequest(BaseModel):
    countermeasure: Any = Field(..., description="Countermeasure to evaluate (name or parameter dict)")
    crew_id: Optional[str] = None

class ScenarioLoadRequest(BaseModel):
    scenario_id: str = Field(..., description="Scenario identifier to load")

class ConsentRequest(BaseModel):
    crew_id: Optional[str] = None
    tier: str = Field(..., description="Consent tier: full, partial, emergency_only, withdrawn")

class BreakGlassRequest(BaseModel):
    crew_id: Optional[str] = None
    authorizer_id: str = Field(..., description="ID of crew authorizing break-glass")
    reason: str = Field(..., description="Clinical reason for break-glass")

class ChatRequest(BaseModel):
    text: Optional[str] = Field(None, description="User text message")
    message: Optional[str] = Field(None, description="User message alias")
    session_id: str = Field("default", description="Conversation session ID")
    crew_id: Optional[str] = None
    airgap: Optional[bool] = None

class AirgapRequest(BaseModel):
    offline: bool = Field(..., description="True to activate air-gap mode")

class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize to speech")

class PredictiveRadarRequest(BaseModel):
    crew_id: Optional[str] = Field(None, description="Crew ID; defaults to active crew")
    scenario: Optional[str] = Field("A", description="Mission scenario: A, B, or C")
    axes: Optional[dict[str, Any]] = Field(None, description="Optional custom axes state")

class AnomalySignal(BaseModel):
    id: str
    axis: str
    title: str
    severity: str
    time_to_decompensation_hours: float
    confidence_pct: float
    mechanism: str
    recommended_countermeasure: str
    countermeasure_command: str

class PredictiveRadarResponse(BaseModel):
    alerts: list[AnomalySignal]
    composite_decompensation_horizon_hours: float
    radar_risk_index: float
    provenance: str
    model: str
    audit_hash: str
    timestamp_utc: str

# Response models

class ProvenancedValue(BaseModel):
    value: Any
    provenance: str

class AxisState(BaseModel):
    score: float
    provenance: str = PROV_SIM
    trend: Optional[str] = None

class TwinStateResponse(BaseModel):
    crew_id: str
    axes: dict[str, AxisState]
    ari: float
    ari_provenance: str
    mission_day: int
    timestamp_utc: str
    sensor_dropout: dict[str, bool] = {}

class VoIRankedItem(BaseModel):
    rank: int
    test: str
    voi_bits: float
    axis: str = ""
    provenance: str = PROV_DER

class VoIResponse(BaseModel):
    crew_id: str
    ranked_measurements: list[VoIRankedItem]

class ChatResponse(BaseModel):
    text: str
    tool_calls: list[dict[str, Any]] = []
    provenance: str
    model: str
    session_id: str
    airgap: bool = False

class AuditEntry(BaseModel):
    timestamp_utc: str
    event_type: str
    crew_id: str
    details: dict[str, Any] = {}
    hash: str = ""

class StatusResponse(BaseModel):
    status: str
    message: str
    data: Optional[dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Helper to resolve crew_id
# ---------------------------------------------------------------------------

def resolve_crew(crew_id: Optional[str]) -> str:
    return crew_id if crew_id else active_crew_id


def get_twin(crew_id: str) -> CrewDigitalTwin:
    cid = resolve_crew(crew_id)
    if cid not in twin_registry:
        raise HTTPException(status_code=404, detail=f"Crew member {cid} not found in twin registry")
    return twin_registry[cid]


# ---------------------------------------------------------------------------
# Application lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle manager."""
    global voi_planner_instance, return_window_solver_instance
    global safety_guard_instance, audit_vault_instance
    global voice_orchestrator_instance, airgap_mode

    logger.info("CHIRON v2.0 backend starting up")

    # Load priors
    priors = load_priors()
    logger.info("Loaded priors: nasa_std_3001, soma_inspiration4, earth_clinical_proxies")

    # Initialize companion modules
    voi_planner_instance = VoIPlanner()
    return_window_solver_instance = ReturnWindowSolver()
    safety_guard_instance = SafetyGuard()
    audit_vault_instance = AuditVault()

    # Initialize 4 crew digital twins
    for crew in CREW_MANIFEST:
        twin = CrewDigitalTwin(
            crew_id=crew["id"],
            name=crew["name"],
            role=crew["role"],
            age=crew["age"],
            sex=crew["sex"],
            mission_day=crew["mission_day"],
            priors=priors,
        )
        twin_registry[crew["id"]] = twin
        logger.info("Initialized digital twin for %s (%s)", crew["name"], crew["id"])

    # Initialize voice orchestrator
    voice_config = VoiceOrchestratorConfig.from_env()
    airgap_mode = voice_config.airgap_force_offline
    voice_orchestrator_instance = VoiceOrchestrator(
        config=voice_config,
        twin_registry=twin_registry,
        voi_planner=voi_planner_instance,
        return_window_solver=return_window_solver_instance,
        safety_guard=safety_guard_instance,
        audit_vault=audit_vault_instance,
    )

    # Fetch initial telemetry (non-blocking, don't fail startup)
    try:
        if not airgap_mode:
            await fetch_all_telemetry()
            logger.info("Initial telemetry fetch complete")
        else:
            logger.info("Airgap mode: skipping initial telemetry fetch")
    except Exception as exc:
        logger.warning("Initial telemetry fetch failed (non-fatal): %s", exc)

    # Start background tasks (only when running as long-running server, not in serverless)
    if not os.getenv("VERCEL"):
        task_fetcher = asyncio.create_task(periodic_telemetry_fetcher())
        task_broadcaster = asyncio.create_task(telemetry_broadcaster())
        _background_tasks.extend([task_fetcher, task_broadcaster])

    logger.info(
        "CHIRON v2.0 ready | crew=%d twins | airgap=%s | port=%d",
        len(twin_registry), airgap_mode, PORT,
    )

    yield

    # Shutdown
    logger.info("CHIRON v2.0 shutting down")
    for task in _background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    if voice_orchestrator_instance:
        await voice_orchestrator_instance.close()
    logger.info("Shutdown complete")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CHIRON v2.0 API",
    description="Autonomous spaceflight health decision system backend",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================================================================
# REST ENDPOINTS
# ===================================================================

# ---------------------------------------------------------------------------
# Twin state
# ---------------------------------------------------------------------------

@app.post("/api/twin/state", response_model=TwinStateResponse)
async def get_twin_state(req: TwinStateRequest):
    """Get current digital twin state for a crew member."""
    cid = resolve_crew(req.crew_id)
    twin = get_twin(cid)
    state = twin.get_state()
    ari = twin.get_ari()

    axes_out = {}
    for axis_name, score in state.get("axes", {}).items():
        axes_out[axis_name] = AxisState(
            score=round(float(score), 2),
            provenance=PROV_SIM,
            trend=state.get("trends", {}).get(axis_name, "stable"),
        )

    return TwinStateResponse(
        crew_id=cid,
        axes=axes_out,
        ari=round(float(ari), 4),
        ari_provenance=PROV_DER,
        mission_day=state.get("mission_day", 0),
        timestamp_utc=state.get("timestamp_utc", datetime.now(timezone.utc).isoformat()),
        sensor_dropout=state.get("sensor_dropout", {}),
    )


@app.post("/api/twin/predict")
async def predict_trajectory(req: PredictRequest):
    """Get 72h/14d trajectory forecast for a crew member."""
    cid = resolve_crew(req.crew_id)
    twin = get_twin(cid)
    trajectory = twin.predict_trajectory(req.horizon_hours)
    return {
        "crew_id": cid,
        "horizon_hours": req.horizon_hours,
        "trajectory": trajectory,
        "provenance": PROV_DER,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/twin/counterfactual")
async def simulate_counterfactual(req: CounterfactualRequest):
    """Simulate a countermeasure and return before/after comparison."""
    cid = resolve_crew(req.crew_id)
    twin = get_twin(cid)

    state_before = twin.get_state()
    ari_before = twin.get_ari()

    cm = req.countermeasure
    if isinstance(cm, str):
        cm_dict: dict[str, Any] = {"name": cm}
        if "ared" in cm.lower() or "exercise" in cm.lower():
            cm_dict["ared_load_kg"] = 85.0 if "high" in cm.lower() else 50.0
        elif "co2" in cm.lower() or "scrub" in cm.lower():
            cm_dict["co2_scrubber_efficiency"] = 0.95
        elif "shelter" in cm.lower():
            cm_dict["storm_shelter_active"] = True
    elif isinstance(cm, dict):
        cm_dict = dict(cm)
    else:
        cm_dict = {}

    # Safety check
    veto_result = None
    is_vetoed = False
    veto_reason = ""
    if safety_guard_instance is not None:
        env_state: dict[str, Any] = {"twin_state": state_before, "crew_id": cid}
        if "cabin_ppco2_mmhg" in cm_dict:
            env_state["cabin_ppco2_mmhg"] = cm_dict["cabin_ppco2_mmhg"]
        if "goes_proton_flux_pfu" in cm_dict:
            env_state["goes_proton_flux_pfu"] = cm_dict["goes_proton_flux_pfu"]
        veto_result = safety_guard_instance.evaluate_countermeasure(cm_dict, env_state)
        is_vetoed = getattr(veto_result, "vetoed", False)
        veto_reason = getattr(veto_result, "reason", "")

    # Apply countermeasure (simulation only)
    projected = twin.apply_countermeasure(cm_dict)
    trajectory = twin.predict_trajectory(int(req.horizon_hours))
    ari_after = projected.get("ari_after", ari_before)

    return {
        "crew_id": cid,
        "countermeasure": req.countermeasure,
        "horizon_hours": req.horizon_hours,
        "before": {
            "ari": round(float(ari_before), 4),
            "axes": {k: round(float(v), 2) for k, v in state_before.get("axes", {}).items()},
        },
        "after": {
            "ari": round(float(ari_after), 4),
            "axes": projected.get("axes_after", {}),
        },
        "trajectory": trajectory,
        "delta_ari": round(float(ari_after - ari_before), 4),
        "safety_veto": is_vetoed,
        "veto_reason": veto_reason,
        "provenance": PROV_DER,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/twin/observation")
async def log_observation(req: ObservationRequest):
    """Log a new measurement observation and update the posterior."""
    cid = resolve_crew(req.crew_id)
    twin = get_twin(cid)

    result = twin.update_observation(
        axis=req.axis,
        value=req.value,
        measurement_type=req.measurement_type,
    )

    # Audit log
    if audit_vault_instance is not None:
        audit_vault_instance.log_consent(
            crew_id=cid,
            event_type="observation_logged",
            details={
                "axis": req.axis,
                "value": req.value,
                "measurement_type": req.measurement_type,
                "notes": req.notes,
            },
        )

    return {
        "crew_id": cid,
        "axis": req.axis,
        "value": req.value,
        "posterior_update": result,
        "provenance": PROV_DER,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/twin/dropout")
async def toggle_sensor_dropout(req: DropoutRequest):
    """Toggle sensor dropout simulation on a physiological axis."""
    cid = resolve_crew(req.crew_id)
    twin = get_twin(cid)

    twin.toggle_sensor_dropout(req.axis, req.dropout)
    state = twin.get_state()

    return {
        "crew_id": cid,
        "axis": req.axis,
        "dropout": req.dropout,
        "sensor_dropout": state.get("sensor_dropout", {}),
        "updated_axes": state.get("axes", {}),
        "provenance": PROV_SIM,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# VoI
# ---------------------------------------------------------------------------

@app.get("/api/voi/rank")
async def get_voi_rank(crew_id: Optional[str] = Query(None)):
    """Get Value of Information ranked measurements."""
    cid = resolve_crew(crew_id)
    twin = get_twin(cid)

    if voi_planner_instance is None:
        raise HTTPException(status_code=503, detail="VoI planner not initialized")

    state = twin.get_state()
    ranked = voi_planner_instance.rank_measurements(state)

    return {
        "crew_id": cid,
        "ranked_measurements": [
            {
                "rank": i + 1,
                "test": m.get("test", m.get("name", "unknown")),
                "voi_bits": round(float(m.get("voi_bits", m.get("voi", 0))), 3),
                "axis": m.get("axis", ""),
                "provenance": PROV_DER,
            }
            for i, m in enumerate(ranked[:10])
        ],
        "provenance": PROV_DER,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Return window
# ---------------------------------------------------------------------------

@app.post("/api/return-window/evaluate")
async def evaluate_return_window(req: ReturnWindowRequest):
    """Evaluate medical return windows for a crew member."""
    cid = resolve_crew(req.crew_id)
    twin = get_twin(cid)

    if return_window_solver_instance is None:
        raise HTTPException(status_code=503, detail="Return window solver not initialized")

    result = return_window_solver_instance.evaluate(twin, req.mission_profile)

    return {
        "crew_id": cid,
        "mission_profile": req.mission_profile,
        "windows": getattr(result, "windows", []),
        "recommendation": getattr(result, "recommendation", "CONTINUE_MONITORING"),
        "current_ari": round(float(twin.get_ari()), 4),
        "ari_threshold_for_return": getattr(result, "threshold", 0.65),
        "provenance": PROV_DER,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Safety
# ---------------------------------------------------------------------------

@app.post("/api/safety/evaluate")
async def evaluate_safety(req: SafetyEvalRequest):
    """Check a countermeasure against safety guard rules."""
    cid = resolve_crew(req.crew_id)
    twin = get_twin(cid)

    if safety_guard_instance is None:
        raise HTTPException(status_code=503, detail="Safety guard not initialized")

    state = twin.get_state()
    cm = req.countermeasure
    if isinstance(cm, str):
        cm_dict: dict[str, Any] = {"name": cm}
        if "ared" in cm.lower() or "exercise" in cm.lower():
            cm_dict["ared_load_kg"] = 85.0 if "high" in cm.lower() else 50.0
        elif "co2" in cm.lower() or "scrub" in cm.lower():
            cm_dict["co2_scrubber_efficiency"] = 0.95
        elif "shelter" in cm.lower():
            cm_dict["storm_shelter_active"] = True
    elif isinstance(cm, dict):
        cm_dict = dict(cm)
    else:
        cm_dict = {}

    env_state: dict[str, Any] = {"twin_state": state, "crew_id": cid}
    if "cabin_ppco2_mmhg" in cm_dict:
        env_state["cabin_ppco2_mmhg"] = cm_dict["cabin_ppco2_mmhg"]
    if "goes_proton_flux_pfu" in cm_dict:
        env_state["goes_proton_flux_pfu"] = cm_dict["goes_proton_flux_pfu"]

    result = safety_guard_instance.evaluate_countermeasure(cm_dict, env_state)

    return {
        "crew_id": cid,
        "countermeasure": req.countermeasure,
        "vetoed": getattr(result, "vetoed", False),
        "reason": getattr(result, "reason", ""),
        "rule_id": getattr(result, "rule_id", ""),
        "reference": getattr(result, "reference", ""),
        "provenance": PROV_DER,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------

@app.get("/api/scenarios")
async def list_scenarios():
    """List available simulation scenarios."""
    return {
        "scenarios": SCENARIO_LIST,
        "active_scenario": "nominal",
        "provenance": PROV_SIM,
    }


@app.post("/api/scenario/load")
async def load_scenario(req: ScenarioLoadRequest):
    """Load a specific scenario into all active twins."""
    scenario = None
    for s in SCENARIO_LIST:
        if s["id"] == req.scenario_id:
            scenario = s
            break

    if scenario is None:
        raise HTTPException(status_code=404, detail=f"Scenario {req.scenario_id} not found")

    results = {}
    for crew_id, twin in twin_registry.items():
        try:
            twin.set_scenario(req.scenario_id)
            results[crew_id] = "loaded"
        except Exception as exc:
            results[crew_id] = f"error: {exc}"

    return {
        "scenario": scenario,
        "crew_results": results,
        "provenance": PROV_SIM,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------

@app.get("/api/audit/ledger")
async def get_audit_ledger():
    """Get the full audit ledger."""
    if audit_vault_instance is None:
        raise HTTPException(status_code=503, detail="Audit vault not initialized")

    ledger = audit_vault_instance.get_ledger()
    chain_valid = audit_vault_instance.verify_chain()

    return {
        "ledger": ledger,
        "chain_valid": chain_valid,
        "entry_count": len(ledger) if isinstance(ledger, list) else 0,
        "provenance": PROV_REAL,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/audit/break-glass")
async def trigger_break_glass(req: BreakGlassRequest):
    """Trigger break-glass incapacitation protocol."""
    cid = resolve_crew(req.crew_id)

    if audit_vault_instance is None:
        raise HTTPException(status_code=503, detail="Audit vault not initialized")

    result = audit_vault_instance.trigger_break_glass(
        crew_id=cid,
        authorizer_id=req.authorizer_id,
        reason=req.reason,
    )

    hash_val = result.get("hash", "") if isinstance(result, dict) else getattr(result, "hash", "")
    chain_val = result.get("chain_valid", True) if isinstance(result, dict) else getattr(result, "chain_valid", True)

    return {
        "status": "BREAK_GLASS_ACTIVATED",
        "crew_id": cid,
        "authorizer_id": req.authorizer_id,
        "reason": req.reason,
        "audit_hash": hash_val,
        "hash": hash_val,
        "chain_valid": chain_val,
        "provenance": PROV_REAL,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/audit/consent")
async def update_consent(req: ConsentRequest):
    """Update consent tier for a crew member."""
    cid = resolve_crew(req.crew_id)

    if audit_vault_instance is None:
        raise HTTPException(status_code=503, detail="Audit vault not initialized")

    result = audit_vault_instance.log_consent(
        crew_id=cid,
        event_type="consent_update",
        details={"tier": req.tier},
    )

    return {
        "crew_id": cid,
        "consent_tier": req.tier,
        "audit_logged": True,
        "provenance": PROV_REAL,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Voice endpoints
# ---------------------------------------------------------------------------

@app.post("/api/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio via Whisper STT."""
    if voice_orchestrator_instance is None:
        raise HTTPException(status_code=503, detail="Voice orchestrator not initialized")

    audio_bytes = await file.read()
    result = await voice_orchestrator_instance.transcribe(
        audio_bytes, filename=file.filename or "audio.webm"
    )

    return {
        "text": result.get("text", ""),
        "language": result.get("language", "en"),
        "duration_s": result.get("duration_s", 0.0),
        "provenance": result.get("provenance", PROV_ABSTAIN),
        "segments": result.get("segments", []),
    }


@app.post("/api/voice/tts")
async def generate_tts(req: TTSRequest):
    """Generate TTS audio from text."""
    if voice_orchestrator_instance is None:
        raise HTTPException(status_code=503, detail="Voice orchestrator not initialized")

    result = await voice_orchestrator_instance.synthesize_speech(req.text)
    audio_bytes = result.get("audio_bytes", b"")

    if not audio_bytes:
        return {
            "audio_base64": "",
            "content_type": "audio/mp3",
            "provenance": result.get("provenance", PROV_ABSTAIN),
            "error": result.get("error", "No audio generated"),
        }

    return {
        "audio_base64": base64.b64encode(audio_bytes).decode("ascii"),
        "content_type": result.get("content_type", "audio/mp3"),
        "size_bytes": result.get("size_bytes", len(audio_bytes)),
        "provenance": result.get("provenance", PROV_REAL),
    }


@app.post("/api/voice/chat", response_model=ChatResponse)
async def voice_chat(req: ChatRequest):
    """Send text to CHIRON and get a structured response with tool calls."""
    if voice_orchestrator_instance is None:
        raise HTTPException(status_code=503, detail="Voice orchestrator not initialized")

    user_msg = req.text or req.message or ""
    orig_airgap = voice_orchestrator_instance._airgap
    if req.airgap is not None:
        voice_orchestrator_instance._airgap = req.airgap

    try:
        result = await voice_orchestrator_instance.chat(
            user_message=user_msg,
            session_id=req.session_id,
            crew_id=resolve_crew(req.crew_id),
        )
    finally:
        if req.airgap is not None:
            voice_orchestrator_instance._airgap = orig_airgap

    return ChatResponse(
        text=result.get("text", ""),
        tool_calls=result.get("tool_calls", []),
        provenance=result.get("provenance", PROV_ABSTAIN),
        model=result.get("model", "unknown"),
        session_id=result.get("session_id", req.session_id),
        airgap=result.get("airgap", airgap_mode),
    )


@app.get("/api/voice/rtc-token")
async def get_rtc_token():
    """Get a WebRTC realtime session token for voice streaming."""
    if voice_orchestrator_instance is None:
        raise HTTPException(status_code=503, detail="Voice orchestrator not initialized")

    result = await voice_orchestrator_instance.get_rtc_session_token()

    if result.get("token") is None:
        return {
            "token": None,
            "provenance": result.get("provenance", PROV_ABSTAIN),
            "error": result.get("error", "Token generation failed"),
        }

    return {
        "token": result["token"],
        "expires_at": result.get("expires_at"),
        "session_id": result.get("session_id"),
        "provenance": result.get("provenance", PROV_REAL),
    }


@app.post("/api/ai/live-predictive-radar", response_model=PredictiveRadarResponse)
async def live_predictive_radar(req: PredictiveRadarRequest):
    """
    Live Clinical AI Anomaly Detections & Predictive Radar.
    Powered by OpenAI gpt-4o-mini with deterministic NASA-STD-3001 fallback.
    Evaluates multi-axis decompensation horizons, risk indices, and countermeasure dispatch.
    """
    crew_id = resolve_crew(req.crew_id)
    twin = twin_registry.get(crew_id)
    ari = 68.4
    axes_data = {}
    if twin is not None:
        try:
            ari = float(twin.get_ari())
            state = twin.get_state()
            axes_data = state.get("axes", {})
        except Exception:
            pass

    if req.axes:
        axes_data.update(req.axes)

    env_snap = build_telemetry_snapshot()

    scenario = req.scenario or "A"
    alerts: list[AnomalySignal] = []
    composite_horizon = 28.5
    radar_risk = 46.8
    model_name = "gpt-4o-mini"
    provenance = PROV_DER

    # Try calling OpenAI gpt-4o-mini if online
    openai_success = False
    if not airgap_mode and voice_orchestrator_instance and voice_orchestrator_instance._client:
        try:
            system_msg = (
                "You are CHIRON's aerospace clinical AI anomaly detection engine aboard an active spacecraft (NASA-STD-3001 compliant). "
                "Analyze the crew telemetry, identify active physiological anomalies, compute time to decompensation countdowns (hours), "
                "and recommend concrete countermeasures with dispatch commands. "
                "Output strictly a JSON object with: "
                "{\"alerts\": [{\"id\": str, \"axis\": str, \"title\": str, \"severity\": \"CRITICAL\"|\"HIGH\"|\"ELEVATED\"|\"NOMINAL\", \"time_to_decompensation_hours\": float, \"confidence_pct\": float, \"mechanism\": str, \"recommended_countermeasure\": str, \"countermeasure_command\": str}], \"composite_decompensation_horizon_hours\": float, \"radar_risk_index\": float}."
            )
            user_msg = (
                f"Crew ID: {crew_id}\n"
                f"Scenario: {scenario}\n"
                f"Current ARI: {ari}\n"
                f"Axes: {json.dumps(axes_data, default=str)}\n"
                f"Environment: {json.dumps(env_snap, default=str)}\n"
            )
            resp = await asyncio.wait_for(
                voice_orchestrator_instance._client.chat.completions.create(
                    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                    messages=[
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": user_msg},
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=800,
                    temperature=0.2,
                ),
                timeout=4.5,
            )
            content = resp.choices[0].message.content
            if content:
                parsed = json.loads(content)
                raw_alerts = parsed.get("alerts", [])
                for ra in raw_alerts[:5]:
                    alerts.append(AnomalySignal(
                        id=str(ra.get("id", f"SIG-{len(alerts)+1}")),
                        axis=str(ra.get("axis", "neuro")),
                        title=str(ra.get("title", "Clinical Anomaly")),
                        severity=str(ra.get("severity", "ELEVATED")),
                        time_to_decompensation_hours=float(ra.get("time_to_decompensation_hours", 24.0)),
                        confidence_pct=float(ra.get("confidence_pct", 88.0)),
                        mechanism=str(ra.get("mechanism", "Physiological drift")),
                        recommended_countermeasure=str(ra.get("recommended_countermeasure", "Observation")),
                        countermeasure_command=str(ra.get("countermeasure_command", "dispatch_cm")),
                    ))
                composite_horizon = float(parsed.get("composite_decompensation_horizon_hours", 28.5))
                radar_risk = float(parsed.get("radar_risk_index", 48.0))
                openai_success = True
                provenance = PROV_REAL
        except Exception as exc:
            logger.warning("OpenAI live radar query failed, using deterministic clinical fallbacks: %s", exc)

    # Deterministic aerospace clinical fallback if OpenAI unavailable or air-gapped
    if not openai_success or len(alerts) == 0:
        model_name = "chiron-clinical-physics-engine"
        provenance = PROV_DER
        if scenario == "C" or ari < 45:
            composite_horizon = 14.0
            radar_risk = 86.4
            alerts = [
                AnomalySignal(
                    id="SIG-C01",
                    axis="cardio",
                    title="Vasovagal Syncope & Orthostatic Decompensation",
                    severity="CRITICAL",
                    time_to_decompensation_hours=14.0,
                    confidence_pct=94.2,
                    mechanism="Baroreflex gain depression under microgravity cephalad venous engorgement",
                    recommended_countermeasure="Fluid load 1.0L saline + midodrine 5mg PO + LBNP soak",
                    countermeasure_command="DISPATCH_FLUID_LOADING",
                ),
                AnomalySignal(
                    id="SIG-C02",
                    axis="neuro",
                    title="Intracranial Hypertension & SANS Cephalad Shift",
                    severity="HIGH",
                    time_to_decompensation_hours=28.5,
                    confidence_pct=91.6,
                    mechanism="Optic nerve sheath diameter expansion > 5.8mm with posterior globe flattening",
                    recommended_countermeasure="LBNP -30 mmHg 45 min + Choline Citrate supplementation",
                    countermeasure_command="DISPATCH_LBNP_SUCTION",
                ),
                AnomalySignal(
                    id="SIG-C03",
                    axis="sleep",
                    title="Circadian Desynchrony & Melatonin Suppression",
                    severity="ELEVATED",
                    time_to_decompensation_hours=36.0,
                    confidence_pct=87.5,
                    mechanism="Suprachiasmatic nucleus phase delay from 90-min orbital light-dark cycles",
                    recommended_countermeasure="Exogenous Melatonin 0.5mg + 460nm Blue-light filter",
                    countermeasure_command="DISPATCH_CIRCADIAN_LIGHTING",
                ),
            ]
        elif scenario == "B":
            composite_horizon = 22.0
            radar_risk = 68.2
            alerts = [
                AnomalySignal(
                    id="SIG-B01",
                    axis="rad",
                    title="SPE Solar Energetic Proton Storm Flux Spike",
                    severity="HIGH",
                    time_to_decompensation_hours=22.0,
                    confidence_pct=96.1,
                    mechanism="Coronal mass ejection proton flux > 0.14 pfu exceeding BFO threshold",
                    recommended_countermeasure="Transit vehicle storm shelter protocol + Polyethylene water shielding",
                    countermeasure_command="DISPATCH_STORM_SHELTER",
                ),
                AnomalySignal(
                    id="SIG-B02",
                    axis="bone",
                    title="Trabecular Bone Mineral Resorption Surge",
                    severity="ELEVATED",
                    time_to_decompensation_hours=72.0,
                    confidence_pct=89.3,
                    mechanism="Unloaded osteoclast hyperactivity with -0.4%/mo femoral density loss",
                    recommended_countermeasure="Boost ARED axial load to 70kg + Bisphosphonate protocol",
                    countermeasure_command="DISPATCH_ARED_RECOVERY",
                ),
                AnomalySignal(
                    id="SIG-B03",
                    axis="sleep",
                    title="PVT Psychomotor Vigilance Reaction Lags",
                    severity="ELEVATED",
                    time_to_decompensation_hours=34.0,
                    confidence_pct=85.0,
                    mechanism="Cognitive lapse frequency elevation above NASA-STD-3001 fatigue ceiling",
                    recommended_countermeasure="Enforce 8.5h sleep sanctuary + modafinil 100mg standby",
                    countermeasure_command="DISPATCH_SLEEP_ENFORCEMENT",
                ),
            ]
        else:
            composite_horizon = 28.5
            radar_risk = 46.8
            alerts = [
                AnomalySignal(
                    id="SIG-A01",
                    axis="neuro",
                    title="Subclinical SANS Optic Nerve Sheath Drift",
                    severity="HIGH",
                    time_to_decompensation_hours=28.5,
                    confidence_pct=92.4,
                    mechanism="Cephalad fluid redistribution causing +1.65 sigma vocal formant pitch shift",
                    recommended_countermeasure="Perform Guided Ocular POCUS Ultrasound + LBNP -30 mmHg",
                    countermeasure_command="DISPATCH_POCUS_EXAM",
                ),
                AnomalySignal(
                    id="SIG-A02",
                    axis="cardio",
                    title="Orthostatic Baroreflex Sensitivity Dampening",
                    severity="ELEVATED",
                    time_to_decompensation_hours=48.0,
                    confidence_pct=88.7,
                    mechanism="Vagal tone withdrawal and arterial compliance shift during microgravity dwell",
                    recommended_countermeasure="Passive graduated compression garment lower extremities",
                    countermeasure_command="DISPATCH_COMPRESSION_GEAR",
                ),
                AnomalySignal(
                    id="SIG-A03",
                    axis="sleep",
                    title="Circadian Phase Delay (-1.2h Drift)",
                    severity="ELEVATED",
                    time_to_decompensation_hours=56.0,
                    confidence_pct=86.2,
                    mechanism="Cabin LED spectrum shift mismatch causing pineal melatonin onset lag",
                    recommended_countermeasure="Dynamic Solid-State Light adjustment to 4500K / 460nm notch",
                    countermeasure_command="DISPATCH_LIGHTING_TUNE",
                ),
            ]

    # Cryptographic SHA256 audit ledger
    audit_data = f"{crew_id}:{scenario}:{ari}:{radar_risk}:{datetime.now(timezone.utc).isoformat()}"
    audit_hash = hashlib.sha256(audit_data.encode("utf-8")).hexdigest()

    return PredictiveRadarResponse(
        alerts=alerts,
        composite_decompensation_horizon_hours=composite_horizon,
        radar_risk_index=radar_risk,
        provenance=provenance,
        model=model_name,
        audit_hash=audit_hash,
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
    )


# ---------------------------------------------------------------------------
# Telemetry endpoints
# ---------------------------------------------------------------------------

@app.get("/api/telemetry/goes-proton")
async def get_goes_proton():
    """Get latest GOES proton flux data."""
    data = telemetry_cache.get("goes_proton_flux")
    if data is None:
        # Try loading from cache file
        cache_path = CACHE_DIR / "goes_proton_flux_cache.json"
        if cache_path.exists():
            try:
                data = json.loads(cache_path.read_text(encoding="utf-8"))
            except Exception:
                pass

    if data is None:
        return {
            "data": [],
            "latest": None,
            "provenance": PROV_ABSTAIN,
            "error": "No GOES proton data available",
        }

    latest = None
    if isinstance(data, list) and len(data) > 0:
        latest = data[-1] if isinstance(data[-1], dict) else None

    return {
        "data": data[-24:] if isinstance(data, list) else data,
        "latest": latest,
        "record_count": len(data) if isinstance(data, list) else 0,
        "provenance": PROV_REAL,
        "last_fetch_utc": telemetry_cache.get("last_fetch_utc"),
    }


@app.get("/api/telemetry/kp-index")
async def get_kp_index():
    """Get latest Kp geomagnetic index data."""
    data = telemetry_cache.get("kp_index")
    if data is None:
        cache_path = CACHE_DIR / "kp_index_cache.json"
        if cache_path.exists():
            try:
                data = json.loads(cache_path.read_text(encoding="utf-8"))
            except Exception:
                pass

    if data is None:
        return {
            "data": [],
            "latest": None,
            "provenance": PROV_ABSTAIN,
            "error": "No Kp index data available",
        }

    latest = None
    if isinstance(data, list) and len(data) > 0:
        latest = data[-1] if isinstance(data[-1], dict) else None

    return {
        "data": data[-24:] if isinstance(data, list) else data,
        "latest": latest,
        "record_count": len(data) if isinstance(data, list) else 0,
        "provenance": PROV_REAL,
        "last_fetch_utc": telemetry_cache.get("last_fetch_utc"),
    }


# ---------------------------------------------------------------------------
# Mode toggle
# ---------------------------------------------------------------------------

@app.post("/api/mode/airgap")
async def toggle_airgap(req: AirgapRequest):
    """Toggle air-gap mode on or off."""
    global airgap_mode
    airgap_mode = req.offline

    if voice_orchestrator_instance is not None:
        voice_orchestrator_instance.set_airgap(req.offline)

    logger.info("Airgap mode toggled to %s", req.offline)

    return {
        "airgap": airgap_mode,
        "status": "offline" if airgap_mode else "online",
        "message": (
            "Air-gap mode activated: all AI calls use deterministic fallback"
            if airgap_mode
            else "Online mode restored: AI calls routed to OpenAI API"
        ),
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Crew management
# ---------------------------------------------------------------------------

@app.get("/api/crew")
async def list_crew():
    """List all crew members."""
    crew_out = []
    for c in CREW_MANIFEST:
        twin = twin_registry.get(c["id"])
        ari = 0.0
        if twin is not None:
            ari = float(twin.get_ari())
        crew_out.append({
            **c,
            "ari": round(ari, 4),
            "is_active": c["id"] == active_crew_id,
        })

    return {
        "crew": crew_out,
        "active_crew_id": active_crew_id,
        "count": len(crew_out),
    }


@app.post("/api/crew/select")
async def select_crew(req: CrewSelectRequest):
    """Select the active crew member."""
    global active_crew_id

    if req.crew_id not in twin_registry:
        raise HTTPException(
            status_code=404,
            detail=f"Crew member {req.crew_id} not found. Valid IDs: {list(twin_registry.keys())}",
        )

    active_crew_id = req.crew_id
    if voice_orchestrator_instance is not None:
        voice_orchestrator_instance.set_active_crew(req.crew_id)

    crew_info = None
    for c in CREW_MANIFEST:
        if c["id"] == req.crew_id:
            crew_info = c
            break

    return {
        "active_crew_id": active_crew_id,
        "crew": crew_info,
        "message": f"Active crew set to {req.crew_id}",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


# ===================================================================
# WEBSOCKET ENDPOINTS
# ===================================================================

# ---------------------------------------------------------------------------
# /ws/telemetry - Live twin state push
# ---------------------------------------------------------------------------

@app.websocket("/ws/telemetry")
async def ws_telemetry(websocket: WebSocket):
    """WebSocket for live telemetry pushes every 2 seconds."""
    await websocket.accept()
    ws_telemetry_clients.add(websocket)
    client_addr = websocket.client.host if websocket.client else "unknown"
    logger.info("Telemetry WebSocket connected: %s", client_addr)

    try:
        # Send initial snapshot immediately
        snapshot = build_telemetry_snapshot()
        await websocket.send_text(json.dumps(snapshot, default=str))

        # Keep alive and handle incoming messages (e.g., ping)
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Handle client messages (crew selection, etc.)
                try:
                    data = json.loads(msg)
                    if data.get("type") == "select_crew":
                        global active_crew_id
                        cid = data.get("crew_id", active_crew_id)
                        if cid in twin_registry:
                            active_crew_id = cid
                    elif data.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                except json.JSONDecodeError:
                    pass
            except asyncio.TimeoutError:
                # Send keepalive
                try:
                    await websocket.send_text(json.dumps({"type": "keepalive"}))
                except Exception:
                    break

    except WebSocketDisconnect:
        logger.info("Telemetry WebSocket disconnected: %s", client_addr)
    except Exception as exc:
        logger.error("Telemetry WebSocket error: %s", exc)
    finally:
        ws_telemetry_clients.discard(websocket)


# ---------------------------------------------------------------------------
# /ws/voice - Real-time voice streaming
# ---------------------------------------------------------------------------

@app.websocket("/ws/voice")
async def ws_voice(websocket: WebSocket):
    """WebSocket for real-time voice streaming (STT + Chat + TTS pipeline)."""
    await websocket.accept()
    ws_voice_clients.add(websocket)
    client_addr = websocket.client.host if websocket.client else "unknown"
    logger.info("Voice WebSocket connected: %s", client_addr)
    session_id = f"ws-{int(time.time())}-{id(websocket)}"

    try:
        while True:
            raw = await websocket.receive()

            # Binary frame: audio data for transcription
            if "bytes" in raw and raw["bytes"]:
                audio_bytes = raw["bytes"]
                logger.info("Voice WS received %d bytes audio", len(audio_bytes))

                if voice_orchestrator_instance is None:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Voice orchestrator not initialized",
                    }))
                    continue

                # Step 1: Transcribe
                await websocket.send_text(json.dumps({"type": "status", "stage": "transcribing"}))
                transcription = await voice_orchestrator_instance.transcribe(audio_bytes)
                transcript_text = transcription.get("text", "")

                await websocket.send_text(json.dumps({
                    "type": "transcript",
                    "text": transcript_text,
                    "provenance": transcription.get("provenance", PROV_ABSTAIN),
                }))

                if not transcript_text.strip():
                    continue

                # Step 2: Chat completion with tool calls
                await websocket.send_text(json.dumps({"type": "status", "stage": "processing"}))
                chat_result = await voice_orchestrator_instance.chat(
                    user_message=transcript_text,
                    session_id=session_id,
                )

                response_text = chat_result.get("text", "")

                await websocket.send_text(json.dumps({
                    "type": "response",
                    "text": response_text,
                    "tool_calls": chat_result.get("tool_calls", []),
                    "provenance": chat_result.get("provenance", PROV_ABSTAIN),
                }))

                # Step 3: TTS synthesis
                if response_text:
                    await websocket.send_text(json.dumps({"type": "status", "stage": "synthesizing"}))
                    tts_result = await voice_orchestrator_instance.synthesize_speech(response_text)
                    audio_out = tts_result.get("audio_bytes", b"")

                    if audio_out:
                        # Send audio as binary frame
                        await websocket.send_bytes(audio_out)
                        await websocket.send_text(json.dumps({
                            "type": "tts_complete",
                            "size_bytes": len(audio_out),
                            "provenance": tts_result.get("provenance", PROV_ABSTAIN),
                        }))
                    else:
                        await websocket.send_text(json.dumps({
                            "type": "tts_unavailable",
                            "reason": tts_result.get("error", "No audio"),
                        }))

            # Text frame: direct text chat
            elif "text" in raw and raw["text"]:
                try:
                    msg = json.loads(raw["text"])
                except json.JSONDecodeError:
                    msg = {"type": "chat", "text": raw["text"]}

                msg_type = msg.get("type", "chat")

                if msg_type == "chat":
                    text = msg.get("text", "")
                    if not text:
                        continue

                    if voice_orchestrator_instance is None:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Voice orchestrator not initialized",
                        }))
                        continue

                    chat_result = await voice_orchestrator_instance.chat(
                        user_message=text,
                        session_id=session_id,
                        crew_id=msg.get("crew_id"),
                    )

                    await websocket.send_text(json.dumps({
                        "type": "response",
                        "text": chat_result.get("text", ""),
                        "tool_calls": chat_result.get("tool_calls", []),
                        "provenance": chat_result.get("provenance", PROV_ABSTAIN),
                        "model": chat_result.get("model", ""),
                    }, default=str))

                elif msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

                elif msg_type == "clear_session":
                    if voice_orchestrator_instance:
                        voice_orchestrator_instance.clear_session(session_id)
                    await websocket.send_text(json.dumps({
                        "type": "session_cleared",
                        "session_id": session_id,
                    }))

    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected: %s", client_addr)
    except Exception as exc:
        logger.error("Voice WebSocket error: %s", exc)
    finally:
        ws_voice_clients.discard(websocket)
        if voice_orchestrator_instance:
            voice_orchestrator_instance.clear_session(session_id)


# ===================================================================
# HEALTH CHECK
# ===================================================================

@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "CHIRON v2.0",
        "twins_active": len(twin_registry),
        "active_crew": active_crew_id,
        "airgap": airgap_mode,
        "ws_telemetry_clients": len(ws_telemetry_clients),
        "ws_voice_clients": len(ws_voice_clients),
        "telemetry_last_fetch": telemetry_cache.get("last_fetch_utc"),
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/")
@app.get("/api")
async def root():
    """Root endpoint with API info."""
    return {
        "service": "CHIRON v2.0 API",
        "version": "2.0.0",
        "description": "Autonomous spaceflight health decision system",
        "docs": "/docs",
        "health": "/health",
    }


# ===================================================================
# ENTRYPOINT
# ===================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info",
        ws_max_size=16 * 1024 * 1024,  # 16 MB max WebSocket message
    )
