'use client';

import React from 'react';
import { Lock, EyeOff, Trash2, ShieldCheck, Check } from 'lucide-react';

export default function PrivacySecurity() {
  return (
    <section id="privacy" className="py-16 sm:py-24 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-6">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Privacy-First Guarantee</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Your personal information stays 100% private & secure
            </h2>

            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              We know official forms often contain sensitive details like Social Security Numbers, addresses, and tax IDs. FormBuddy is engineered from the ground up with strict privacy controls.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <EyeOff className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-white">PII Redaction</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Sensitive personal info is automatically masked before any processing.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-white">End-to-End Encryption</h3>
                <p className="text-xs text-slate-300 mt-1">
                  All uploaded documents are encrypted in transit with SSL/TLS 256-bit protocol.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-white">Zero File Retention</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Uploaded files are processed in memory and permanently deleted immediately after analysis.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> No account required to analyze</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Never used for AI model training</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
