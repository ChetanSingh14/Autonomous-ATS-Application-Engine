import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoApply Engine - Autonomous ATS Control Center',
  description: 'Zero-cost, truth-constrained automated job application pipeline dashboard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased" suppressHydrationWarning>
        <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6">
              <Link href="/" className="flex items-center gap-1.5 font-extrabold text-sm sm:text-lg text-white tracking-tight shrink-0">
                <span className="text-sky-400">⚡ AutoApply</span>
                <span className="text-slate-300 text-xs sm:text-base font-normal">Control Center</span>
              </Link>
              <nav className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-400">
                <Link href="/" className="hover:text-slate-100 transition-colors">
                  Dashboard
                </Link>
                <Link href="/profile" className="hover:text-slate-100 transition-colors whitespace-nowrap">
                  Master Profile
                </Link>
              </nav>
            </div>

            <div className="flex items-center justify-end">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                MV3 Extension Connected
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          {children}
        </main>

        <footer className="border-t border-slate-800/80 text-center py-4 text-xs text-slate-500">
          Autonomous ATS Application Engine &bull; Truth-Constrained AI Pipeline
        </footer>
      </body>
    </html>
  );
}
