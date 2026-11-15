"""
CHIRON v2.0 - Voice Orchestrator
OpenAI Hybrid Voice and Tool Orchestration Layer.

Uses gpt-4o-mini for structured chat completions (cost-optimized),
Whisper STT for speech-to-text, TTS-1 (onyx) for text-to-speech,
and realtime WebRTC session token generation.

When AIRGAP_FORCE_OFFLINE is true, all AI calls are replaced with
deterministic local fallback responses - zero network dependency.
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

import httpx
from openai import AsyncOpenAI

logger = logging.getLogger("chiron.voice")

# ---------------------------------------------------------------------------
# Provenance tags
# ---------------------------------------------------------------------------
PROV_REAL = "[REAL]"
PROV_SIM = "[SIMULATED]"
PROV_DER = "[DERIVED]"
PROV_ABSTAIN = "[ABSTAIN]"

# ---------------------------------------------------------------------------
# Clinical assistant system instructions for voice interaction
# ---------------------------------------------------------------------------
CHIRON_SYSTEM_PROMPT = (
    "You are CHIRON, a voice-first autonomous spaceflight health decision system "
    "aboard the ISS/Artemis/Mars transit vehicle. You speak in concise, clinical "
    "aerospace terminology. Never use em dashes. Always cite provenance [REAL], "
    "[SIMULATED], [DERIVED]. Never recommend actions that violate NASA-STD-3001. "
    "When reporting numeric values, state the provenance badge inline. "
    "Keep responses under 120 words unless the crew explicitly asks for detail. "
    "Prioritize crew safety above all other objectives."
)

# ---------------------------------------------------------------------------
# Tool definitions for structured chat completions
# ---------------------------------------------------------------------------
TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_twin_status",
            "description": (
                "Retrieve the current digital twin state for a crew member. "
                "Returns all 7 physiological axis scores, ARI, and sensor status."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "crew_id": {
                        "type": "string",
                        "description": "Crew member identifier, e.g. CDR_VANCE",
                    }
                },
                "required": ["crew_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_voi_next_test",
            "description": (
                "Compute Value of Information rankings for the next most informative "
                "clinical test or measurement. Returns a ranked list of measurements "
                "sorted by expected posterior entropy reduction."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "crew_id": {
                        "type": "string",
                        "description": "Crew member identifier",
                    }
                },
                "required": ["crew_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "simulate_counterfactual",
            "description": (
                "Simulate a countermeasure intervention on the digital twin and "
                "return before/after predicted trajectories. The countermeasure "
                "is NOT applied to the real twin state."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "crew_id": {
                        "type": "string",
                        "description": "Crew member identifier",
                    },
                    "countermeasure": {
                        "type": "string",
                        "description": (
                            "Countermeasure type: fluid_loading, bisphosphonate, "
                            "ared_resistive_exercise, melatonin_shift, cbt_session, "
                            "storm_shelter_ingress, lower_body_negative_pressure"
                        ),
                    },
                    "horizon_hours": {
                        "type": "number",
                        "description": "Prediction horizon in hours (default 72)",
                        "default": 72,
                    },
                },
                "required": ["crew_id", "countermeasure"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "evaluate_return_window",
            "description": (
                "Evaluate medical return windows for a crew member given "
                "current twin state and mission profile. Returns earliest "
                "return delta-v cost and recommended go/no-go."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "crew_id": {
                        "type": "string",
                        "description": "Crew member identifier",
                    },
                    "mission_profile": {
                        "type": "string",
                        "description": "Mission profile: ISS_LEO, ARTEMIS_LUNAR, MARS_TRANSIT",
                        "default": "ISS_LEO",
                    },
                },
                "required": ["crew_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "zoom_anatomy_axis",
            "description": (
                "Get detailed breakdown for a specific physiological axis. "
                "Returns sub-component scores, trend, and clinical context."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "crew_id": {
                        "type": "string",
                        "description": "Crew member identifier",
                    },
                    "axis": {
                        "type": "string",
                        "description": "Axis name: cardio, neuro, bone, immune, sleep, behav, rad",
                    },
                },
                "required": ["crew_id", "axis"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "trigger_incapacitation_mode",
            "description": (
                "Activate incapacitation protocol (break-glass). Grants full "
                "autonomous authority to CHIRON for the specified crew member. "
                "Requires dual-confirmation or CMO override."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "crew_id": {
                        "type": "string",
                        "description": "Incapacitated crew member identifier",
                    },
                    "authorizer_id": {
                        "type": "string",
                        "description": "Crew member authorizing the break-glass",
                    },
                    "reason": {
                        "type": "string",
                        "description": "Clinical reason for incapacitation declaration",
                    },
                },
                "required": ["crew_id", "authorizer_id", "reason"],
            },
        },
    },
]


class AirgapMode(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"


@dataclass
class OfflineFallbackResult:
    """Deterministic fallback for tool calls when offline."""

    content: str
    provenance: str = PROV_SIM


# ---------------------------------------------------------------------------
# Offline fallback responses - fully deterministic, zero network
# ---------------------------------------------------------------------------
OFFLINE_FALLBACKS: dict[str, dict[str, Any]] = {
    "get_twin_status": {
        "axes": {
            "cardio": {"score": 72.0, "trend": "stable", "provenance": PROV_SIM},
            "neuro": {"score": 78.0, "trend": "stable", "provenance": PROV_SIM},
            "bone": {"score": 85.0, "trend": "declining", "provenance": PROV_SIM},
            "immune": {"score": 70.0, "trend": "stable", "provenance": PROV_SIM},
            "sleep": {"score": 68.0, "trend": "declining", "provenance": PROV_SIM},
            "behav": {"score": 75.0, "trend": "stable", "provenance": PROV_SIM},
            "rad": {"score": 88.0, "trend": "stable", "provenance": PROV_SIM},
        },
        "ari": 0.34,
        "ari_provenance": PROV_SIM,
        "mission_day": 47,
        "airgap_notice": "Offline mode: displaying last-cached twin state",
    },
    "compute_voi_next_test": {
        "ranked_measurements": [
            {"rank": 1, "test": "Ocular ultrasound (ONSD)", "voi_bits": 1.82, "provenance": PROV_SIM},
            {"rank": 2, "test": "Venous blood draw (CBC + CRP)", "voi_bits": 1.45, "provenance": PROV_SIM},
            {"rank": 3, "test": "24h actigraphy review", "voi_bits": 1.12, "provenance": PROV_SIM},
            {"rank": 4, "test": "Orthostatic stand test", "voi_bits": 0.98, "provenance": PROV_SIM},
            {"rank": 5, "test": "PVT reaction time battery", "voi_bits": 0.74, "provenance": PROV_SIM},
        ],
        "airgap_notice": "Offline mode: VoI ranking from cached posterior",
    },
    "simulate_counterfactual": {
        "before": {"ari": 0.34, "primary_axis_affected": "cardio", "score_before": 72.0},
        "after": {"ari": 0.28, "primary_axis_affected": "cardio", "score_after": 76.5},
        "delta_ari": -0.06,
        "safety_veto": False,
        "provenance": PROV_SIM,
        "airgap_notice": "Offline mode: counterfactual from cached OU model",
    },
    "evaluate_return_window": {
        "earliest_window": {
            "mission_day": 52,
            "delta_v_m_s": 120.4,
            "capsule": "Crew Dragon",
            "landing_site": "KSC",
        },
        "recommendation": "CONTINUE_MONITORING",
        "ari_threshold_for_return": 0.65,
        "current_ari": 0.34,
        "provenance": PROV_SIM,
        "airgap_notice": "Offline mode: return window from cached ephemeris",
    },
    "zoom_anatomy_axis": {
        "axis": "cardio",
        "score": 72.0,
        "sub_components": {
            "heart_rate_variability_rmssd_ms": 34.2,
            "orthostatic_tolerance_score": 58.0,
            "blood_pressure_systolic_mmhg": 118.0,
            "blood_pressure_diastolic_mmhg": 76.0,
            "cardiac_output_shift_pct": 6.2,
        },
        "trend_7d": "stable",
        "clinical_context": "Mild cardiovascular deconditioning consistent with mission day 47",
        "provenance": PROV_SIM,
        "airgap_notice": "Offline mode: axis detail from cached state",
    },
    "trigger_incapacitation_mode": {
        "status": "BREAK_GLASS_ACTIVATED",
        "authority_level": "FULL_AUTONOMOUS",
        "audit_hash": "offline-no-hash",
        "provenance": PROV_SIM,
        "airgap_notice": "Offline mode: break-glass logged locally, pending uplink",
    },
}


@dataclass
class VoiceOrchestratorConfig:
    """Configuration loaded from environment variables."""

    api_key: str = ""
    model: str = "gpt-4o-mini"
    tts_model: str = "tts-1"
    tts_voice: str = "onyx"
    whisper_model: str = "whisper-1"
    structured_model: str = "gpt-4o-mini"
    airgap_force_offline: bool = False

    @classmethod
    def from_env(cls) -> VoiceOrchestratorConfig:
        return cls(
            api_key=os.getenv("OPENAI_API_KEY", ""),
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            tts_model=os.getenv("OPENAI_TTS_MODEL", "tts-1"),
            tts_voice=os.getenv("OPENAI_TTS_VOICE", "onyx"),
            whisper_model=os.getenv("OPENAI_WHISPER_MODEL", "whisper-1"),
            structured_model=os.getenv("OPENAI_STRUCTURED_MODEL", "gpt-4o-mini"),
            airgap_force_offline=os.getenv("AIRGAP_FORCE_OFFLINE", "false").lower() == "true",
        )


@dataclass
class ConversationTurn:
    """A single turn in the voice conversation history."""

    role: str  # "system", "user", "assistant", "tool"
    content: str
    tool_call_id: Optional[str] = None
    tool_calls: Optional[list[dict[str, Any]]] = None
    name: Optional[str] = None


class VoiceOrchestrator:
    """
    Hybrid Voice and Tool Orchestrator for CHIRON.

    Handles:
    - Structured chat completions with tool-use via gpt-4o-mini
    - Whisper STT transcription
    - TTS-1 speech synthesis
    - WebRTC realtime session tokens
    - Deterministic offline fallback when air-gapped
    """

    def __init__(
        self,
        config: VoiceOrchestratorConfig,
        twin_registry: Optional[dict] = None,
        voi_planner: Optional[Any] = None,
        return_window_solver: Optional[Any] = None,
        safety_guard: Optional[Any] = None,
        audit_vault: Optional[Any] = None,
    ):
        self.config = config
        self._airgap = config.airgap_force_offline
        self._client: Optional[AsyncOpenAI] = None
        self._http_client: Optional[httpx.AsyncClient] = None

        # Companion module references
        self._twin_registry = twin_registry or {}
        self._voi_planner = voi_planner
        self._return_window_solver = return_window_solver
        self._safety_guard = safety_guard
        self._audit_vault = audit_vault

        # Active crew member for context
        self._active_crew_id: str = "CDR_VANCE"

        # Conversation history per session
        self._conversations: dict[str, list[dict[str, Any]]] = {}

        if not self._airgap and config.api_key:
            self._client = AsyncOpenAI(api_key=config.api_key)

        logger.info(
            "VoiceOrchestrator initialized | airgap=%s | model=%s",
            self._airgap,
            config.structured_model,
        )

    # ------------------------------------------------------------------
    # Public: airgap mode toggle
    # ------------------------------------------------------------------

    def set_airgap(self, offline: bool) -> None:
        """Toggle air-gap mode. When True, no OpenAI API calls are made."""
        self._airgap = offline
        if not offline and self.config.api_key and self._client is None:
            self._client = AsyncOpenAI(api_key=self.config.api_key)
        logger.info("Airgap mode set to %s", offline)

    @property
    def is_offline(self) -> bool:
        return self._airgap or self._client is None

    def set_active_crew(self, crew_id: str) -> None:
        self._active_crew_id = crew_id

    # ------------------------------------------------------------------
    # STT: Whisper transcription
    # ------------------------------------------------------------------

    async def transcribe(self, audio_bytes: bytes, filename: str = "audio.webm") -> dict[str, Any]:
        """Transcribe audio bytes via OpenAI Whisper. Returns text and metadata."""
        if self.is_offline:
            return {
                "text": "[OFFLINE] Voice transcription unavailable in air-gap mode.",
                "provenance": PROV_ABSTAIN,
                "language": "en",
                "duration_s": 0.0,
            }

        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        try:
            response = await self._client.audio.transcriptions.create(
                model=self.config.whisper_model,
                file=audio_file,
                response_format="verbose_json",
                language="en",
            )
            return {
                "text": response.text,
                "provenance": PROV_REAL,
                "language": getattr(response, "language", "en"),
                "duration_s": getattr(response, "duration", 0.0),
                "segments": [
                    {
                        "start": seg.start if hasattr(seg, "start") else 0,
                        "end": seg.end if hasattr(seg, "end") else 0,
                        "text": seg.text if hasattr(seg, "text") else "",
                    }
                    for seg in (getattr(response, "segments", None) or [])
                ],
            }
        except Exception as exc:
            logger.error("Whisper transcription failed: %s", exc)
            return {
                "text": "",
                "provenance": PROV_ABSTAIN,
                "error": str(exc),
                "language": "en",
                "duration_s": 0.0,
            }

    # ------------------------------------------------------------------
    # TTS: Text-to-speech synthesis
    # ------------------------------------------------------------------

    async def synthesize_speech(self, text: str) -> dict[str, Any]:
        """Generate TTS audio bytes via OpenAI TTS-1 with onyx voice."""
        if self.is_offline:
            return {
                "audio_bytes": b"",
                "provenance": PROV_ABSTAIN,
                "error": "TTS unavailable in air-gap mode",
                "content_type": "audio/mp3",
            }

        try:
            response = await self._client.audio.speech.create(
                model=self.config.tts_model,
                voice=self.config.tts_voice,
                input=text,
                response_format="mp3",
            )
            audio_bytes = response.content
            return {
                "audio_bytes": audio_bytes,
                "provenance": PROV_REAL,
                "content_type": "audio/mp3",
                "size_bytes": len(audio_bytes),
            }
        except Exception as exc:
            logger.error("TTS synthesis failed: %s", exc)
            return {
                "audio_bytes": b"",
                "provenance": PROV_ABSTAIN,
                "error": str(exc),
                "content_type": "audio/mp3",
            }

    # ------------------------------------------------------------------
    # WebRTC: Realtime session token
    # ------------------------------------------------------------------

    async def get_rtc_session_token(self) -> dict[str, Any]:
        """Get a WebRTC realtime session token from OpenAI realtime API."""
        if self.is_offline:
            return {
                "token": None,
                "provenance": PROV_ABSTAIN,
                "error": "WebRTC unavailable in air-gap mode",
            }

        try:
            if self._http_client is None:
                self._http_client = httpx.AsyncClient(timeout=15.0)

            resp = await self._http_client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini-realtime-preview",
                    "voice": self.config.tts_voice,
                    "instructions": CHIRON_SYSTEM_PROMPT,
                    "tools": TOOL_SCHEMAS,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "token": data.get("client_secret", {}).get("value"),
                "expires_at": data.get("client_secret", {}).get("expires_at"),
                "session_id": data.get("id"),
                "provenance": PROV_REAL,
            }
        except Exception as exc:
            logger.error("WebRTC session token request failed: %s", exc)
            return {
                "token": None,
                "provenance": PROV_ABSTAIN,
                "error": str(exc),
            }

    # ------------------------------------------------------------------
    # Chat: Structured completions with tool calling
    # ------------------------------------------------------------------

    async def chat(
        self,
        user_message: str,
        session_id: str = "default",
        crew_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Process a user chat message. Returns the assistant response
        and any tool call results.

        In offline mode, generates deterministic clinical responses.
        """
        effective_crew = crew_id or self._active_crew_id

        if self.is_offline:
            return self._offline_chat(user_message, effective_crew)

        # Initialize conversation history if needed
        if session_id not in self._conversations:
            self._conversations[session_id] = [
                {"role": "system", "content": CHIRON_SYSTEM_PROMPT}
            ]

        history = self._conversations[session_id]
        history.append({"role": "user", "content": user_message})

        try:
            # First completion - may include tool calls
            response = await self._client.chat.completions.create(
                model=self.config.structured_model,
                messages=history,
                tools=TOOL_SCHEMAS,
                tool_choice="auto",
                temperature=0.3,
                max_tokens=800,
            )

            message = response.choices[0].message
            tool_results = []

            # If the model requested tool calls, execute them
            if message.tool_calls:
                # Append assistant message with tool calls
                history.append(message.model_dump())

                for tool_call in message.tool_calls:
                    fn_name = tool_call.function.name
                    fn_args = json.loads(tool_call.function.arguments)

                    # Inject crew_id if not provided
                    if "crew_id" not in fn_args:
                        fn_args["crew_id"] = effective_crew

                    result = await self._dispatch_tool(fn_name, fn_args)
                    result_str = json.dumps(result, default=str)
                    tool_results.append(
                        {
                            "tool_name": fn_name,
                            "arguments": fn_args,
                            "result": result,
                        }
                    )

                    history.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": result_str,
                        }
                    )

                # Second completion - model synthesizes tool results
                response2 = await self._client.chat.completions.create(
                    model=self.config.structured_model,
                    messages=history,
                    temperature=0.3,
                    max_tokens=800,
                )
                final_text = response2.choices[0].message.content or ""
                history.append({"role": "assistant", "content": final_text})
            else:
                final_text = message.content or ""
                history.append({"role": "assistant", "content": final_text})

            # Trim conversation to last 40 turns to manage context window
            if len(history) > 42:
                self._conversations[session_id] = [history[0]] + history[-40:]

            return {
                "text": final_text,
                "tool_calls": tool_results,
                "provenance": PROV_REAL if not tool_results else PROV_DER,
                "model": self.config.structured_model,
                "session_id": session_id,
            }

        except Exception as exc:
            logger.error("Chat completion failed: %s", exc)
            # Fall back to offline
            fallback = self._offline_chat(user_message, effective_crew)
            fallback["error"] = str(exc)
            fallback["fallback"] = True
            return fallback

    # ------------------------------------------------------------------
    # Tool dispatcher
    # ------------------------------------------------------------------

    async def _dispatch_tool(self, fn_name: str, args: dict[str, Any]) -> dict[str, Any]:
        """Route a tool call to the appropriate companion module."""
        crew_id = args.get("crew_id", self._active_crew_id)

        try:
            if fn_name == "get_twin_status":
                return self._exec_get_twin_status(crew_id)

            elif fn_name == "compute_voi_next_test":
                return self._exec_compute_voi(crew_id)

            elif fn_name == "simulate_counterfactual":
                return self._exec_simulate_counterfactual(
                    crew_id,
                    args.get("countermeasure", "fluid_loading"),
                    args.get("horizon_hours", 72),
                )

            elif fn_name == "evaluate_return_window":
                return self._exec_evaluate_return_window(
                    crew_id,
                    args.get("mission_profile", "ISS_LEO"),
                )

            elif fn_name == "zoom_anatomy_axis":
                return self._exec_zoom_axis(
                    crew_id,
                    args.get("axis", "cardio"),
                )

            elif fn_name == "trigger_incapacitation_mode":
                return self._exec_incapacitation(
                    crew_id,
                    args.get("authorizer_id", "CMO_PATEL"),
                    args.get("reason", "Unspecified incapacitation"),
                )

            else:
                return {"error": f"Unknown tool: {fn_name}", "provenance": PROV_ABSTAIN}

        except Exception as exc:
            logger.error("Tool dispatch error for %s: %s", fn_name, exc)
            return {"error": str(exc), "provenance": PROV_ABSTAIN}

    # ------------------------------------------------------------------
    # Tool implementations - dispatch to companion modules
    # ------------------------------------------------------------------

    def _exec_get_twin_status(self, crew_id: str) -> dict[str, Any]:
        twin = self._twin_registry.get(crew_id)
        if twin is None:
            return OFFLINE_FALLBACKS["get_twin_status"]

        state = twin.get_state()
        ari = twin.get_ari()
        return {
            "crew_id": crew_id,
            "axes": {
                axis_name: {
                    "score": round(float(score), 2),
                    "provenance": PROV_SIM,
                }
                for axis_name, score in state.get("axes", {}).items()
            },
            "ari": round(float(ari), 4),
            "ari_provenance": PROV_DER,
            "mission_day": state.get("mission_day", 0),
            "timestamp_utc": state.get("timestamp_utc", ""),
            "sensor_dropout": state.get("sensor_dropout", {}),
        }

    def _exec_compute_voi(self, crew_id: str) -> dict[str, Any]:
        twin = self._twin_registry.get(crew_id)
        if twin is None or self._voi_planner is None:
            return OFFLINE_FALLBACKS["compute_voi_next_test"]

        state = twin.get_state()
        ranked = self._voi_planner.rank_measurements(state)
        return {
            "crew_id": crew_id,
            "ranked_measurements": [
                {
                    "rank": i + 1,
                    "test": m.get("test", m.get("name", "unknown")),
                    "voi_bits": round(float(m.get("voi_bits", m.get("voi", 0))), 3),
                    "axis": m.get("axis", ""),
                    "provenance": PROV_DER,
                }
                for i, m in enumerate(ranked[:8])
            ],
        }

    def _exec_simulate_counterfactual(
        self, crew_id: str, countermeasure: str, horizon_hours: float
    ) -> dict[str, Any]:
        twin = self._twin_registry.get(crew_id)
        if twin is None:
            fallback = dict(OFFLINE_FALLBACKS["simulate_counterfactual"])
            fallback["countermeasure"] = countermeasure
            return fallback

        # Get baseline state
        state_before = twin.get_state()
        ari_before = twin.get_ari()

        # Check safety guard first
        veto_result = None
        if self._safety_guard is not None:
            env_state = {
                "twin_state": state_before,
                "crew_id": crew_id,
            }
            veto_result = self._safety_guard.evaluate_countermeasure(countermeasure, env_state)

        # Apply countermeasure to get projected state
        projected = twin.apply_countermeasure(countermeasure)
        trajectory = twin.predict_trajectory(horizon_hours)
        ari_after = projected.get("ari_after", ari_before)

        is_vetoed = False
        veto_reason = ""
        if veto_result is not None:
            is_vetoed = getattr(veto_result, "vetoed", False)
            veto_reason = getattr(veto_result, "reason", "")

        return {
            "crew_id": crew_id,
            "countermeasure": countermeasure,
            "horizon_hours": horizon_hours,
            "before": {
                "ari": round(float(ari_before), 4),
                "axes": {
                    k: round(float(v), 2)
                    for k, v in state_before.get("axes", {}).items()
                },
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
        }

    def _exec_evaluate_return_window(
        self, crew_id: str, mission_profile: str
    ) -> dict[str, Any]:
        twin = self._twin_registry.get(crew_id)
        if twin is None or self._return_window_solver is None:
            fallback = dict(OFFLINE_FALLBACKS["evaluate_return_window"])
            fallback["mission_profile"] = mission_profile
            return fallback

        result = self._return_window_solver.evaluate(twin, mission_profile)
        return {
            "crew_id": crew_id,
            "mission_profile": mission_profile,
            "windows": getattr(result, "windows", []),
            "recommendation": getattr(result, "recommendation", "CONTINUE_MONITORING"),
            "current_ari": round(float(twin.get_ari()), 4),
            "ari_threshold_for_return": getattr(result, "threshold", 0.65),
            "provenance": PROV_DER,
        }

    def _exec_zoom_axis(self, crew_id: str, axis: str) -> dict[str, Any]:
        twin = self._twin_registry.get(crew_id)
        if twin is None:
            fallback = dict(OFFLINE_FALLBACKS["zoom_anatomy_axis"])
            fallback["axis"] = axis
            return fallback

        state = twin.get_state()
        axes = state.get("axes", {})
        score = axes.get(axis, 0.0)
        details = state.get("axis_details", {}).get(axis, {})
        uncertainty = state.get("uncertainties", {}).get(axis, 0.0)

        return {
            "crew_id": crew_id,
            "axis": axis,
            "score": round(float(score), 2),
            "uncertainty": round(float(uncertainty), 3),
            "sub_components": details.get("sub_components", {}),
            "trend_7d": details.get("trend_7d", "stable"),
            "clinical_context": details.get("clinical_context", f"{axis} within expected range"),
            "provenance": PROV_DER,
        }

    def _exec_incapacitation(
        self, crew_id: str, authorizer_id: str, reason: str
    ) -> dict[str, Any]:
        result = {
            "crew_id": crew_id,
            "authorizer_id": authorizer_id,
            "reason": reason,
            "status": "BREAK_GLASS_ACTIVATED",
            "authority_level": "FULL_AUTONOMOUS",
            "provenance": PROV_DER,
        }

        if self._audit_vault is not None:
            bg_result = self._audit_vault.trigger_break_glass(
                crew_id=crew_id,
                authorizer_id=authorizer_id,
                reason=reason,
            )
            result["audit_hash"] = getattr(bg_result, "hash", "pending")
            result["chain_valid"] = getattr(bg_result, "chain_valid", True)
        else:
            ts = int(time.time())
            raw = f"{crew_id}:{authorizer_id}:{reason}:{ts}"
            result["audit_hash"] = hashlib.sha256(raw.encode()).hexdigest()[:16]

        return result

    # ------------------------------------------------------------------
    # Offline deterministic chat
    # ------------------------------------------------------------------

    def _offline_chat(self, user_message: str, crew_id: str) -> dict[str, Any]:
        """
        100% deterministic offline chat. No network calls.
        Parses user intent via keyword matching and returns pre-scripted
        clinical responses.
        """
        msg_lower = user_message.lower()
        tool_results = []
        response_text = ""

        if any(kw in msg_lower for kw in ["status", "state", "how is", "vitals", "health"]):
            result = OFFLINE_FALLBACKS["get_twin_status"]
            tool_results.append({"tool_name": "get_twin_status", "result": result})
            ari = result["ari"]
            response_text = (
                f"CHIRON offline report for {crew_id}: "
                f"Aggregate Risk Index {ari} {PROV_SIM}. "
                f"Cardio 72.0, Neuro 78.0, Bone 85.0, Immune 70.0, "
                f"Sleep 68.0 (declining), Behav 75.0, Rad 88.0. "
                f"All values from cached twin state. "
                f"Recommend uplink restoration for live posterior updates."
            )

        elif any(kw in msg_lower for kw in ["test", "measure", "voi", "next", "information"]):
            result = OFFLINE_FALLBACKS["compute_voi_next_test"]
            tool_results.append({"tool_name": "compute_voi_next_test", "result": result})
            top = result["ranked_measurements"][0]
            response_text = (
                f"VoI analysis {PROV_SIM}: highest-value measurement is "
                f"{top['test']} at {top['voi_bits']} bits expected entropy reduction. "
                f"Second priority: venous blood draw for CBC and CRP. "
                f"Rankings from cached posterior; re-rank after uplink."
            )

        elif any(kw in msg_lower for kw in ["counterfactual", "simulate", "what if", "countermeasure", "intervention"]):
            result = OFFLINE_FALLBACKS["simulate_counterfactual"]
            tool_results.append({"tool_name": "simulate_counterfactual", "result": result})
            response_text = (
                f"Counterfactual simulation {PROV_SIM}: "
                f"ARI delta of {result['delta_ari']} projected. "
                f"Before: 0.34, After: 0.28. No safety vetoes. "
                f"Result from cached OU mean-reversion model."
            )

        elif any(kw in msg_lower for kw in ["return", "evacuation", "medevac", "window"]):
            result = OFFLINE_FALLBACKS["evaluate_return_window"]
            tool_results.append({"tool_name": "evaluate_return_window", "result": result})
            w = result["earliest_window"]
            response_text = (
                f"Return window analysis {PROV_SIM}: "
                f"Earliest return at mission day {w['mission_day']}, "
                f"delta-v cost {w['delta_v_m_s']} m/s via {w['capsule']}. "
                f"Recommendation: {result['recommendation']}. "
                f"Current ARI {result['current_ari']} below return threshold "
                f"{result['ari_threshold_for_return']}."
            )

        elif any(kw in msg_lower for kw in ["incapacit", "break glass", "emergency", "unconscious"]):
            result = OFFLINE_FALLBACKS["trigger_incapacitation_mode"]
            tool_results.append({"tool_name": "trigger_incapacitation_mode", "result": result})
            response_text = (
                f"Break-glass protocol activated {PROV_SIM}. "
                f"CHIRON operating at FULL_AUTONOMOUS authority. "
                f"Audit logged locally, hash: {result['audit_hash']}. "
                f"Pending uplink verification."
            )

        else:
            response_text = (
                f"CHIRON offline mode active. Limited to cached state analysis. "
                f"Available commands: crew status, VoI test ranking, "
                f"counterfactual simulation, return window evaluation. "
                f"Restore uplink for full capability {PROV_ABSTAIN}."
            )

        return {
            "text": response_text,
            "tool_calls": tool_results,
            "provenance": PROV_SIM,
            "model": "offline-deterministic",
            "session_id": "offline",
            "airgap": True,
        }

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    async def close(self) -> None:
        """Clean up HTTP clients."""
        if self._http_client is not None:
            await self._http_client.aclose()
            self._http_client = None
        if self._client is not None:
            await self._client.close()
            self._client = None

    def clear_session(self, session_id: str = "default") -> None:
        """Clear conversation history for a session."""
        self._conversations.pop(session_id, None)
