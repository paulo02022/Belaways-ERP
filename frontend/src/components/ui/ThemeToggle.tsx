import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/use-theme';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema" title="Alternar tema">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </Button>
  );
};
