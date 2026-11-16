import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/layout/BrandLogo';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F7F6F2] px-4 py-10 sm:px-6">
      {/* Subtle architectural dot texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#D6D3CB 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <main className="animate-sd-auth relative z-10 w-full max-w-[420px]">
        <div className="mb-6 flex justify-center">
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
