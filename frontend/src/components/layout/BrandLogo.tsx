import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8 shrink-0', className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#4F46E5" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="white" strokeOpacity="0.16" />
      {/* Layered ticket / desk mark */}
      <path
        d="M8.5 10.5C8.5 9.39543 9.39543 8.5 10.5 8.5H21.5C22.6046 8.5 23.5 9.39543 23.5 10.5V13.6C22.3954 13.6 21.5 14.4954 21.5 15.6C21.5 16.7046 22.3954 17.6 23.5 17.6V21.5C23.5 22.6046 22.6046 23.5 21.5 23.5H10.5C9.39543 23.5 8.5 22.6046 8.5 21.5V17.6C9.60457 17.6 10.5 16.7046 10.5 15.6C10.5 14.4954 9.60457 13.6 8.5 13.6V10.5Z"
        fill="white"
        fillOpacity="0.16"
        stroke="white"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M13 13.5H19M13 17.5H17"
        stroke="white"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface BrandLogoProps {
  theme?: 'dark' | 'light';
  subtitle?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function BrandLogo({
  theme = 'dark',
  subtitle,
  size = 'md',
  className,
}: BrandLogoProps) {
  const isDark = theme === 'dark';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BrandMark className={size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'} />
      <div className="leading-none">
        <span
          className={cn(
            'block font-extrabold tracking-tight',
            size === 'sm' ? 'text-sm' : 'text-[15px]',
            isDark ? 'text-white' : 'text-slate-900'
          )}
        >
          SupportDesk
        </span>
        {subtitle && (
          <span
            className={cn(
              'mt-0.5 block text-[10px] font-bold uppercase tracking-[0.16em]',
              isDark ? 'text-indigo-300/80' : 'text-slate-400'
            )}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

