import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-950',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
