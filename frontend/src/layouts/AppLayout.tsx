import { Menu, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import logo from '@/assets/belaways-logo.png';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { navigation, secondaryNavigation } from '@/constants/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
  );

const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
  <aside className="flex h-full flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
    <div className="flex h-16 items-center border-b border-zinc-100 px-5 dark:border-zinc-800">
      <img src={logo} alt="Belaways" className="h-9 w-auto object-contain" />
    </div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {navigation.map((item) => (
        <NavLink key={item.href} to={item.href} className={navLinkClass} onClick={onNavigate}>
          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
    <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
      {secondaryNavigation.map((item) => (
        <NavLink key={item.label} to={item.href} className={navLinkClass} onClick={onNavigate}>
          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  </aside>
);

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (search.trim()) navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">
        <Sidebar />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-zinc-950/40"
            aria-label="Fechar navegação"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72 shadow-2xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir navegação">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <form onSubmit={submitSearch} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar produto, SKU ou pedido" className="pl-9" />
          </form>
          <ThemeToggle />
          <div className="hidden min-w-0 items-center gap-3 sm:flex">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">{user?.fullName}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user?.role}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
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
