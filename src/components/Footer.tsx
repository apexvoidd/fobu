'use client';

import React from 'react';
import { FileText, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800 text-xs py-6">
      <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">FormBuddy</span>
          <span>• Plain English Form Helper</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>FormBuddy provides AI assistance and is not a government agency.</span>
        </div>
      </div>
    </footer>
  );
}
