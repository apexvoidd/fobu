'use client';

import React from 'react';
import { 
  BookOpenCheck, 
  AlertTriangle, 
  Paperclip, 
  Globe2, 
  Printer, 
  ShieldAlert 
} from 'lucide-react';

const FEATURES = [
  {
    icon: BookOpenCheck,
    title: 'Plain-English Field Guide',
    desc: 'Hover over or click any field to see what it asks for in simple words without technical terms.'
  },
  {
    icon: Paperclip,
    title: 'Document Checklist',
    desc: 'Automatically generates a custom list of attachments you need (W-2s, IDs, proof of residency, etc.).'
  },
  {
    icon: AlertTriangle,
    title: 'Common Mistake Warnings',
    desc: 'Highlights boxes where people frequently make errors that cause rejections or delays.'
  },
  {
    icon: Globe2,
    title: 'Multi-Language Explanations',
    desc: 'Read explanation guides in Spanish, Vietnamese, Chinese, French, Tagalog, and more.'
  },
  {
    icon: Printer,
    title: 'Printable Step-by-Step Guide',
    desc: 'Export a neat summary guide to keep beside you while filling out paper forms.'
  },
  {
    icon: ShieldAlert,
    title: 'Scam & Fee Detection',
    desc: 'Warns you if a form is asking for unusual payments or non-official submission addresses.'
  }
];

export default function Features() {
  return (
    <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            Built for peace of mind
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Everything you need to complete forms error-free
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            FormBuddy does not just read forms—it empowers you to fill them out correctly the first time.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
