import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';
import { TicketsTable, type TicketData } from '@/components/tickets/TicketsTable';
import { TicketFilters, type DepartmentOption } from '@/components/tickets/TicketFilters';
import { UsersTable, type UserData } from '@/components/users/UsersTable';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  User as UserIcon,
  PlusCircle,
  Filter,
  ShieldCheck,
} from 'lucide-react';

interface DashboardStats {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
}

interface DashboardApiResponse {
  status: string;
  data: {
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
    };
    active_scope: string;
    permitted_scopes: string[];
    stats: DashboardStats;
  };
  message?: string;
}

interface TicketsApiResponse {
  status: string;
  data: {
    tickets: TicketData[];
  };
}

interface UsersApiResponse {
  status: string;
  data: {
    users: UserData[];
  };
}

export const DashboardPage = () => {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState<DashboardApiResponse['data'] | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [activeScope, setActiveScope] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Filter States
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [departmentIdFilter, setDepartmentIdFilter] = useState<string>('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Users Directory State (Issue #9)
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  // 400ms search input debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch departments list for filter dropdown options
  useEffect(() => {
    if (!token) return;

    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/v1/departments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setDepartments(result.data.departments || []);
        }
      } catch {
        // Handled gracefully
      }
    };

    fetchDepartments();
  }, [token, apiBaseUrl]);

  const fetchStats = useCallback(async (scopeOverride?: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const targetScope = scopeOverride !== undefined ? scopeOverride : activeScope;
    const queryParam = targetScope ? `?scope=${encodeURIComponent(targetScope)}` : '';

    try {
      const response = await fetch(`${apiBaseUrl}/v1/dashboard/stats${queryParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const result: DashboardApiResponse = await response.json();

      if (response.ok && result.status === 'success') {
        setData(result.data);
        setActiveScope(result.data.active_scope);
      } else {
        setError(result.message || `Failed to fetch dashboard metrics (HTTP ${response.status})`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, activeScope]);

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    setTicketsLoading(true);

    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);
    if (departmentIdFilter) params.append('department_id', departmentIdFilter);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const result: TicketsApiResponse = await response.json();

      if (response.ok && result.status === 'success') {
        setTickets(result.data.tickets);
      }
    } catch {
      // Tickets error handled gracefully in table component
    } finally {
      setTicketsLoading(false);
    }
  }, [apiBaseUrl, token, debouncedSearch, statusFilter, priorityFilter, departmentIdFilter]);

  // Fetch system users directory for Admin and Agent roles (Issue #9)
  const fetchUsers = useCallback(async () => {
    if (!token || !user || (user.role !== 'admin' && user.role !== 'agent')) return;
    setUsersLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const result: UsersApiResponse = await response.json();

      if (response.ok && result.status === 'success') {
        setUsersList(result.data.users || []);
      }
    } catch {
      // Handled gracefully
    } finally {
      setUsersLoading(false);
    }
  }, [apiBaseUrl, token, user]);

  const handleRefreshAll = () => {
    fetchStats();
    fetchTickets();
    if (user?.role === 'admin' || user?.role === 'agent') {
      fetchUsers();
    }
  };

  useEffect(() => {
    fetchStats();
    if (user?.role === 'admin' || user?.role === 'agent') {
      fetchUsers();
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleScopeChange = (newScope: string) => {
    // Reset filters when switching dashboard role tabs
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setDepartmentIdFilter('');

    setActiveScope(newScope);
    fetchStats(newScope);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setDepartmentIdFilter('');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'agent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Profile Bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 md:p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{user?.name}</h1>
              <Badge variant={getRoleBadgeVariant(user?.role || 'requester')}>
                <ShieldCheck className="w-3 h-3 mr-1 inline" />
                {user?.role}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={loading || ticketsLoading || usersLoading}
            className="text-slate-700 hover:text-slate-900"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading || ticketsLoading || usersLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="text-slate-700 hover:text-slate-900">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Title & Action Bar */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Support Desk Dashboard</h2>
          <p className="text-sm text-slate-500">
            Role-scoped ticket overview and queue performance metrics
          </p>
        </div>

        {/* Submit Ticket Action — Restricted strictly to Requesters */}
        {user?.role === 'requester' && (
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Submit New Ticket
          </Button>
        )}
      </section>

      {/* Role Filter Controls */}
      {data?.permitted_scopes && data.permitted_scopes.length > 0 && (
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">
              <Filter className="w-3.5 h-3.5" />
              Role View Filter:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {data.permitted_scopes.map((scope) => (
                <button
                  key={scope}
                  onClick={() => handleScopeChange(scope)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    data.active_scope === scope
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {scope === 'all'
                    ? 'All Scope (Admin)'
                    : scope === 'admin'
                    ? 'Admin View'
                    : scope === 'agent'
                    ? 'Agent View'
                    : 'Requester View'}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Dashboard Access Notice:</span> {error}
          </div>
        </div>
      )}

      {/* Stat Metric Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Tickets</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Ticket className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? <span className="animate-pulse">...</span> : data?.stats.total_tickets ?? 0}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Active Scope: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">{data?.active_scope || '...'}</code>
            </CardDescription>
          </CardContent>
        </Card>

        {/* Open Tickets Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Open Tickets</CardTitle>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {loading ? <span className="animate-pulse">...</span> : data?.stats.open_tickets ?? 0}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Awaiting Support Agent pickup
            </CardDescription>
          </CardContent>
        </Card>

        {/* In Progress Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">In Progress</CardTitle>
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <RefreshCw className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {loading ? <span className="animate-pulse">...</span> : data?.stats.in_progress_tickets ?? 0}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Currently being handled
            </CardDescription>
          </CardContent>
        </Card>

        {/* Resolved / Closed Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Resolved & Closed</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                (data?.stats.resolved_tickets ?? 0) + (data?.stats.closed_tickets ?? 0)
              )}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Resolved or Admin acknowledged
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      {/* Ticket Filters Component */}
      <section>
        <TicketFilters
          search={searchInput}
          status={statusFilter}
          priority={priorityFilter}
          departmentId={departmentIdFilter}
          departments={departments}
          onSearchChange={setSearchInput}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          onDepartmentIdChange={setDepartmentIdFilter}
          onClearFilters={handleClearFilters}
        />
      </section>

      {/* Tickets Table Component */}
      <section>
        <TicketsTable tickets={tickets} loading={ticketsLoading} />
      </section>

      {/* Users Directory Table Component — Rendered for Admin and Support Agent users (Issue #9) */}
      {(user?.role === 'admin' || user?.role === 'agent') && (
        <section className="pt-2">
          <UsersTable users={usersList} loading={usersLoading} />
        </section>
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefreshAll}
      />
    </main>
  );
};
