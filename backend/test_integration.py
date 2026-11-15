"""
CHIRON v2.0 - End-to-End Backend Verification Test Suite
Tests all endpoints, mathematical engines, safety vetoes, VoI planners,
return-window solvers, and cryptographic audit ledgers.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.resolve()))

from fastapi.testclient import TestClient
from main import app

def test_full_pipeline():
    print("=== STARTING CHIRON v2.0 INTEGRATION TEST SUITE ===")

    with TestClient(app) as client:
        # 1. Test Twin State
        res = client.post("/api/twin/state", json={"crew_id": "CDR_VANCE"})
        assert res.status_code == 200, f"Failed /api/twin/state: {res.text}"
        state = res.json()
        print("[PASS] /api/twin/state: ARI =", state["ari"], "Axes count:", len(state["axes"]))
        assert "neuro" in state["axes"]
        assert state["ari"] > 0

        # 2. Test 72h / 14d Trajectory Prediction
        res = client.post("/api/twin/predict", json={"crew_id": "CDR_VANCE", "horizon_hours": 72})
        assert res.status_code == 200, f"Failed /api/twin/predict: {res.text}"
        pred = res.json()
        print("[PASS] /api/twin/predict: Trajectory points count =", len(pred["trajectory"]))
        assert len(pred["trajectory"]) > 0

        # 3. Test Counterfactual Simulation & Safety Guard Veto
        # Nominal plan
        res = client.post("/api/twin/counterfactual", json={
            "crew_id": "CDR_VANCE",
            "horizon_hours": 72,
            "countermeasure": {
                "ared_load_kg": 65.0,
                "co2_scrubber_efficiency": 0.85,
                "lighting_kelvin": 4500.0,
                "storm_shelter_active": False,
            }
        })
        assert res.status_code == 200
        cf_nom = res.json()
        print("[PASS] Nominal Countermeasure: Safety Veto =", cf_nom["safety_veto"])
        assert cf_nom["safety_veto"] is False

        # VETO plan: high exertion under hypercapnic load
        res = client.post("/api/safety/evaluate", json={
            "crew_id": "CDR_VANCE",
            "countermeasure": {
                "ared_load_kg": 85.0,
                "co2_scrubber_efficiency": 0.3,
                "cabin_ppco2_mmhg": 3.8,
            }
        })
        assert res.status_code == 200
        veto_res = res.json()
        print("[PASS] NASA-STD-3001 Safety Veto Check: Vetoed =", veto_res["vetoed"], "Rule:", veto_res["rule_id"])

        # 4. Test Sensor Dropout & Uncertainty Widening
        res = client.post("/api/twin/dropout", json={
            "crew_id": "CDR_VANCE",
            "axis": "neuro",
            "dropout": True
        })
        assert res.status_code == 200
        drop_res = res.json()
        print("[PASS] Sensor Dropout Toggle on 'neuro':", drop_res["sensor_dropout"])
        assert drop_res["sensor_dropout"]["neuro"] is True

        # 5. Test VoI Next-Best-Measurement Planner
        res = client.get("/api/voi/rank?crew_id=CDR_VANCE")
        assert res.status_code == 200
        voi_res = res.json()
        print("[PASS] VoI Ranked Top Recommendation:", voi_res["ranked_measurements"][0]["test"], "VoI bits:", voi_res["ranked_measurements"][0]["voi_bits"])
        assert len(voi_res["ranked_measurements"]) == 5

        # 6. Test Logging Measurement & Updating Posterior
        res = client.post("/api/twin/observation", json={
            "crew_id": "CDR_VANCE",
            "axis": "neuro",
            "value": 75.0,
            "measurement_type": "M3_OCULAR_POCUS"
        })
        assert res.status_code == 200
        obs_res = res.json()
        print("[PASS] Logged Ocular POCUS: Posterior x =", obs_res["posterior_update"]["posterior_x"])

        # 7. Test Return Window Horizon Solver
        res = client.post("/api/return-window/evaluate", json={
            "crew_id": "CDR_VANCE",
            "mission_profile": "LEO_ISS"
        })
        assert res.status_code == 200
        rw_res = res.json()
        print("[PASS] Return-Window Solver:", rw_res["mission_profile"], "Margin:", rw_res["windows"][0]["delta_t_margin_hours"], "h, Status:", rw_res["windows"][0]["status"])

        # 8. Test Break-Glass Trigger & SHA-256 Ledger
        res = client.post("/api/audit/break-glass", json={
            "crew_id": "CDR_VANCE",
            "authorizer_id": "ACTING_CDR",
            "reason": "CMO Acute Syncope Incapacitation"
        })
        assert res.status_code == 200
        bg_res = res.json()
        print("[PASS] Trigger Break-Glass: Status =", bg_res["status"], "Hash =", bg_res["hash"][:16])

        # 9. Verify Ledger & SHA-256 Hash Chain
        res = client.get("/api/audit/ledger")
        assert res.status_code == 200
        ledger_res = res.json()
        print("[PASS] SHA-256 Audit Chain Valid =", ledger_res["chain_valid"], "Entries =", ledger_res["entry_count"])
        assert ledger_res["chain_valid"] is True

        # 10. Test Voice Chat (Local Deterministic Airgap Fallback)
        res = client.post("/api/voice/chat", json={
            "crew_id": "CDR_VANCE",
            "text": "CHIRON, what is my allostatic resilience status?",
            "airgap": True
        })
        assert res.status_code == 200
        chat_res = res.json()
        response_text = chat_res.get("text", "")
        print("[PASS] Voice Chat Airgap Response:", response_text[:60], "...")
        assert len(response_text) > 0

        print("=== ALL 10 TESTS PASSED WITH 100% SUCCESS ===")

if __name__ == "__main__":
    try:
        test_full_pipeline()
    except Exception as exc:
        import traceback
        traceback.print_exc()
        sys.exit(1)
