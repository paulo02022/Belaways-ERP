export const LoadingState = ({ label = 'Carregando dados' }: { label?: string }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="h-32 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={label}
      />
    ))}
  </div>
);
