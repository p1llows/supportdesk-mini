import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/layout/BrandLogo';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#F7F6F2] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-[400px] justify-center pt-4">
        <BrandLogo theme="light" subtitle="Internal Help Desk" />
      </div>

      <main className="mx-auto my-auto w-full max-w-[400px] py-8">
        <div className="rounded-xl border border-[#E5E2DA] bg-white p-7 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-8">
          {children}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[400px] pb-2 text-center text-xs text-stone-400">
        SupportDesk Mini · Internal IT Support System
      </footer>
    </div>
  );
}
