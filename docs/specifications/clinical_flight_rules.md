# NASA-STD-3001 Clinical Flight Rules & Guardrails

**Standard:** NASA-STD-3001 Space Flight Human-System Standard, Volume 2  
**Application:** Autonomous Clinical Decision Support for Deep Space Exploration  
**Rule Engine Status:** Fully Deterministic (Safety-Critical Path)

---

## 1. Scope & Authority

The CHIRON clinical engine enforces hard deterministic constraints derived directly from NASA-STD-3001 Volume 2. While artificial intelligence models (such as LLM-based predictive radars) provide decision support and heuristic suggestions, all countermeasure execution commands must pass through the deterministic safety guardrail engine (`safety_guard.py`) prior to actuation.

---

## 2. Key Environmental & Physiological Thresholds

### 2.1 Carbon Dioxide Exposure ($pp\text{CO}_2$)
- **Nominal Ceiling:** $pp\text{CO}_2 \le 3.0\text{ mmHg}$ ($0.4\%$).
- **Advisory Threshold:** $3.0 < pp\text{CO}_2 \le 3.5\text{ mmHg}$. Crew headache surveillance initiated.
- **Critical Abort Ceiling:** $pp\text{CO}_2 > 3.8\text{ mmHg}$.
- **Safety Veto Rule `NASA-STD-3001-V2-6004`:** High-intensity aerobic or resistive exercise (ARED $> 70\text{ kg}$) is strictly vetoed if cabin $pp\text{CO}_2 > 3.5\text{ mmHg}$ due to risk of acute hypercapnic respiratory acidosis and cerebral vasodilation.

### 2.2 Solar Particle Event (SPE) Ionizing Radiation
- **Nominal Proton Flux:** Integral flux $J(E > 10\text{ MeV}) < 1.0\text{ pfu}$.
- **Advisory Level:** $1.0 \le J(E > 10\text{ MeV}) < 10.0\text{ pfu}$. Unscheduled EVAs postponed.
- **Storm Shelter Trigger:** $J(E > 10\text{ MeV}) \ge 10.0\text{ pfu}$ (NOAA S2 Moderate Radiation Storm).
- **Safety Veto Rule `NASA-STD-3001-V2-8001`:** Immediate crew retreat to heavily shielded storm shelter modules. All unshielded compartment access is interlocked.

### 2.3 Neuro-Ocular & Orthostatic SANS Limits
- **Optic Nerve Sheath Diameter (ONSD):** Nominal $\le 5.0\text{ mm}$. Papilledema risk threshold $> 5.8\text{ mm}$.
- **Intraocular Pressure (IOP):** Nominal $12\text{--}20\text{ mmHg}$. Critical ceiling $> 28\text{ mmHg}$.
- **Safety Veto Rule `NASA-STD-3001-V2-7012`:** Sustained microgravity inversion or head-down tilt protocols are strictly prohibited when ONSD $> 5.8\text{ mm}$ to prevent irreversible optic disc damage.

---

## 3. Emergency Break-Glass Protocol

If the Chief Medical Officer (CMO) suffers acute incapacitation (e.g., loss of consciousness, severe trauma, or vasovagal syncope):

1. The acting Commander or any certified crew member may trigger the `BREAK-GLASS` authorization code via the dashboard or voice interface.
2. The system cryptographically logs the event with the authorizer's identifier, UTC timestamp, and clinical rationale into the SHA-256 audit ledger.
3. CHIRON enters **Layman Buddy-Care Mode**, delivering step-by-step vocal instructions and visual checklists with simplified terminology to allow non-physicians to administer emergency care safely.

