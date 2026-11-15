# Aerospace Human Factors & Flight-Deck Interface Design Standards

**Standard Reference:** NASA-STD-3001 Volume 2, Chapter 10 (Displays and Controls)  
**Interface Paradigm:** Tactical 12-Column Bento Command Dashboard & 3D WebGL Digital Twin  
**Target Display Hardware:** Spacecraft flight-deck touchscreens, high-g displays, and mobile tablets

---

## 1. Design Objectives

Spacecraft crew interfaces operate under distinct physical constraints:
- Vibration during launch, thruster firings, and orbital insertion burns.
- Microgravity motor impairment and perceptual fluid shifts.
- Variable cabin ambient illumination (orbital daylight transitions every 90 minutes in LEO).
- High cognitive workload during emergencies.

The CHIRON user interface is engineered strictly for rapid scannability, deterministic navigation, and zero ambiguous states.

---

## 2. Color Architectures & Mission Modes

The interface supports three high-contrast operational modes designed for specific lighting and physiological environments:

### 2.1 Mode 01: Orbital Daylight Ceramic (High-Contrast Clean Room)
- **Primary Canvas:** `#F4F6F8` (Matte Ceramic Alabaster).
- **Surface Elevation:** Translucent white (`rgba(255, 255, 255, 0.88)`) with `backdrop-filter: blur(12px)` and subtle borders (`#CBD5E1`).
- **Typography Ink:** `#0F172A` (deep slate) for primary metrics; `#475569` for secondary data.
- **Accents:** Nominal telemetry teal (`#0D9488`), advisory amber (`#D97706`), critical alert crimson (`#E11D48`).

### 2.2 Mode 02: Deep-Space Obsidian Titanium (Low-Glare Cupola Mode)
- **Primary Canvas:** `#070A0E` (Anodized Carbon Slate).
- **Surface Elevation:** High-density slate (`rgba(13, 18, 26, 0.86)`) with `1px solid #1E293B`.
- **Typography Ink:** `#F1F5F9` (crisp white) with muted secondary labels (`#94A3B8`).
- **Accents:** Nominal emerald (`#10B981`), solar alert ochre (`#F59E0B`), critical vermilion (`#F43F5E`).

### 2.3 Mode 03: Circadian Red-Shift & Emergency Triage
- **Primary Canvas:** `#0C0607` (Zero-blue-light melatonin preservation surface).
- **Surface Elevation:** Deep ruby slate (`rgba(24, 10, 12, 0.92)`) with `#4C1D24` borders.
- **Typography Ink:** High-visibility pink/amber (`#FECDD3`).
- **Accents:** Urgent amber (`#FB923C`), critical override red (`#EF4444`).

---

## 3. Typography & Information Hierarchy

- **Primary Display Typography:** `Readex Pro` for mission titles, navigation, and headline callouts.
- **Numerical Telemetry & Metrics:** `JetBrains Mono` / `IBM Plex Mono` (`tabular-nums`) to ensure scannable columnar alignment without jitter during live updates.
- **Body Copy & Procedures:** `Inter` (sans-serif) for high legibility under motion and vibration.

---

## 4. Provenance & Epistemic Tags

Every numerical telemetry indicator in the interface displays an explicit provenance badge:
- `[REAL]`: Direct live physical sensor measurement or NOAA API feed.
- `[SIM]`: Numerical output from the 7-axis physiological digital twin.
- `[DER]`: Derived index computed via mathematical formulas (e.g., Composite ARI).
- `[ABSTAIN]`: Measurement intentionally withheld due to sensor degradation or excessive noise.
