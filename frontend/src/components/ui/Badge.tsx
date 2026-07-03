import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type BadgeTone = 'neutral' | 'green' | 'amber' | 'red' | 'purple' | 'blue';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  purple: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200',
  blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
};

export const Badge = ({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) => (
  <span
    className={cn(
      'inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
      tones[tone],
      className,
    )}
    {...props}
  />
);
