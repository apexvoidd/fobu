import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FormBuddy | Understand Any Form. Fill It With Confidence.",
  description: "AI-powered tool that translates confusing government, tax, DMV, and official forms into simple, plain language instructions.",
  keywords: ["government forms", "form helper", "plain english forms", "IRS form helper", "DMV application assistant"],
  openGraph: {
    title: "FormBuddy | Understand Any Form. Fill It With Confidence.",
    description: "AI-powered tool that translates confusing government and official forms into simple language.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
