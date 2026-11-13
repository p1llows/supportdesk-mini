import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Building2, Ticket, UserRound, UsersRound } from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

function getPageLabel(pathname: string): string {
  if (pathname === '/') return 'Tickets';
  if (pathname.startsWith('/tickets/')) return 'Ticket Details';
  if (pathname.startsWith('/departments')) return 'Departments';
  if (pathname.startsWith('/users')) return 'Users';
  if (pathname.startsWith('/profile')) return 'Profile';
  return 'SupportDesk';
}

export function AuthenticatedLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '';

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrator'
      : user?.role === 'agent'
        ? 'Support Agent'
        : 'Requester';

  return (
    <div className="min-h-screen bg-[#f6f8fb] lg:flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex">
        <AppSidebar />
      </div>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="SupportDesk Home">
            <BrandLogo theme="light" size="sm" />
          </Link>
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
                <UsersRound className="h-4 w-4" />
              </NavLink>
            )}
            <NavLink to="/profile" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100')} aria-label="Profile">
              <UserRound className="h-4 w-4" />
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="min-w-0 flex-1 lg:ml-[240px]">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-8 backdrop-blur-md lg:flex">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="font-medium text-slate-400">SupportDesk</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-800">{getPageLabel(pathname)}</span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="h-6 w-px bg-slate-200" />
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-lg py-1 pl-2 pr-1 text-right transition-colors hover:bg-slate-100/80"
            >
              <div>
                <p className="text-sm font-bold leading-tight text-slate-900">{user?.name}</p>
                <p className="text-[11px] font-medium text-slate-500">{roleLabel}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-xs">
                {initials}
              </div>
            </Link>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
