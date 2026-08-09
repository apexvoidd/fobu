import React from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FormInputSection from '@/components/FormInputSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Header */}
      <Header />

      {/* Main Form Helper Area */}
      <main className="flex-grow">
        <Hero />
        <FormInputSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
