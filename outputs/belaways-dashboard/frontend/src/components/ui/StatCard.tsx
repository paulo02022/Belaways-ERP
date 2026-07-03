import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn, formatNumber } from '@/lib/utils';

type StatCardProps = {
  title: string;
  value: number | string;
  icon: LucideIcon;
  tone?: 'purple' | 'green' | 'amber' | 'red' | 'blue';
  helper?: ReactNode;
};

const tones = {
  purple: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
};

export const StatCard = ({ title, value, icon: Icon, tone = 'purple', helper }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="rounded-lg border border-zinc-200 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-900"
  >
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
      </div>
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', tones[tone])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
    </div>
    {helper ? <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">{helper}</div> : null}
  </motion.div>
);
