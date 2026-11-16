import { NavLink } from 'react-router-dom';
import { Activity, Building2, LayoutDashboard, LogOut, ShieldCheck, Ticket, UserRound, UsersRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo, BrandMark } from '@/components/layout/BrandLogo';
import { Sidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  collapsed?: boolean;
}

export function AppSidebar({ collapsed = false }: AppSidebarProps) {
  const { user, logout } = useAuth();

  const initials =
    user?.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '';

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center rounded-lg text-[13px] font-semibold transition-all duration-150',
      collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2',
      isActive
        ? 'bg-white text-stone-900 shadow-[0_1px_2px_rgba(28,25,23,0.05)] ring-1 ring-[#E5E2DA]'
        : 'text-stone-600 hover:bg-[#E7E4DC]/70 hover:text-stone-900'
    );

  return (
    <Sidebar
      className={cn(
        'border-[#E5E2DA] bg-[#F1EFE9] transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Branding */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-[#E5E2DA]',
          collapsed ? 'justify-center px-2' : 'px-4'
        )}
      >
        {collapsed ? (
          <BrandMark className="h-7 w-7" />
        ) : (
          <BrandLogo theme="light" subtitle="Help Desk" size="sm" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 px-2.5 py-4" aria-label="Primary navigation">
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
              Workspace
            </p>
          )}
          <NavLink to="/" end className={navClass} title="Dashboard">
            {({ isActive }) => (
              <>
                <LayoutDashboard className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#0F766E]' : 'text-stone-400 group-hover:text-stone-600')} />
                {!collapsed && <span className="flex-1">Dashboard</span>}
              </>
            )}
          </NavLink>

          <NavLink to="/tickets" className={navClass} title="Tickets">
            {({ isActive }) => (
              <>
                <Ticket className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#0F766E]' : 'text-stone-400 group-hover:text-stone-600')} />
                {!collapsed && <span className="flex-1">Tickets</span>}
              </>
            )}
          </NavLink>

          <NavLink to="/profile" className={navClass} title="Profile">
            {({ isActive }) => (
              <>
                <UserRound className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#0F766E]' : 'text-stone-400 group-hover:text-stone-600')} />
                {!collapsed && <span className="flex-1">Profile</span>}
              </>
            )}
          </NavLink>
        </div>

        {user?.role === 'admin' && (
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                Administration
              </p>
            )}
            <NavLink to="/departments" className={navClass} title="Departments">
              {({ isActive }) => (
                <>
                  <Building2 className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#0F766E]' : 'text-stone-400 group-hover:text-stone-600')} />
                  {!collapsed && <span className="flex-1">Departments</span>}
                </>
              )}
            </NavLink>

            <NavLink to="/users" className={navClass} title="Users">
              {({ isActive }) => (
                <>
                  <UsersRound className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#0F766E]' : 'text-stone-400 group-hover:text-stone-600')} />
                  {!collapsed && <span className="flex-1">Users</span>}
                </>
              )}
            </NavLink>

            <NavLink to="/roles" className={navClass} title="Roles & Permissions">
              {({ isActive }) => (
                <>
                  <ShieldCheck className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#0F766E]' : 'text-stone-400 group-hover:text-stone-600')} />
                  {!collapsed && <span className="flex-1">Roles & Permissions</span>}
                </>
              )}
            </NavLink>

            <NavLink to="/activity-logs" className={navClass} title="Activity Logs">
              {({ isActive }) => (
                <>
                  <Activity className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#0F766E]' : 'text-stone-400 group-hover:text-stone-600')} />
                  {!collapsed && <span className="flex-1">Activity Logs</span>}
                </>
              )}
            </NavLink>
          </div>
        )}
      </nav>

      {/* User info + Sign out */}
      <div className="border-t border-[#E5E2DA] p-3">
        <div
          className={cn(
            'rounded-xl border border-[#E5E2DA] bg-white p-2 shadow-[0_1px_2px_rgba(28,25,23,0.03)]',
            collapsed && 'p-1.5'
          )}
        >
          <NavLink
            to="/profile"
            title={user?.name}
            className={cn(
              'flex items-center rounded-lg p-1.5 transition-colors hover:bg-[#F7F6F2]',
              collapsed ? 'justify-center' : 'gap-2.5'
            )}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-[#E5E2DA]"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F766E] text-[11px] font-bold text-white">
                {initials}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-stone-900">{user?.name}</p>
                <p className="truncate text-[11px] text-stone-500">
                  {user?.role === 'admin' ? 'Administrator' : user?.role === 'agent' ? 'Support Agent' : 'Requester'}
                </p>
              </div>
            )}
          </NavLink>

          <div className="mt-1.5 border-t border-[#EFECE6] pt-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className={cn(
                'h-8 w-full rounded-lg border border-transparent text-xs font-semibold text-stone-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700',
                collapsed ? 'justify-center px-0' : 'justify-between px-2.5'
              )}
            >
              {!collapsed && <span>Sign Out</span>}
              <LogOut className="h-3.5 w-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
