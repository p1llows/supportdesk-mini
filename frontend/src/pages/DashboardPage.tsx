import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';
import { EditTicketModal } from '@/components/tickets/EditTicketModal';
import { TicketsTable, type TicketData } from '@/components/tickets/TicketsTable';
import { TicketFilters, type DepartmentOption } from '@/components/tickets/TicketFilters';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  PlusCircle,
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

export const DashboardPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardApiResponse['data'] | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTicket, setEditingTicket] = useState<TicketData | null>(null);

  // Filter States
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [departmentIdFilter, setDepartmentIdFilter] = useState<string>('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

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

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const result: DashboardApiResponse = await response.json();

      if (response.ok && result.status === 'success') {
        setData(result.data);
      } else {
        setError(result.message || `Failed to fetch dashboard metrics (HTTP ${response.status})`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token]);

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

  const handleRefreshAll = () => {
    fetchStats();
    fetchTickets();
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setDepartmentIdFilter('');
  };

  const handleDeleteTicket = async (ticket: TicketData) => {
    if (!token) return;

    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${ticket.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok && result.status === 'success') {
        handleRefreshAll();
      }
    } catch {
      // Handled gracefully
    }
  };

  const handleStatusChange = async (ticket: TicketData, newStatus: TicketData['status']) => {
    if (!token) return;

    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (response.ok && result.status === 'success') {
        // Optimistically update the ticket in local state so the button changes immediately,
        // then do a background refresh to keep stats in sync.
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticket.id ? { ...t, status: newStatus } : t
          )
        );
        // Refresh stats & full queue to keep dashboard counts accurate.
        handleRefreshAll();
      }
    } catch {
      // Handled gracefully
    }
  };

  const stats = data?.stats;
  const resolvedClosed = (stats?.resolved_tickets ?? 0) + (stats?.closed_tickets ?? 0);

  // Non-admin roles are already scoped server-side to their own department,
  // so the department filter is frozen to their department for clarity.
  const departmentLocked = user?.role !== 'admin';
  const lockedDepartmentName = departments.find(
    (dept) => dept.id === user?.department_id
  )?.name;

  // Determine page title and subtitle based on role
  const pageTitle = 'All Tickets';
  const pageSubtitle = user?.role === 'admin'
    ? 'All departments · Administrator view'
    : user?.role === 'agent'
      ? 'Department tickets · Agent view'
      : 'Your tickets · Requester view';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{pageSubtitle}</p>
        </div>

        {/* Submit Ticket Action — Restricted strictly to Requesters */}
        {user?.role === 'requester' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {!user.department_id && (
              <Link
                to="/profile"
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                Set your department to submit tickets →
              </Link>
            )}
            <Button
              onClick={() => {
                if (!user.department_id) {
                  navigate('/profile');
                } else {
                  setIsModalOpen(true);
                }
              }}
              className="bg-indigo-600 text-white shadow-xs hover:bg-indigo-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Submit New Ticket
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <span className="font-semibold">Dashboard Access Notice:</span> {error}
          </div>
        </div>
      )}

      {/* Stat Metric Cards Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tickets</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
            {loading ? <span className="animate-pulse text-slate-400">—</span> : stats?.total_tickets ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">all recorded requests</p>
        </div>

        {/* Open */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-amber-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-amber-600">
            {loading ? <span className="animate-pulse text-slate-400">—</span> : stats?.open_tickets ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">awaiting assignment</p>
        </div>

        {/* In Progress */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-blue-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Progress</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Loader2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-blue-600">
            {loading ? <span className="animate-pulse text-slate-400">—</span> : stats?.in_progress_tickets ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">being worked on</p>
        </div>

        {/* Resolved / Closed */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-emerald-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Resolved / Closed</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-emerald-600">
            {loading ? <span className="animate-pulse text-slate-400">—</span> : resolvedClosed}
          </p>
          <p className="mt-1 text-xs text-slate-500">completed</p>
        </div>
      </section>

      {/* Unified Tickets Card: Filters + Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
        <TicketFilters
          search={searchInput}
          status={statusFilter}
          priority={priorityFilter}
          departmentId={departmentIdFilter}
          departments={departments}
          ticketCount={tickets.length}
          departmentLocked={departmentLocked}
          lockedDepartmentName={lockedDepartmentName}
          onSearchChange={setSearchInput}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          onDepartmentIdChange={setDepartmentIdFilter}
          onClearFilters={handleClearFilters}
        />

        <TicketsTable
          tickets={tickets}
          loading={ticketsLoading}
          onEditTicket={(t) => setEditingTicket(t)}
          onDeleteTicket={handleDeleteTicket}
          onStatusChange={handleStatusChange}
        />
      </section>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefreshAll}
      />

      {/* Edit Ticket Modal (Issue #12) */}
      <EditTicketModal
        isOpen={!!editingTicket}
        ticket={editingTicket}
        departments={departments}
        onClose={() => setEditingTicket(null)}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
};
