import { NavLink, Outlet } from 'react-router-dom';
import { Building2, LifeBuoy, Ticket, UserRound } from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export function AuthenticatedLayout() {
  const { user } = useAuth();

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) ?? '';

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">
        <AppSidebar />
      </div>

      {/* Mobile header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <LifeBuoy className="h-5 w-5 text-indigo-600" />
            SupportDesk
          </div>
          <nav className="flex items-center gap-1">
            <NotificationBell />
            <NavLink to="/" end className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100')} aria-label="Tickets">
              <Ticket className="h-4 w-4" />
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/departments" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100')} aria-label="Departments">
                <Building2 className="h-4 w-4" />
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/users" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100')} aria-label="Users">
                <UserRound className="h-4 w-4" />
              </NavLink>
            )}
            <NavLink to="/profile" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100')} aria-label="Profile">
              <UserRound className="h-4 w-4" />
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="min-w-0 flex-1 lg:ml-[220px]">
        {/* Desktop top bar */}
        <header className="hidden h-16 items-center justify-end border-b border-slate-200 bg-white px-8 lg:flex">
          <div className="flex items-center gap-3 text-right">
            <NotificationBell />
            <div>
              <p className="text-sm font-bold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">
                {user?.role === 'admin' ? 'Administrator' : user?.role === 'agent' ? 'Support Agent' : 'Requester'}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
