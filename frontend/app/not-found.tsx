"use client";

import Link from 'next/link';
import { BRAND } from './constants/brand';

export default function NotFound() {
    return (
        <div className="h-screen w-full bg-white overflow-hidden flex flex-col font-sans">
            {/* Header / Logo */}
            <div className="w-full px-6 py-6 md:px-12">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-[var(--brand)] flex items-center justify-center overflow-hidden shrink-0">
                        {BRAND.logoImage ? (
                            <img src={BRAND.logoImage} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white font-black text-xs">{BRAND.logoText}</span>
                        )}
                    </div>
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">
                        {BRAND.name}
                        <span className="text-[var(--brand)]">{BRAND.suffix}</span>
                    </span>
                </div>
            </div>

            <div className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 flex items-center">
                <div className="w-full grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                    {/* Left Column: Text & CTA */}
                    <div className="order-2 lg:order-1 space-y-8">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-wide mb-6">
                                <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
                                404 Error
                            </div>
                            <h1 className="text-6xl lg:text-8xl font-black text-slate-900 tracking-tighter mb-6">
                                page not <br /> found.
                            </h1>
                            <p className="text-lg text-slate-500 font-medium max-w-md leading-relaxed">
                                We can't find the page you're looking for. It might have been moved, renamed, or doesn't exist.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <Link
                                href="/"
                                className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                Back to Home
                            </Link>
                            <button
                                onClick={() => window.history.back()}
                                className="px-8 py-4 bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 font-bold rounded-2xl transition-all hover:bg-slate-50 active:scale-95"
                            >
                                Go Back Previous
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Illustration */}
                    <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
                        <div className="relative w-full max-w-md aspect-square">
                            {/* Premium Isometric Illustration */}
                            <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
                                <defs>
                                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" style={{ stopColor: '#4F46E5', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#818CF8', stopOpacity: 1 }} />
                                    </linearGradient>
                                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="15" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>

                                {/* Background Elements - Subtle Particles */}
                                <circle cx="50" cy="100" r="4" fill="#CBD5E1" opacity="0.6" />
                                <circle cx="450" cy="80" r="6" fill="#CBD5E1" opacity="0.4" />
                                <circle cx="400" cy="400" r="8" fill="#CBD5E1" opacity="0.3" />
                                <circle cx="80" cy="380" r="5" fill="#CBD5E1" opacity="0.5" />

                                {/* Floating Platform */}
                                <g transform="translate(100, 320)">
                                    <path d="M150 50 L300 0 L150 -50 L0 0 Z" fill="#E2E8F0" />
                                    <path d="M0 0 L150 50 V80 L0 30 Z" fill="#CBD5E1" />
                                    <path d="M300 0 L150 50 V80 L300 30 Z" fill="#94A3B8" />
                                </g>

                                {/* Isometric 4 (Left) */}
                                <g transform="translate(60, 160)">
                                    <path d="M40 0 L80 20 V120 L40 100 Z" fill="#4338CA" />
                                    <path d="M0 60 L40 40 L80 60 L40 80 Z" fill="#6366F1" />
                                    <path d="M0 60 L40 80 V180 L0 160 Z" fill="#4F46E5" />
                                    <path d="M40 80 L80 60 V160 L40 180 Z" fill="#4338CA" />
                                </g>

                                {/* Isometric 0 (Center - Broken/Missing Block) */}
                                <g transform="translate(190, 120)">
                                    {/* Bottom Block */}
                                    <path d="M60 140 L120 120 L60 100 L0 120 Z" fill="#64748B" />
                                    <path d="M0 120 L60 140 V180 L0 160 Z" fill="#475569" />
                                    <path d="M120 120 L60 140 V180 L120 160 Z" fill="#334155" />

                                    {/* Floating Top Block (The 'Zero' Void) */}
                                    <g transform="translate(0, -40)">
                                        <path d="M60 40 L120 20 L60 0 L0 20 Z" fill="#F97316" />
                                        <path d="M0 20 L60 40 V100 L0 80 Z" fill="#EA580C" />
                                        <path d="M120 20 L60 40 V100 L120 80 Z" fill="#C2410C" />
                                        {/* Code Symbol on face */}
                                        <path d="M30 50 L45 60 L30 70 M90 50 L75 60 L90 70" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.8" />
                                    </g>

                                    {/* Disconnected Cable */}
                                    <path d="M60 160 C 60 200, 120 200, 160 220" stroke="#CBD5E1" strokeWidth="4" strokeDasharray="8 8" fill="none" />
                                </g>

                                {/* Isometric 4 (Right) */}
                                <g transform="translate(340, 180)">
                                    <path d="M40 0 L80 20 V120 L40 100 Z" fill="#4338CA" />
                                    <path d="M0 60 L40 40 L80 60 L40 80 Z" fill="#6366F1" />
                                    <path d="M0 60 L40 80 V180 L0 160 Z" fill="#4F46E5" />
                                    <path d="M40 80 L80 60 V160 L40 180 Z" fill="#4338CA" />
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Copyright */}
            <div className="absolute bottom-6 w-full text-center">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest opacity-60">{BRAND.name} {BRAND.suffix} © {new Date().getFullYear()}</p>
            </div>
        </div>
    );
}
