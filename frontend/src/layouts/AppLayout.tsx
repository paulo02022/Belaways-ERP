import { LogOut, Menu, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import logo from '@/assets/belaways-logo.png';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { navigation } from '@/constants/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useCatalogLive } from '@/hooks/use-catalog-live';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
  );

const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
  <aside className="flex h-full flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
    <div className="flex h-16 items-center gap-3 border-b border-zinc-100 px-4 dark:border-zinc-800">
      <img src={logo} alt="Belaways" className="h-8 w-auto max-w-32 object-contain" />
      <span className="border-l border-zinc-200 pl-3 text-[10px] font-semibold uppercase text-zinc-400 dark:border-zinc-800">
        Intelligence
      </span>
    </div>
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase text-zinc-400">Operação</p>
      <div className="space-y-1">
        {navigation.slice(0, 5).map((item) => (
          <NavLink key={item.href} to={item.href} className={navLinkClass} onClick={onNavigate}>
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
      <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase text-zinc-400">Administração</p>
      <div className="space-y-1">
        {navigation.slice(5).map((item) => (
          <NavLink key={item.href} to={item.href} className={navLinkClass} onClick={onNavigate}>
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
    <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
        Monitor do catálogo ativo
      </div>
    </div>
  </aside>
);

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  useCatalogLive();

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (search.trim()) navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-zinc-950/40"
            aria-label="Fechar navegação"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-64 shadow-2xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir navegação">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <form onSubmit={submitSearch} className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar produto ou SKU" className="border-transparent bg-zinc-100 pl-9 dark:bg-zinc-900" aria-label="Pesquisa global" />
          </form>
          <ThemeToggle />
          <div className="hidden min-w-0 items-center gap-3 border-l border-zinc-200 pl-3 sm:flex dark:border-zinc-800">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-100 text-xs font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
              {user?.fullName?.slice(0, 2).toUpperCase() ?? 'BE'}
            </div>
            <div className="hidden min-w-0 text-left xl:block">
              <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">{user?.fullName}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sair" title="Sair">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
      {mobileOpen ? (
        <Button variant="secondary" size="icon" className="fixed right-4 top-4 z-50 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar">
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
};
