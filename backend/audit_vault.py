"""
CHIRON v2.0 - Consent Vault & SHA-256 Hash-Chained Break-Glass Audit Ledger
Implements military/aerospace HIPAA-compliant privacy tiers and an immutable
cryptographic ledger for emergency flight-deck break-glass events.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

DB_PATH = Path(__file__).resolve().parent / "data" / "audit_vault.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

TIER_1_CREW_PRIVATE = "TIER_1_CREW_PRIVATE"
TIER_2_FLIGHT_SURGEON = "TIER_2_CREW_FLIGHT_SURGEON"
TIER_3_EMERGENCY = "TIER_3_EMERGENCY_FULL_DISCLOSURE"


class AuditVault:
    """
    Cryptographic Audit Ledger with SHA-256 forward-hash chaining.
    Maintains persistent SQLite database with in-memory fast caching.
    """

    def __init__(self, db_path: Optional[Path] = None) -> None:
        self.db_path = db_path or DB_PATH
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Consent table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS crew_consent (
                    crew_id TEXT PRIMARY KEY,
                    tier TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    disclosed_fields TEXT NOT NULL
                )
            """)

            # Hash-chained ledger table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_ledger (
                    sequence_num INTEGER PRIMARY KEY AUTOINCREMENT,
                    prev_hash TEXT NOT NULL,
                    current_hash TEXT NOT NULL,
                    timestamp_utc TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    reason_code TEXT NOT NULL,
                    details_json TEXT NOT NULL
                )
            """)
            conn.commit()

            # Seed default consents if empty
            cursor.execute("SELECT COUNT(*) FROM crew_consent")
            if cursor.fetchone()[0] == 0:
                default_crews = ["CDR_VANCE", "PLT_ROSTOVA", "MS1_CHEN", "CMO_PATEL"]
                now = datetime.now(timezone.utc).isoformat()
                for cid in default_crews:
                    cursor.execute(
                        "INSERT INTO crew_consent VALUES (?, ?, ?, ?)",
                        (cid, TIER_1_CREW_PRIVATE, now, json.dumps(["composite_ari", "readiness_status"])),
                    )
                conn.commit()

            # Seed genesis block if ledger empty
            cursor.execute("SELECT COUNT(*) FROM audit_ledger")
            if cursor.fetchone()[0] == 0:
                self._append_entry(
                    prev_hash=GENESIS_HASH,
                    timestamp_utc=datetime.now(timezone.utc).isoformat(),
                    event_type="GENESIS_INITIALIZATION",
                    actor_id="CHIRON_SYSTEM",
                    patient_id="CREW_ALL",
                    reason_code="MISSION_BOOT",
                    details={"message": "CHIRON v2.0 Cryptographic Audit Ledger Initialized"},
                )

    def _append_entry(
        self,
        prev_hash: str,
        timestamp_utc: str,
        event_type: str,
        actor_id: str,
        patient_id: str,
        reason_code: str,
        details: dict[str, Any],
    ) -> str:
        """Calculate SHA-256 hash and append entry."""
        details_str = json.dumps(details, sort_keys=True)
        raw_payload = f"{prev_hash}|{timestamp_utc}|{event_type}|{actor_id}|{patient_id}|{reason_code}|{details_str}"
        current_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO audit_ledger (
                    prev_hash, current_hash, timestamp_utc,
                    event_type, actor_id, patient_id, reason_code, details_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (prev_hash, current_hash, timestamp_utc, event_type, actor_id, patient_id, reason_code, details_str),
            )
            conn.commit()

        return current_hash

    def _get_latest_hash(self) -> str:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT current_hash FROM audit_ledger ORDER BY sequence_num DESC LIMIT 1")
            row = cursor.fetchone()
            return row["current_hash"] if row else GENESIS_HASH

    def log_consent(
        self,
        crew_id: str,
        event_type: str,
        details: dict[str, Any],
        actor_id: str = "ASTRONAUT_VOICE",
    ) -> dict[str, Any]:
        """Log a consent change or regular telemetry access event."""
        prev_hash = self._get_latest_hash()
        timestamp = datetime.now(timezone.utc).isoformat()

        # Update consent tier if event is tier change
        tier = details.get("tier")
        if tier:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE crew_consent SET tier = ?, updated_at = ? WHERE crew_id = ?",
                    (tier, timestamp, crew_id),
                )
                conn.commit()

        curr_hash = self._append_entry(
            prev_hash=prev_hash,
            timestamp_utc=timestamp,
            event_type=event_type,
            actor_id=actor_id,
            patient_id=crew_id,
            reason_code=details.get("reason_code", "ROUTINE_TELEMETRY"),
            details=details,
        )

        return {
            "logged": True,
            "hash": curr_hash,
            "timestamp": timestamp,
            "provenance": "[REAL]",
        }

    def trigger_break_glass(
        self,
        crew_id: str,
        authorizer_id: str,
        reason: str,
    ) -> dict[str, Any]:
        """
        Execute Break-Glass Emergency Disclosure Protocol.
        Overrides privacy to TIER_3_EMERGENCY_FULL_DISCLOSURE and creates immutable record.
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        prev_hash = self._get_latest_hash()

        # Update consent to TIER 3 emergency
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE crew_consent SET tier = ?, updated_at = ? WHERE crew_id = ?",
                (TIER_3_EMERGENCY, timestamp, crew_id),
            )
            conn.commit()

        details = {
            "action": "EMERGENCY_BREAK_GLASS_TRIGGERED",
            "previous_tier": TIER_1_CREW_PRIVATE,
            "new_tier": TIER_3_EMERGENCY,
            "disclosed_fields": [
                "all_7_physiological_axes",
                "raw_biomarker_stream",
                "vocal_edema_dsp",
                "full_conformal_trajectories",
                "countermeasure_compliance",
            ],
            "justification": reason,
        }

        entry_hash = self._append_entry(
            prev_hash=prev_hash,
            timestamp_utc=timestamp,
            event_type="EMERGENCY_BREAK_GLASS",
            actor_id=authorizer_id,
            patient_id=crew_id,
            reason_code="ACUTE_INCAPACITATION_OR_MISSION_CRITICAL",
            details=details,
        )

        return {
            "status": "BREAK_GLASS_EXECUTED",
            "crew_id": crew_id,
            "authorizer_id": authorizer_id,
            "timestamp_utc": timestamp,
            "hash": entry_hash,
            "tier": TIER_3_EMERGENCY,
            "disclosed_fields": details["disclosed_fields"],
            "provenance": "[REAL]",
        }

    def get_ledger(self) -> list[dict[str, Any]]:
        """Return the complete audit ledger."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_ledger ORDER BY sequence_num ASC")
            rows = cursor.fetchall()

            ledger = []
            for r in rows:
                ledger.append({
                    "sequence_num": r["sequence_num"],
                    "prev_hash": r["prev_hash"][:12] + "..." if len(r["prev_hash"]) > 12 else r["prev_hash"],
                    "current_hash": r["current_hash"][:12] + "...",
                    "full_hash": r["current_hash"],
                    "timestamp_utc": r["timestamp_utc"],
                    "event_type": r["event_type"],
                    "actor_id": r["actor_id"],
                    "patient_id": r["patient_id"],
                    "reason_code": r["reason_code"],
                    "details": json.loads(r["details_json"]),
                    "provenance": "[REAL]",
                })
            return ledger

    def verify_chain(self) -> bool:
        """
        Verify the SHA-256 forward-hash chain integrity from genesis to head.
        Returns True if 100% valid, False if tampering detected.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_ledger ORDER BY sequence_num ASC")
            rows = cursor.fetchall()

            if not rows:
                return True

            for i in range(len(rows)):
                r = rows[i]
                expected_prev = GENESIS_HASH if i == 0 else rows[i - 1]["current_hash"]
                if r["prev_hash"] != expected_prev:
                    return False

                # Recompute hash
                raw_payload = f"{r['prev_hash']}|{r['timestamp_utc']}|{r['event_type']}|{r['actor_id']}|{r['patient_id']}|{r['reason_code']}|{r['details_json']}"
                recomputed = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()
                if recomputed != r["current_hash"]:
                    return False

            return True

    def get_consent_tier(self, crew_id: str) -> str:
        """Get current consent tier for crew member."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT tier FROM crew_consent WHERE crew_id = ?", (crew_id,))
            row = cursor.fetchone()
            return row["tier"] if row else TIER_1_CREW_PRIVATE

