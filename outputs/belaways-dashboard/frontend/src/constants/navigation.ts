import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
  FileSearch,
  PackageSearch,
  Settings,
  ShieldCheck,
  Truck,
  UserCircle,
  Users,
} from 'lucide-react';

export const navigation = [
  { label: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { label: 'Produtos', href: '/products', icon: PackageSearch },
  { label: 'Alertas', href: '/alerts', icon: AlertTriangle },
  { label: 'Pedidos', href: '/orders', icon: ClipboardList },
  { label: 'Logística', href: '/logistics', icon: Truck },
  { label: 'Auditoria', href: '/audit', icon: FileSearch },
  { label: 'Usuários', href: '/users', icon: Users },
  { label: 'Perfil', href: '/profile', icon: UserCircle },
  { label: 'Configurações', href: '/settings', icon: Settings },
] as const;

export const secondaryNavigation = [
  { label: 'Permissões', href: '/users', icon: ShieldCheck },
  { label: 'Estoque', href: '/products', icon: Boxes },
] as const;
