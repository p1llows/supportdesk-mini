import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const styles = {
  status: {
    open: 'bg-teal-100 text-teal-800 border-teal-200',
    in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    closed: 'bg-slate-200 text-slate-700 border-slate-300',
  },
  priority: {
    low: 'bg-sky-100 text-sky-800 border-sky-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    high: 'bg-orange-100 text-orange-900 border-orange-200',
  },
  role: {
    admin: 'bg-violet-100 text-violet-800 border-violet-200',
    agent: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    requester: 'bg-slate-200 text-slate-700 border-slate-300',
  },
} as const;

const labels = {
  status: { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' },
  priority: { low: 'Low', medium: 'Medium', high: 'High' },
  role: { admin: 'Administrator', agent: 'Support Agent', requester: 'Requester' },
} as const;

type BadgeCategory = keyof typeof styles;

export function SupportBadge({ category, value, className }: { category: BadgeCategory; value: string; className?: string }) {
  const normalized = value.toLowerCase().replace(/\s+/g, '_') as never;
  const categoryStyles = styles[category] as Record<string, string>;
  const categoryLabels = labels[category] as Record<string, string>;
  return <Badge className={cn(categoryStyles[normalized] ?? 'bg-slate-100 text-slate-700 border-slate-200', className)}>{categoryLabels[normalized] ?? value}</Badge>;
}
