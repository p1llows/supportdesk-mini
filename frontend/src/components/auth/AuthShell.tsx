import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/layout/BrandLogo';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F7F6F2] px-4 py-10 sm:px-6">
      {/* Ambient drifting teal radial orbs */}
      <div
        className="animate-sd-drift pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.18) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="animate-sd-drift-reverse pointer-events-none absolute -right-24 -bottom-32 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.16) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Subtle architectural dot texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#D6D3CB 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <main className="animate-sd-auth relative z-10 w-full max-w-[420px]">
        <div className="relative mb-6 flex justify-center">
          <div
            className="animate-sd-breathe pointer-events-none absolute -inset-x-6 -inset-y-3 rounded-full opacity-50 blur-2xl"
            style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.14) 0%, transparent 70%)' }}
            aria-hidden="true"
          />
          <BrandLogo theme="light" subtitle="Internal Help Desk" size="lg" />
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E5E2DA] bg-white shadow-[0_2px_8px_rgba(28,25,23,0.04)]">
          <div className="h-1 w-full bg-[#0F766E]" />
          <div className="p-7 sm:p-8">{children}</div>
        </div>

        <footer className="mt-6 text-center text-xs text-stone-400">
          SupportDesk Mini · Internal IT Support System
        </footer>
      </main>
    </div>
  );
}
