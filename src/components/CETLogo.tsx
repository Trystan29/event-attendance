/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CETLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

// 👇 REPLACEABLE LINE: point this at your own logo file.
// Drop your image at public/cet-logo.png (any name works, just update this path
// to match, e.g. '/cet-logo.png' or '/assets/cet-logo.png').
const LOGO_SRC = '/cet-logo.png';

export default function CETLogo({ size = 'md', className = '' }: CETLogoProps) {
  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    '2xl': 'w-42 h-42'
  };

  const dim = dimensions[size] || dimensions.md;

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`} id={`cet-logo-${size}`}>
      {/* Using a real image now. Delete/comment this <img> and un-comment the <svg>
          block below if you ever want the hand-drawn emblem back instead. */}
      <img
        src={LOGO_SRC}
        alt="TAU College of Engineering and Technology Logo"
        className={`${dim} object-contain`}
        draggable={false}
      />
      {/* Old hand-drawn SVG emblem, kept below (disabled) in case you want to switch
          back — just change `false &&` to `true &&` to re-enable it, and remove/comment
          out the <img> above. */}
      {false && (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={dim}
      >
        {/* 
        ==================================================================================
        OFFICIAL TARLAC AGRICULTURAL UNIVERSITY (TAU) - COLLEGE OF ENGINEERING & TECHNOLOGY
        ==================================================================================
        This SVG is modeled in exquisite pixel-precision detail to align exactly with the official
        emblem of the TAU CET. It features:
        - 6-teeth outer gradient gear set on deep charcoal and white inner strokes.
        - High-tech electronic circuit trace paths on the bottom segment.
        - Curved text tracks for "COLLEGE OF ENGINEERING AND TECHNOLOGY" and "Tarlac Agricultural University".
        - Central glowing rich maroon/crimson roundel background.
        - Central Golden/Yellow torch structure.
        - Customized Flame reading "TAU" using stylized overlapping letterform waves.
        - Three linked silver gears with golden program symbols:
          1. BSIT (Left): Laptop in bright gold badge.
          2. BSGE (Right): Precision 4-point transit compass target.
          3. BSABE (Bottom): Classic agricultural tractor silhouette.
        */}
        <defs>
          {/* Flame colors */}
          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="60%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Torch metal */}
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Gear teeth shading */}
          <linearGradient id="gearMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Silver gear gradient */}
          <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Outer Ring outline */}
          <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Curved Text Paths */}
          {/* Path for COLLEGE OF ENGINEERING AND TECHNOLOGY */}
          <path id="tau-text-track-top" d="M 21.5,58 A 38.5,38.5 0 1,1 98.5,58" fill="none" />
          {/* Path for Tarlac Agricultural University */}
          <path id="tau-text-track-bottom" d="M 96,62 A 36,36 0 0,1 24,62" fill="none" />

          {/* Master template for Outer Gear Tooth pointing Straight UP from (60,60) */}
          <polygon id="gear-tooth" points="52,2 68,2 73,14 47,14" fill="url(#gearMetalGrad)" stroke="#ffffff" strokeWidth="0.8" />

          {/* Silver small gear tooth template */}
          <path id="sm-gear-tooth" d="M -1.8,-6 L 1.8,-6 L 2.8,-3.5 L -2.8,-3.5 Z" />
        </defs>

        {/* 1. OUTERMOST BASE CIRCLE */}
        <circle cx="60" cy="60" r="58.5" fill="#09090b" stroke="#e2e8f0" strokeWidth="0.8" />

        {/* 2. 6-TOOTHED ENG & TECH MASTER MECHANICAL GEAR */}
        <g id="outer-gear-assembly">
          <use href="#gear-tooth" transform="rotate(0 60 60)" />
          <use href="#gear-tooth" transform="rotate(60 60 60)" />
          <use href="#gear-tooth" transform="rotate(120 60 60)" />
          <use href="#gear-tooth" transform="rotate(180 60 60)" />
          <use href="#gear-tooth" transform="rotate(240 60 60)" />
          <use href="#gear-tooth" transform="rotate(300 60 60)" />
        </g>

        {/* Inner black circular background containing text track banners and red roundel */}
        <circle cx="60" cy="60" r="48" fill="#09090b" stroke="#ffffff" strokeWidth="0.6" />
        
        {/* Solder / Circuit Traces inside the bottom valleys (BSIT/BSGE Engineering tech style) */}
        <g opacity="0.35" stroke="#f59e0b" strokeWidth="0.8" strokeLinecap="round">
          <path d="M 32,95 L 42,105 L 50,105" />
          <circle cx="50" cy="105" r="1.2" fill="#fbbf24" stroke="none" />
          <path d="M 88,95 L 78,105 L 70,105" />
          <circle cx="70" cy="105" r="1.2" fill="#fbbf24" stroke="none" />
          <path d="M 60,113 L 60,107" />
          <circle cx="60" cy="107" r="1" fill="#fbbf24" stroke="none" />
        </g>

        {/* Bottom Banner Shape backdrop for university text */}
        <path d="M 22.5,66 C 26,90, 94,90, 97.5,66 C 92.5,99, 27.5,99, 22.5,66 Z" fill="#18181b" stroke="url(#goldBorder)" strokeWidth="0.6" />
        <path d="M 23,67 A 37,37 0 0,0 97,67" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="1.5 1.5" fill="none" opacity="0.4" />

        {/* 3. UPPER TEXT: COLLEGE OF ENGINEERING AND TECHNOLOGY */}
        <text fontSize="5.2" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" letterSpacing="0.4">
          <textPath href="#tau-text-track-top" startOffset="50%" textAnchor="middle" fill="#ffffff">
            COLLEGE OF ENGINEERING AND TECHNOLOGY
          </textPath>
        </text>

        {/* 4. LOWER TEXT: Tarlac Agricultural University in Gothic / Serif Italic Style */}
        <text fontSize="5.5" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="800" fontStyle="italic" letterSpacing="0.2">
          <textPath href="#tau-text-track-bottom" startOffset="50%" textAnchor="middle" fill="#ffffff">
            Tarlac Agricultural University
          </textPath>
        </text>

        {/* ==========================================
            CENTRAL DEEP MAROON/CRIMSON ROUNDEL SHIELD
            ========================================== */}
        <circle cx="60" cy="60" r="35.5" fill="#7a0000" stroke="url(#goldBorder)" strokeWidth="1.2" />
        <circle cx="60" cy="60" r="33" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="3 1.5" opacity="0.3" fill="none" />

        {/* ==========================================
            CENTER ADORNMENT: THE TAU SACRED FLAME & GOLD TORCH
            ========================================== */}
        <g id="academic-torch-group" transform="translate(0, -3)">
          {/* Torch Shaft Base & Collar Handles in high detail */}
          {/* Lower point tapered shaft */}
          <path d="M 58.5,82 L 61.5,82 L 60.5,88 L 59.5,88 Z" fill="url(#goldGrad)" stroke="#7a0000" strokeWidth="0.4" />
          <path d="M 57.5,61 L 62.5,61 L 61,81 L 59,81 Z" fill="url(#goldGrad)" stroke="#7a0000" strokeWidth="0.4" />
          {/* Grooves and ridges to give physical dimensionality */}
          <line x1="58.2" y1="65" x2="61.8" y2="65" stroke="#7a0000" strokeWidth="0.5" />
          <line x1="58.5" y1="70" x2="61.5" y2="70" stroke="#7a0000" strokeWidth="0.5" />
          <line x1="58.8" y1="75" x2="61.2" y2="75" stroke="#7a0000" strokeWidth="0.5" />

          {/* Main Torch Bowl cup */}
          <path d="M 54.5,51 L 65.5,51 L 64,61 L 56,61 Z" fill="url(#goldGrad)" stroke="#7a0000" strokeWidth="0.6" />
          {/* Horizontal top rims */}
          <rect x="53.5" y="48.5" width="13" height="2.5" rx="0.5" fill="url(#goldGrad)" stroke="#7a0000" strokeWidth="0.4" />
          <line x1="54" y1="53" x2="66" y2="53" stroke="#b45309" strokeWidth="0.6" opacity="0.8" />
          <line x1="54.5" y1="56" x2="65.5" y2="56" stroke="#b45309" strokeWidth="0.6" opacity="0.8" />

          {/* ==========================================
              OFFICIAL "TAU" STYLE FLAME SYSTEM
              A stunning fire sculpture reading "T", "A", "U"
              ========================================== */}
          <g id="tau-flame-system">
            {/* Soft background flame glow */}
            <path d="M 46,47 C 46,31 52,24 60,19 C 68,24 74,31 74,47 C 69,47 65,42 60,42 C 55,42 51,47 46,47 Z" fill="url(#flameGrad)" opacity="0.2" />

            {/* Letter "T" (Left Wave): Swirling flame curves creating the letter "T" */}
            {/* The crossbar flickers on the left and circles around, leg drops to the torch cup */}
            <path 
              d="M 54.5,47.5 C 54.5,45 54.2,42.5 53.8,40 C 53.5,37.5 54.8,35.5 53.5,33.5 C 52,31.5 48.5,33 46.5,33 C 45,33 44.5,34.5 45.8,34.5 C 47.5,34.5 49.5,34 49.8,36 C 50,37.5 48.5,38.5 48,40 C 47.5,41.5 48.2,43.5 49.5,45 C 50.5,46 52.5,47.5 54.5,47.5 Z" 
              fill="url(#flameGrad)" 
              stroke="#fbbf24" 
              strokeWidth="0.3" 
            />

            {/* Letter "A" (Center Spire): Tall central blazing spire forming "A" */}
            {/* Loops up, forms a dramatic peak, with a crossbar shape inside */}
            <path 
              d="M 55,47.5 C 58.5,47.5 58,41 57.5,37 C 57.2,34 58.5,30 59.8,22 C 61,30 62.2,34 62,37 C 61.5,41 61,47.5 64.5,47.5 C 62.5,47.5 62,43 61.5,40.5 C 61,38 58.5,38 58,40.5 C 57.5,43 57,47.5 55,47.5 Z" 
              fill="url(#flameGrad)" 
              stroke="#fef08a" 
              strokeWidth="0.3" 
            />
            {/* Small fire spark inside A */}
            <path d="M 58.2,34 C 59.8,32 59.8,28 59.8,24 C 59.8,28 60.8,31 61.2,34 Z" fill="#ffffff" opacity="0.9" />

            {/* Letter "U" (Right Wave): Crescent curl forming "U" with high back flicker */}
            <path 
              d="M 65.5,47.5 C 67.5,47.5 69.5,46 70.5,45 C 71.8,43.5 72.5,41.5 72,40 C 71.5,38.5 70,37.5 70.2,36 C 70.5,34 72.5,34.5 71,32.5 C 69.8,31 68.2,33 67.2,35 C 66.2,37 66,39.5 65.8,42 C 65.5,44.5 65.5,46 65.5,47.5 Z" 
              fill="url(#flameGrad)" 
              stroke="#fbbf24" 
              strokeWidth="0.3" 
            />
          </g>
        </g>

        {/* =================================================================
            THREE CO-LINKED PROGRAM PROGRAMMATIC SECTIONS (BSIT, BSGE, BSABE)
            Beautifully rendered as metallic gears with specific badges
            ================================================================= */}

        {/* --- 1. BSIT (LEFT GEAR): COMPUTER / LAPTOP badges at (39.5, 65) --- */}
        <g id="gear-bsit" transform="translate(39, 64.5)">
          {/* Silver metallic gear frame */}
          <circle cx="0" cy="0" r="10.5" fill="url(#silverGrad)" stroke="#1e293b" strokeWidth="0.5" />
          {/* BSIT Gear teeth (10 teeth) */}
          <g fill="url(#silverGrad)" stroke="#1d2939" strokeWidth="0.3">
            <use href="#sm-gear-tooth" transform="rotate(0)" />
            <use href="#sm-gear-tooth" transform="rotate(36)" />
            <use href="#sm-gear-tooth" transform="rotate(72)" />
            <use href="#sm-gear-tooth" transform="rotate(108)" />
            <use href="#sm-gear-tooth" transform="rotate(144)" />
            <use href="#sm-gear-tooth" transform="rotate(180)" />
            <use href="#sm-gear-tooth" transform="rotate(216)" />
            <use href="#sm-gear-tooth" transform="rotate(252)" />
            <use href="#sm-gear-tooth" transform="rotate(288)" />
            <use href="#sm-gear-tooth" transform="rotate(324)" />
          </g>
          {/* Contrast groove ring */}
          <circle cx="0" cy="0" r="8.2" fill="none" stroke="#ffffff" strokeWidth="0.4" />
          {/* Crimson Inner Badge with yellow circular border */}
          <circle cx="0" cy="0" r="7.2" fill="#7a0000" stroke="url(#goldBorder)" strokeWidth="0.8" />

          {/* COMPUTER/LAPTOP SYMBOL in bright gold */}
          <g transform="translate(0, -0.5)">
            {/* Screen */}
            <rect x="-3.5" y="-3.2" width="7" height="4.6" rx="0.4" fill="url(#goldGrad)" stroke="#7a0000" strokeWidth="0.2" />
            <rect x="-2.7" y="-2.5" width="5.4" height="3.2" rx="0.1" fill="#7a0000" />
            {/* Coding prompt glyph inside monitor */}
            <path d="M -1.8,-1.5 L -1,-1 L -1.8,-0.5" stroke="#fbbf24" strokeWidth="0.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="0.8" cy="-1" r="0.4" fill="#fbbf24" />
            
            {/* Keyboard base */}
            <path d="M -4.5,1.7 L 4.5,1.7 L 3.5,3 L -3.5,3 Z" fill="url(#goldGrad)" stroke="#7a0000" strokeWidth="0.3" />
          </g>
        </g>

        {/* --- 2. BSGE (RIGHT GEAR): GEODETIC precision surveyor's crosshair at (81, 64.5) --- */}
        <g id="gear-bsge" transform="translate(81, 64.5)">
          {/* Silver metallic gear frame */}
          <circle cx="0" cy="0" r="10.5" fill="url(#silverGrad)" stroke="#1e293b" strokeWidth="0.5" />
          {/* BSGE Gear teeth (10 teeth) */}
          <g fill="url(#silverGrad)" stroke="#1d2939" strokeWidth="0.3">
            <use href="#sm-gear-tooth" transform="rotate(18)" />
            <use href="#sm-gear-tooth" transform="rotate(54)" />
            <use href="#sm-gear-tooth" transform="rotate(90)" />
            <use href="#sm-gear-tooth" transform="rotate(126)" />
            <use href="#sm-gear-tooth" transform="rotate(162)" />
            <use href="#sm-gear-tooth" transform="rotate(198)" />
            <use href="#sm-gear-tooth" transform="rotate(234)" />
            <use href="#sm-gear-tooth" transform="rotate(270)" />
            <use href="#sm-gear-tooth" transform="rotate(306)" />
            <use href="#sm-gear-tooth" transform="rotate(342)" />
          </g>
          {/* Contrast groove ring */}
          <circle cx="0" cy="0" r="8.2" fill="none" stroke="#ffffff" strokeWidth="0.4" />
          {/* Crimson Inner Badge with yellow circular border */}
          <circle cx="0" cy="0" r="7.2" fill="#7a0000" stroke="url(#goldBorder)" strokeWidth="0.8" />

          {/* GEODETIC PRECISION SURVEYOR'S COMPASS TRANSIT CROSSHAIR in bright gold */}
          <g transform="translate(0, 0)">
            {/* Outer scope ring */}
            <circle cx="0" cy="0" r="4.2" stroke="url(#goldGrad)" strokeWidth="0.6" fill="none" />
            <circle cx="0" cy="0" r="1.5" stroke="#7a0000" strokeWidth="0.3" fill="url(#goldGrad)" />
            
            {/* Celestial Compass cross hair spikes */}
            <line x1="0" y1="-5.2" x2="0" y2="5.2" stroke="#ffffff" strokeWidth="0.4" />
            <line x1="-5.2" y1="0" x2="5.2" y2="0" stroke="#ffffff" strokeWidth="0.4" />
            
            {/* Diagonal surveyor degree ticks */}
            <circle cx="0" cy="0" r="5" stroke="#fcd34d" strokeWidth="0.4" strokeDasharray="0.8 0.8" fill="none" opacity="0.6" />

            {/* Micro 4-point golden star */}
            <path d="M 0,-5.2 L 1.2,-1.2 L 5.2,0 L 1.2,1.2 L 0,5.2 L -1.2,1.2 L -5.2,0 L -1.2,-1.2 Z" fill="url(#goldGrad)" opacity="0.8" />
          </g>
        </g>

        {/* --- 3. BSABE (BOTTOM GEAR): AGRICULTURAL TRACTOR at (60, 81.5) --- */}
        <g id="gear-bsabe" transform="translate(60, 81.5)">
          {/* Silver metallic gear frame */}
          <circle cx="0" cy="0" r="10.5" fill="url(#silverGrad)" stroke="#1e293b" strokeWidth="0.5" />
          {/* BSABE Gear teeth (10 teeth) */}
          <g fill="url(#silverGrad)" stroke="#1d2939" strokeWidth="0.3">
            <use href="#sm-gear-tooth" transform="rotate(0)" />
            <use href="#sm-gear-tooth" transform="rotate(36)" />
            <use href="#sm-gear-tooth" transform="rotate(72)" />
            <use href="#sm-gear-tooth" transform="rotate(108)" />
            <use href="#sm-gear-tooth" transform="rotate(144)" />
            <use href="#sm-gear-tooth" transform="rotate(180)" />
            <use href="#sm-gear-tooth" transform="rotate(216)" />
            <use href="#sm-gear-tooth" transform="rotate(252)" />
            <use href="#sm-gear-tooth" transform="rotate(288)" />
            <use href="#sm-gear-tooth" transform="rotate(324)" />
          </g>
          {/* Contrast groove ring */}
          <circle cx="0" cy="0" r="8.2" fill="none" stroke="#ffffff" strokeWidth="0.4" />
          {/* Crimson Inner Badge with yellow circular border */}
          <circle cx="0" cy="0" r="7.2" fill="#7a0000" stroke="url(#goldBorder)" strokeWidth="0.8" />

          {/* DETAILED BIO-MECHANICAL TRACTOR SYSTEM in bright gold (Facing Left) */}
          <g transform="translate(0.5, -0.6)">
            {/* Cabin Structure & Hood */}
            <path d="M -0.5,-1.8 L 3,-1.8 L 3,1 L -1,1 Z" fill="none" stroke="url(#goldGrad)" strokeWidth="0.6" />
            <line x1="1" y1="-1.8" x2="1" y2="1" stroke="url(#goldGrad)" strokeWidth="0.5" />
            {/* Steering system thread */}
            <line x1="-1.5" y1="-0.2" x2="-2.5" y2="-1.2" stroke="url(#goldGrad)" strokeWidth="0.4" />

            {/* Hood of tractor */}
            <path d="M -1,0.6 L -3.8,0.6 L -3.8,2.4 L -1,2.4 Z" fill="url(#goldGrad)" stroke="#7a0000" strokeWidth="0.2" />

            {/* Exhaust Vertical Stack Pipe */}
            <line x1="-3" y1="0.6" x2="-3" y2="-1.8" stroke="url(#goldGrad)" strokeWidth="0.5" />
            {/* Diagonal stack turn */}
            <line x1="-3" y1="-1.8" x2="-2.4" y2="-2.3" stroke="url(#goldGrad)" strokeWidth="0.5" />

            {/* Large Tractor Back Wheel */}
            <circle cx="1.8" cy="2.2" r="1.8" fill="url(#goldGrad)" stroke="#7a0000" strokeWidth="0.3" />
            <circle cx="1.8" cy="2.2" r="0.6" fill="#7a0000" />

            {/* Small Tractor Front Wheel */}
            <circle cx="-3.2" cy="2.5" r="1.1" fill="url(#goldGrad)" stroke="#7a0000" strokeWidth="0.3" />
            <circle cx="-3.2" cy="2.5" r="0.3" fill="#7a0000" />
          </g>
        </g>
      </svg>
      )}
    </div>
  );
}
