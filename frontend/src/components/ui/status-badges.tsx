import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const styles = {
  status: {
    open: 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20',
    in_progress: 'bg-amber-50 text-amber-800 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    closed: 'bg-stone-100 text-stone-500 border-stone-200',
  },
  priority: {
    low: 'bg-stone-100 text-stone-600 border-stone-200',
    medium: 'bg-[#F7F6F2] text-stone-700 border-[#E5E2DA]',
    high: 'bg-red-50 text-red-700 border-red-200',
  },
  role: {
    admin: 'bg-stone-900 text-white border-stone-900',
    agent: 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20',
    requester: 'bg-stone-100 text-stone-700 border-stone-200',
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
