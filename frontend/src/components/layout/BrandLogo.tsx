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
      className={cn('h-7 w-7 shrink-0', className)}
      aria-hidden="true"
    >
      {/* Interlocking geometric ribbons forming an abstract "S" desk mark */}
      <path
        d="M9 6.5H24.5L20.5 13H12.5L9.5 17.5L5.5 11.5C4.8 10.4 5.6 6.5 9 6.5Z"
        fill="#0F766E"
      />
      <path
        d="M23 25.5H7.5L11.5 19H19.5L22.5 14.5L26.5 20.5C27.2 21.6 26.4 25.5 23 25.5Z"
        fill="#1C1917"
      />
      <path
        d="M12.5 13H20.5L19.5 19H11.5L12.5 13Z"
        fill="#14B8A6"
      />
    </svg>
  );
}

interface BrandLogoProps {
  theme?: 'dark' | 'light';
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BrandLogo({
  theme = 'light',
  subtitle,
  size = 'md',
  className,
}: BrandLogoProps) {
  const isDark = theme === 'dark';

  const markSize = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const titleSize = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base';
  const subtitleSize = size === 'lg' ? 'text-[11px]' : 'text-[10px]';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandMark className={markSize} />
      <div className="leading-none">
        <span
          className={cn(
            'block font-bold tracking-[-0.02em]',
            titleSize,
            isDark ? 'text-white' : 'text-stone-900'
          )}
        >
          SupportDesk
        </span>
        {subtitle && (
          <span
            className={cn(
              'mt-0.5 block font-semibold uppercase tracking-[0.14em]',
              subtitleSize,
              isDark ? 'text-stone-400' : 'text-[#0F766E]'
            )}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
