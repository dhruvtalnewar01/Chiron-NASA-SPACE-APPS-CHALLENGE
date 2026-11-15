# Contributing to CHIRON

Thank you for your interest in contributing to **CHIRON: Autonomous Spaceflight Health Decision & Return-Window Dashboard OS**. This system is built to NASA-STD-3001 clinical standards for long-duration human spaceflight (LEO, Artemis Cislunar, and Mars Transit).

## Core Principles & Design Mandate

All contributions must strictly uphold the following human-factors and engineering mandates:

1. **NASA-STD-3001 Compliance:**
   - Every physiological threshold, safety guardrail, and autonomous recommendation must trace directly to NASA-STD-3001 Volume 2 guidelines.
   - Any countermeasure that poses clinical risk (e.g., high exercise exertion under elevated cabin $pp\text{CO}_2$, extreme fluid redistribution) must implement a strict mathematical safety veto.

2. **Aerospace Clinical Human Factors & Interface Design:**
   - **High-Contrast Clinical Tokens:** Use verified theme palettes (Orbital Daylight, Deep-Space Titanium, Circadian Red-Shift) to guarantee legibility under varied spacecraft lighting.
   - **Tactical Ergonomics:** Maintain standardized technical border radii, clear touch targets, and high-visibility typography.
   - **Direct Workstation Focus:** Boot directly into active telemetry streams and guided procedures with zero placeholder content.
   - **Vector Telemetry Icons:** Use crisp SVG vectors (`lucide-react`) and explicit monospace provenance indicators.
   - **Clean Typography:** Maintain standard ASCII punctuation and structured alphanumeric formatting across all flight deck transcripts.

3. **Mathematical & Epistemic Honesty:**
   - Always display explicit epistemic provenance (`[REAL]`, `[SIMULATED]`, `[DERIVED]`, `[ABSTAIN]`).
   - Never report uncalibrated point estimates without conformal prediction intervals ($\pm 90\%$ CI).
   - Value of Information (VoI) calculations must follow Shannon mutual information formulations.

---

## Development Workflow

### 1. Branching Strategy
- `main`: Production-ready, verified release branch.
- `feature/<module-name>`: Scoped feature development.
- `fix/<bug-description>`: Targeted defect remediations.

### 2. Backend Guidelines (FastAPI / Python)
- Python 3.10+ required.
- Type annotations required on all functions and Pydantic models.
- All endpoints must include deterministic fallback behavior for spaceflight air-gap scenarios (`AIRGAP_FORCE_OFFLINE=true`).
- Run the test suite before submitting PRs:
  ```bash
  cd backend
  python test_integration.py
  ```
  Ensure 10/10 tests pass with 100% success rate.

### 3. Frontend Guidelines (React / TypeScript / Vite / Three.js)
- TypeScript strict mode enforced.
- Tailwind CSS with CSS variable tokens (`var(--surface-base)`, `var(--ink-primary)`, etc.) to support seamless multi-theme switching (Orbital Daylight, Deep-Space Titanium, Circadian Red-Shift).
- 60fps WebGL/Canvas rendering loops must clean up animation frames on unmount.
- Verify clean compilation with:
  ```bash
  cd frontend
  npm run build
  ```

---

## Submitting Pull Requests

1. Fork the repository and create your feature branch from `main`.
2. Ensure both backend and frontend compile cleanly without warnings or errors.
3. Open a Pull Request detailing:
   - Clinical or engineering rationale.
   - NASA-STD-3001 requirement citation (if applicable).
   - Screenshots or video recordings demonstrating UI responsiveness and zero clipping.

