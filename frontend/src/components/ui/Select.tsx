import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-950',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = 'Select';
