import { AlertCircle, ArrowRight, LockKeyhole } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import logo from '@/assets/belaways-logo.png';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/use-auth';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  if (user) return <Navigate to={target} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await signIn(email, password);
      navigate(target, { replace: true });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Não foi possível autenticar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <img src={logo} alt="Belaways" className="mb-10 h-12 w-auto object-contain" />
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">Acesso interno</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Gestão operacional, estoque, pedidos, auditoria e indicadores em uma única camada.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">E-mail</span>
              <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@belaways.com.br" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Senha</span>
              <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
            </label>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Entrar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </section>

      <section className="hidden min-h-screen border-l border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:flex-col lg:justify-between">
        <div />
        <div>
          <p className="text-sm font-medium text-brand-700 dark:text-brand-200">Belaways Intelligence</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Operação diária com dados centralizados, alerta cedo e decisão rápida.
          </h2>
        </div>
      </section>
    </main>
  );
};
