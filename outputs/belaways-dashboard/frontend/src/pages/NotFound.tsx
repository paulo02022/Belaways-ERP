import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotFound = () => (
  <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950 dark:bg-zinc-950 dark:text-white">
    <div className="max-w-md text-center">
      <p className="text-sm font-medium text-brand-700 dark:text-brand-200">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal">Página não encontrada</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">O endereço acessado não corresponde a uma tela ativa do sistema.</p>
      <Link to="/dashboard" className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-glow transition hover:bg-brand-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Dashboard
      </Link>
    </div>
  </main>
);
