import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedLayout } from './components/layouts/AuthenticatedLayout';
import { useAuthStore } from './stores/auth';
import type { AuthState } from './stores/auth';

// Auth Pages
import { LoginPage } from './features/auth/pages/LoginPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';

// Public Pages
import { PublicSharePage } from './features/share/pages/PublicSharePage';

// Protected Pages
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { ProjectsPage } from './features/projects/pages/ProjectsPage';
import { ProjectDetailPageV2 } from './features/projects/pages/ProjectDetailPageV2';
import { VaultPage } from './features/vault/pages/VaultPage';
import { TeamPage } from './features/team/pages/TeamPage';
import { TagsPage } from './features/tags/pages/TagsPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { ActivityPage } from './features/admin/pages/ActivityPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { MaintenanceReportsPage } from './features/reports/pages/MaintenanceReportsPage';
import { MyTimePage } from './features/time/pages/MyTimePage';
import { ApprovalsPage } from './features/time/pages/ApprovalsPage';
import { FinancialReportsPage } from './features/time/pages/FinancialReportsPage';
import { AnalyticsPage } from './features/time/pages/AnalyticsPage';
import { InvoicesPage } from './features/time/pages/InvoicesPage';
import SupportPage from './features/support/pages/SupportPage';
import LibraryResourcesPage from './features/library/LibraryResourcesPage';

/**
 * Protected Route Wrapper
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state: AuthState) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

/**
 * Admin Route Wrapper
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state: AuthState) => state.user);
  
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

/**
 * Main App Component
 */
export function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/share/:token" element={<PublicSharePage />} />
      
      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPageV2 />} />
        <Route path="projects/:projectId/reports" element={<MaintenanceReportsPage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="library" element={<LibraryResourcesPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        
        {/* Time Tracking */}
        <Route path="time" element={<MyTimePage />} />
        <Route path="time/approvals" element={<ApprovalsPage />} />
        <Route path="time/reports" element={<FinancialReportsPage />} />
        <Route path="time/analytics" element={<AnalyticsPage />} />
        <Route path="time/invoices" element={<InvoicesPage />} />
        
        {/* Admin Only Routes */}
        <Route
          path="activity"
          element={
            <AdminRoute>
              <ActivityPage />
            </AdminRoute>
          }
        />
        <Route
          path="settings"
          element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          }
        />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

