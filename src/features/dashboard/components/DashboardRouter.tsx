import { useAuthStore } from '@/stores/auth';
import { AdminDashboard } from './AdminDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { DeveloperDashboard } from './DeveloperDashboard';

export function DashboardRouter() {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    default:
      // Default to Developer/Standard view for 'user', 'developer', etc.
      return <DeveloperDashboard />;
  }
}
