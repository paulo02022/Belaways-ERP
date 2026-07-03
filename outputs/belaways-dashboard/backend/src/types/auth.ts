export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'inactive';
};
