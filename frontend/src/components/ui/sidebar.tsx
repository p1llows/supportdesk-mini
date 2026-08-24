import * as React from 'react';
import { cn } from '@/lib/utils';

export const Sidebar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <aside ref={ref} className={cn('flex h-full w-[220px] flex-col border-r border-slate-200 bg-white', className)} {...props} />
));
Sidebar.displayName = 'Sidebar';
