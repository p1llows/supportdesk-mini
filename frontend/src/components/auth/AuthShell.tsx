import type { ReactNode } from 'react';
import { Bell, LifeBuoy, Ticket, UsersRound } from 'lucide-react';

const features = [
  {
    icon: Ticket,
    title: 'Submit & track tickets',
    description: 'Report issues in seconds and follow every update through to resolution.',
  },
  {
    icon: UsersRound,
    title: 'Department-scoped queues',
    description: 'Your request is routed straight to the support agents who can fix it.',
  },
  {
    icon: Bell,
    title: 'Stay in the loop',
    description: 'Get notified the moment your ticket status changes or someone replies.',
  },
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Branded panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-slate-950 lg:flex lg:flex-col xl:w-[55%]">
        {/* Decorative gradient accents */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3 px-12 py-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-white">SupportDesk</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mini</p>
          </div>
        </div>

        {/* Headline + features */}
        <div className="relative z-10 my-auto max-w-md px-12">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
            Support that keeps
            <br />
            your team moving.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            The internal help desk for reporting IT issues, tracking requests, and
            collaborating with your support team.
          </p>

          <ul className="mt-10 space-y-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                  <Icon className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 px-12 py-8 text-[11px] text-slate-600">
          Internal IT Support Ticket Management System
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile brand header */}
        <div className="flex items-center gap-2 px-6 pt-6 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white">
            <LifeBuoy className="h-4 w-4" />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-slate-900">SupportDesk Mini</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
