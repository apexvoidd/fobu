'use client';

import React from 'react';

export default function Hero() {
  return (
    <section className="pt-8 pb-4 text-center">
      <div className="max-w-3xl mx-auto px-4">
        
        {/* Main Tagline */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Understand any form.{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500">
            Fill it with confidence.
          </span>
        </h1>

        {/* Short Subtitle */}
        <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Upload a photo, PDF, or paste a link to convert confusing legal jargon into simple, plain English instructions.
        </p>

      </div>
    </section>
  );
}
