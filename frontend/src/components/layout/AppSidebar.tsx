import { NavLink } from 'react-router-dom';
import { Building2, LifeBuoy, LogOut, Ticket, UserRound, UsersRound, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150',
    isActive
      ? 'bg-indigo-500/15 text-white shadow-xs ring-1 ring-indigo-500/30'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
  );

export function AppSidebar() {
  const { user, logout } = useAuth();

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '';

  return (
    <Sidebar className="relative overflow-hidden border-slate-800/80 bg-slate-950">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-indigo-600/15 blur-3xl" />

      {/* Branding */}
      <div className="relative z-10 flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-600/25">
          <LifeBuoy className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-sm font-extrabold tracking-tight text-white">SupportDesk</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-400/80">Mini Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 space-y-5 px-3 py-4" aria-label="Primary navigation">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Workspace
          </p>
          <NavLink to="/" end className={navClass}>
            {({ isActive }) => (
              <>
                <Ticket className={cn('h-4 w-4 transition-colors', isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300')} />
                <span className="flex-1">Tickets</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />}
              </>
            )}
          </NavLink>

          <NavLink to="/profile" className={navClass}>
            {({ isActive }) => (
              <>
                <UserRound className={cn('h-4 w-4 transition-colors', isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300')} />
                <span className="flex-1">Profile</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />}
              </>
            )}
          </NavLink>
        </div>

        {user?.role === 'admin' && (
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Administration
            </p>
            <NavLink to="/departments" className={navClass}>
              {({ isActive }) => (
                <>
                  <Building2 className={cn('h-4 w-4 transition-colors', isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300')} />
                  <span className="flex-1">Departments</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />}
                </>
              )}
            </NavLink>

            <NavLink to="/users" className={navClass}>
              {({ isActive }) => (
                <>
                  <UsersRound className={cn('h-4 w-4 transition-colors', isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300')} />
                  <span className="flex-1">Users</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />}
                </>
              )}
            </NavLink>
          </div>
        )}
      </nav>

      {/* User info + Sign out */}
      <div className="relative z-10 border-t border-white/10 bg-slate-900/50 p-3.5">
        <NavLink
          to="/profile"
          className="mb-2.5 flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white/5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white ring-2 ring-indigo-400/20">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">
              {user?.role === 'admin' ? 'Administrator' : user?.role === 'agent' ? 'Support Agent' : 'Requester'}
            </p>
          </div>
        </NavLink>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </Sidebar>
  );
}
