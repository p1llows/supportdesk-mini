import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, Building2, LayoutDashboard, PanelLeft, ShieldCheck, Ticket, UserRound, UsersRound } from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

function getPageLabel(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/tickets') return 'Tickets';
  if (pathname.startsWith('/tickets/')) return 'Ticket Details';
  if (pathname.startsWith('/departments')) return 'Departments';
  if (pathname.startsWith('/users')) return 'Users';
  if (pathname.startsWith('/roles')) return 'Roles & Permissions';
  if (pathname.startsWith('/activity-logs')) return 'Activity Logs';
  if (pathname.startsWith('/profile')) return 'Profile';
  return 'SupportDesk';
}

export function AuthenticatedLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('supportdesk_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('supportdesk_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] lg:flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex">
        <AppSidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 border-b border-[#E5E2DA] bg-[#F7F6F2]/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="SupportDesk Home">
            <BrandLogo theme="light" size="sm" />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Mobile navigation">
            <NotificationBell />
            <NavLink to="/" end className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-white text-[#0F766E] ring-1 ring-[#E5E2DA]' : 'text-stone-500 hover:bg-[#EFECE6]')} aria-label="Dashboard">
              <LayoutDashboard className="h-4 w-4" />
            </NavLink>
            <NavLink to="/tickets" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-white text-[#0F766E] ring-1 ring-[#E5E2DA]' : 'text-stone-500 hover:bg-[#EFECE6]')} aria-label="Tickets">
              <Ticket className="h-4 w-4" />
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/departments" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-white text-[#0F766E] ring-1 ring-[#E5E2DA]' : 'text-stone-500 hover:bg-[#EFECE6]')} aria-label="Departments">
                <Building2 className="h-4 w-4" />
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/users" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-white text-[#0F766E] ring-1 ring-[#E5E2DA]' : 'text-stone-500 hover:bg-[#EFECE6]')} aria-label="Users">
                <UsersRound className="h-4 w-4" />
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/roles" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-white text-[#0F766E] ring-1 ring-[#E5E2DA]' : 'text-stone-500 hover:bg-[#EFECE6]')} aria-label="Roles & Permissions">
                <ShieldCheck className="h-4 w-4" />
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/activity-logs" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-white text-[#0F766E] ring-1 ring-[#E5E2DA]' : 'text-stone-500 hover:bg-[#EFECE6]')} aria-label="Activity Logs">
                <Activity className="h-4 w-4" />
              </NavLink>
            )}
            <NavLink to="/profile" className={({ isActive }) => cn('rounded-md p-2', isActive ? 'bg-white text-[#0F766E] ring-1 ring-[#E5E2DA]' : 'text-stone-500 hover:bg-[#EFECE6]')} aria-label="Profile">
              <UserRound className="h-4 w-4" />
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main
        className={cn(
          'min-w-0 flex-1 transition-[margin] duration-200',
          sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]'
        )}
      >
        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-[#E5E2DA] bg-[#F7F6F2]/90 px-6 backdrop-blur-md lg:flex">
          <div className="flex items-center gap-3 text-[13px]">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-[#E7E4DC]/70 hover:text-stone-900"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <span className="h-4 w-px bg-[#E5E2DA]" />
            <span className="font-medium text-stone-400">SupportDesk</span>
            <span className="text-stone-300">/</span>
            <span className="font-semibold text-stone-900">{getPageLabel(pathname)}</span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <div key={pathname} className="animate-sd-in mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
