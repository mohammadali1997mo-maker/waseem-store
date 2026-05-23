export type AdminRole = 'owner' | 'manager' | 'viewer';

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  addedAt: string;
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'مالك (Owner)',
  manager: 'مدير (Manager)',
  viewer: 'مشاهد (Viewer)',
};
