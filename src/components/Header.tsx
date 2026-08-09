'use client';

import React from 'react';
import { FileText, ShieldCheck, Sparkles } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 text-white shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              Form<span className="text-blue-600 dark:text-blue-400">Buddy</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
              <Sparkles className="w-3 h-3 mr-1 text-blue-500" />
              AI Helper
            </span>
          </div>

          {/* Privacy Security Pill */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-200/80 dark:border-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>100% Private & Secure</span>
          </div>
        </div>
      </div>
    </header>
  );
}
