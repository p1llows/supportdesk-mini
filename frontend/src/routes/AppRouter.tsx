import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { UsersPage } from '@/pages/UsersPage';

// Guest Guard: Allows unauthenticated access, redirects authenticated users to /
const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500 text-sm animate-pulse">
          <span className="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
          Verifying session...
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      {children}
    </main>
  );
};

// Protected Guard: Allows authenticated access, redirects unauthenticated users to /login
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500 text-sm animate-pulse">
          <span className="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
          Loading application...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
