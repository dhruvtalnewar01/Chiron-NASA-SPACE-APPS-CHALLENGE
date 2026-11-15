// ---------------------------------------------------------------------------
// CHIRON - HeroLandingSection (Production Grade)
// Full-Screen Cinematic Aerospace Architecture Hero Section for CHIRON
// Features looping fullscreen background video, streamlined glassmorphic top bar
// with official astronaut insignia logo, staggered typography ("command / orbital / space"),
// balanced spacing with zero element overlap, and responsive telemetry stat blocks.
// ---------------------------------------------------------------------------

import React from "react";

export interface HeroLandingSectionProps {
  onLaunch: () => void;
}

export function HeroLandingSection({ onLaunch }: HeroLandingSectionProps) {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black font-readex text-white select-none">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Fullscreen Looping Background Video                             */}
      {/* ------------------------------------------------------------------ */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4"
      />

      {/* Subtle Top & Bottom Vignettes for High Contrast Legibility */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/30 to-transparent z-10" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-b from-transparent via-black/60 to-black/95 z-10" />

      {/* ------------------------------------------------------------------ */}
      {/* 2. Streamlined Ultra-Glassmorphic Top Bar                          */}
      {/* ------------------------------------------------------------------ */}
      <nav className="absolute z-30 px-6 md:px-12 pt-4 top-0 left-0 right-0 flex items-center justify-between gap-4">
        {/* Left Glass Pill: Astronaut Insignia Logo & Brand Name CHIRON */}
        <div className="flex items-center gap-2.5 bg-black/45 backdrop-blur-xl border border-white/15 rounded-full pl-2 pr-5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-white/25 transition-all">
          <img
            src="/logo.jpg"
            alt="CHIRON Logo"
            className="w-7 h-7 rounded-full object-cover border border-white/30 shadow-sm"
          />
          <span className="text-white text-sm font-bold tracking-[0.22em] uppercase font-mono">
            CHIRON
          </span>
        </div>

        {/* Center Glass Pill: Single-Line Anchor Links (hidden on mobile/tablet) */}
        <div className="hidden lg:flex items-center gap-1 bg-black/45 backdrop-blur-xl border border-white/15 rounded-full px-3 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]">
          <button
            onClick={onLaunch}
            className="text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium px-3.5 py-1.5 rounded-full cursor-pointer whitespace-nowrap"
          >
            7-axis bayesian twin
          </button>
          <button
            onClick={onLaunch}
            className="text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium px-3.5 py-1.5 rounded-full cursor-pointer whitespace-nowrap"
          >
            voice & vocal dsp
          </button>
          <button
            onClick={onLaunch}
            className="text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium px-3.5 py-1.5 rounded-full cursor-pointer whitespace-nowrap"
          >
            voi active sensing
          </button>
          <button
            onClick={onLaunch}
            className="text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium px-3.5 py-1.5 rounded-full cursor-pointer whitespace-nowrap"
          >
            return-window horizon
          </button>
          <button
            onClick={onLaunch}
            className="text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium px-3.5 py-1.5 rounded-full cursor-pointer whitespace-nowrap"
          >
            break-glass vault
          </button>
        </div>

        {/* Right Glass Button: Launch Workstation */}
        <button
          onClick={onLaunch}
          className="bg-white/95 hover:bg-white text-black text-xs font-semibold rounded-full px-5 py-2 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all flex items-center gap-2 cursor-pointer shadow-lg whitespace-nowrap"
        >
          <span>enter flight deck [sys-live]</span>
        </button>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Foreground Content Wrapper (Precision Spatially Balanced)       */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative h-full w-full">
        {/* Word 1: command (Top-Left, balanced font size to prevent clipping) */}
        <h1 className="hero-title absolute text-white font-medium text-[10vw] md:text-[8.5vw] lg:text-[7.6vw] left-6 md:left-12 top-[13%] md:top-[14%] select-none pointer-events-none z-10 leading-none">
          command
        </h1>

        {/* Word 2: orbital (Center-Right, generous horizontal separation) */}
        <h1 className="hero-title absolute text-white font-medium text-[10vw] md:text-[8.5vw] lg:text-[7.6vw] right-6 md:right-16 top-[32%] md:top-[34%] select-none pointer-events-none z-10 leading-none">
          orbital
        </h1>

        {/* Word 3: space (Bottom-Center, below description & above bottom dock) */}
        <h1 className="hero-title absolute text-white font-medium text-[10vw] md:text-[8.5vw] lg:text-[7.6vw] left-[20%] md:left-[28%] lg:left-[32%] top-[51%] md:top-[53%] select-none pointer-events-none z-10 leading-none">
          space
        </h1>

        {/* Left Mission Description Paragraph & Launch CTA Button */}
        {/* Positioned directly under 'command' and safely above the bottom-left stat block */}
        <div className="absolute left-6 md:left-12 top-[29%] md:top-[31%] max-w-[320px] md:max-w-[380px] z-20 flex flex-col items-start">
          <div className="text-[11px] text-sky-400 font-mono font-medium tracking-wider uppercase mb-1.5 drop-shadow">
            zero-touch voice ai // bayesian digital twin
          </div>
          <p className="text-[13.5px] md:text-[14px] leading-relaxed text-white/90 drop-shadow-md">
            When astronauts are 240,000 miles from Earth with sparse sensors, occupied hands, and
            delayed comms, passive vital charts fail. CHIRON fuses passive vocal biomarkers, 7-axis
            Bayesian state-space forecasting, Value-of-Information exam planning, and orbital abort
            horizons into a single offline flight-surgeon OS.
          </p>
          <button
            onClick={onLaunch}
            className="mt-4 flex items-center gap-2.5 bg-white text-black text-xs md:text-sm font-medium rounded-full px-5 py-2.5 hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.45)] transition-all cursor-pointer group shadow-2xl"
          >
            <span>initialize mission dashboard</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>

        {/* Stat Block — Top-Right */}
        <div className="absolute right-6 md:right-16 top-[13%] md:top-[14%] flex flex-col items-end z-20">
          <div className="flex items-center gap-3 justify-end">
            <div className="hidden md:block h-px w-20 md:w-28 bg-white/40 rotate-[20deg]" />
            <span className="text-3xl md:text-5xl font-medium tracking-tight whitespace-nowrap">
              -64.2% CI
            </span>
          </div>
          <span className="text-xs md:text-sm text-white/70 mt-1 text-right whitespace-nowrap">
            voi uncertainty reduction (0.842 bits/min)
          </span>
          <span className="text-[10px] md:text-xs text-white/50 text-right mt-0.5 whitespace-nowrap">
            90% conformal intervals // auto-abstains on dropout
          </span>
        </div>

        {/* Stat Block — Bottom-Left (Cleanly separated from description above) */}
        <div className="absolute left-6 md:left-12 bottom-8 md:bottom-10 z-20">
          <div className="flex items-center gap-3">
            <span className="text-3xl md:text-5xl font-medium tracking-tight whitespace-nowrap">
              +34.2h
            </span>
            <div className="hidden md:block h-px w-20 md:w-28 bg-white/40 rotate-[-20deg]" />
          </div>
          <span className="text-xs md:text-sm text-white/70 mt-1 block whitespace-nowrap">
            crew-11 return-window safety margin
          </span>
          <span className="text-[10px] md:text-xs text-white/50 block mt-0.5 whitespace-nowrap">
            t_crit: 28.5h vs leo evac: 14.0h // lunar & mars profiles
          </span>
        </div>

        {/* Stat Block — Bottom-Right */}
        <div className="absolute right-6 md:right-16 bottom-8 md:bottom-10 flex flex-col items-end z-20">
          <div className="flex items-center gap-3 justify-end">
            <div className="hidden md:block h-px w-20 md:w-28 bg-white/40 rotate-[-20deg]" />
            <span className="text-2xl md:text-5xl font-medium tracking-tight whitespace-nowrap">
              nasa-std-3001
            </span>
          </div>
          <span className="text-xs md:text-sm text-white/70 mt-1 text-right whitespace-nowrap">
            hard safety veto guard & sha-256 vault
          </span>
          <span className="text-[10px] md:text-xs text-white/50 text-right mt-0.5 whitespace-nowrap">
            cmo buddy-care incapacitation mode // 100% offline edge
          </span>
        </div>
      </div>
    </section>
  );
}

export default HeroLandingSection;
