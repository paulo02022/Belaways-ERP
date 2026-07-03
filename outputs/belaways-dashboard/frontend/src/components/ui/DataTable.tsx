import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type DataColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export const DataTable = <T extends { id: string }>({
  rows,
  columns,
  empty,
}: {
  rows: T[];
  columns: Array<DataColumn<T>>;
  empty?: string;
}) => (
  <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 text-left dark:bg-zinc-950">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                className={cn(
                  'whitespace-nowrap px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400',
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
              {columns.map((column) => (
                <td
                  key={`${row.id}-${column.header}`}
                  className={cn('px-4 py-3 text-zinc-700 dark:text-zinc-200', column.className)}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {rows.length === 0 ? (
      <div className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {empty ?? 'Nenhum registro encontrado.'}
      </div>
    ) : null}
  </div>
);
