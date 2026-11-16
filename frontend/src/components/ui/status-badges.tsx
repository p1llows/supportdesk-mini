import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const styles = {
  status: {
    open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    resolved: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    closed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  },
  priority: {
    low: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-red-50 text-red-700 border-red-200',
  },
  role: {
    admin: 'bg-zinc-900 text-white border-zinc-900',
    agent: 'bg-blue-50 text-blue-700 border-blue-200',
    requester: 'bg-zinc-100 text-zinc-700 border-zinc-200',
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
  return (
    <Badge
      className={cn(
        'rounded-full font-medium',
        categoryStyles[normalized] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200',
        className
      )}
    >
      {categoryLabels[normalized] ?? value}
    </Badge>
  );
}
