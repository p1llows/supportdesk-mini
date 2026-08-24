import { NavLink } from 'react-router-dom';
import { Building2, LifeBuoy, LogOut, Ticket, UserRound, UsersRound, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-indigo-500/20 text-indigo-300'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
  );

export function AppSidebar() {
  const { user, logout } = useAuth();

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) ?? '';

  return (
    <Sidebar className="border-slate-800 bg-slate-950">
      {/* Branding */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm">
          <LifeBuoy className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-sm font-extrabold tracking-tight text-white">SupportDesk</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mini</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-3" aria-label="Primary navigation">
        <NavLink to="/" end className={navClass}>
          {({ isActive }) => (
            <>
              <Ticket className="h-4 w-4" />
              <span className="flex-1">Tickets</span>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />}
            </>
          )}
        </NavLink>

        {user?.role === 'admin' && (
          <NavLink to="/departments" className={navClass}>
            {({ isActive }) => (
              <>
                <Building2 className="h-4 w-4" />
                <span className="flex-1">Departments</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />}
              </>
            )}
          </NavLink>
        )}

        {user?.role === 'admin' && (
          <NavLink to="/users" className={navClass}>
            {({ isActive }) => (
              <>
                <UsersRound className="h-4 w-4" />
                <span className="flex-1">Users</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />}
              </>
            )}
          </NavLink>
        )}

        <NavLink to="/profile" className={navClass}>
          {({ isActive }) => (
            <>
              <UserRound className="h-4 w-4" />
              <span className="flex-1">Profile</span>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />}
            </>
          )}
        </NavLink>
      </nav>

      {/* User info + Sign out */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">
              {user?.role === 'admin' ? 'Administrator' : user?.role === 'agent' ? 'Support Agent' : 'Requester'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </Sidebar>
  );
}
