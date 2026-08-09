'use client';

import React from 'react';
import { Upload, Sparkles, CheckSquare, FileText, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload or Paste Any Form',
    description: 'Take a picture with your phone, upload a PDF document, or paste a link to any official application form.',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'AI Translates Legalese',
    description: 'FormBuddy scans complex terms, fine print, and tricky instructions, rewriting them into simple everyday words.',
    color: 'from-indigo-600 to-teal-500'
  },
  {
    number: '03',
    icon: CheckSquare,
    title: 'Fill & Submit with Confidence',
    description: 'Get a clear field-by-field checklist, required supporting documents list, and error prevention tips before submitting.',
    color: 'from-teal-500 to-emerald-500'
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Simple 3-Step Process
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How FormBuddy makes complex forms easy
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Never second-guess what an official box or legal requirement means. We break down paperwork so anyone can complete it easily.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {STEPS.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <div 
                key={idx} 
                className="relative bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${step.color} text-white flex items-center justify-center shadow-md`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-slate-200 dark:text-slate-700">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>Learn more</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
