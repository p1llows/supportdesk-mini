import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';
import { EditTicketModal } from '@/components/tickets/EditTicketModal';
import { TicketQuickViewDrawer, type AssignableAgent } from '@/components/tickets/TicketQuickViewDrawer';
import { TicketsTable, type TicketData } from '@/components/tickets/TicketsTable';
import { TicketFilters, type DepartmentOption } from '@/components/tickets/TicketFilters';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Plus,
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

  // Modal & Drawer States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTicket, setEditingTicket] = useState<TicketData | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Filter States
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [departmentIdFilter, setDepartmentIdFilter] = useState<string>('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [agents, setAgents] = useState<AssignableAgent[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Fetch assignable agents/admins for admin and agent roles
  useEffect(() => {
    if (!token || user?.role === 'requester') return;

    const fetchAgents = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/v1/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setAgents(
            (result.data.users || []).filter(
              (u: AssignableAgent) => u.role === 'agent' || u.role === 'admin'
            )
          );
        }
      } catch {
        // Non-blocking
      }
    };

    fetchAgents();
  }, [token, apiBaseUrl, user?.role]);

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
    setActionError(null);

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
        if (selectedTicketId === ticket.id) setSelectedTicketId(null);
        handleRefreshAll();
      } else {
        setActionError(result.message || 'Failed to delete ticket.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Network error deleting ticket.');
    }
  };

  const handleStatusChange = async (ticket: TicketData, newStatus: TicketData['status']) => {
    if (!token) return;
    setActionError(null);

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
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticket.id ? { ...t, status: newStatus } : t
          )
        );
        handleRefreshAll();
      } else {
        setActionError(result.message || 'Failed to update ticket status.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Network error updating status.');
    }
  };

  const handleAssignTicket = async (ticket: TicketData, assigneeId: number | null) => {
    if (!token) return;
    setActionError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigned_to: assigneeId }),
      });

      const result = await response.json();
      if (response.ok && result.status === 'success') {
        const updated = result.data.ticket;
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticket.id
              ? { ...t, assigned_to: updated.assigned_to, assignee: updated.assignee }
              : t
          )
        );
      } else {
        setActionError(result.message || 'Failed to update ticket assignee.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Network error assigning ticket.');
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

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-stone-500">{pageSubtitle}</p>
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
              className="h-9 px-3.5 text-sm font-semibold"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Ticket
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {(error || actionError) && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="text-sm">
              <span className="font-semibold">Notice:</span> {actionError || error}
            </div>
          </div>
          {actionError && (
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Interactive Metric Strip (click to filter by status) */}
      <section
        aria-label="Ticket summary"
        className="grid grid-cols-2 divide-y divide-[#E5E2DA] overflow-hidden rounded-xl border border-[#E5E2DA] bg-white lg:grid-cols-4 lg:divide-x lg:divide-y-0"
      >
        {[
          {
            key: '',
            label: 'All Tickets',
            value: stats?.total_tickets ?? 0,
            dot: 'bg-stone-400',
            sub: 'total requests',
            active: statusFilter === '',
            onClick: () => setStatusFilter(''),
          },
          {
            key: 'open',
            label: 'Open',
            value: stats?.open_tickets ?? 0,
            dot: 'bg-[#0F766E]',
            sub: 'awaiting assignment',
            active: statusFilter === 'open',
            onClick: () => setStatusFilter((prev) => (prev === 'open' ? '' : 'open')),
          },
          {
            key: 'in_progress',
            label: 'In Progress',
            value: stats?.in_progress_tickets ?? 0,
            dot: 'bg-amber-600',
            sub: 'being worked on',
            active: statusFilter === 'in_progress',
            onClick: () => setStatusFilter((prev) => (prev === 'in_progress' ? '' : 'in_progress')),
          },
          {
            key: 'resolved',
            label: 'Resolved / Closed',
            value: resolvedClosed,
            dot: 'bg-emerald-600',
            sub: 'completed',
            active: statusFilter === 'resolved' || statusFilter === 'closed',
            onClick: () => setStatusFilter((prev) => (prev === 'resolved' ? '' : 'resolved')),
          },
        ].map((metric) => (
          <button
            key={metric.label}
            type="button"
            onClick={metric.onClick}
            className={`group relative flex flex-col items-start px-5 py-4 text-left transition-colors hover:bg-[#FAF9F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F766E] ${
              metric.active ? 'bg-[#FAF9F6]' : ''
            }`}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-stone-500">
              <span
                className={`h-2 w-2 rounded-full ${metric.dot} ${
                  metric.key === 'open' && metric.value > 0 ? 'animate-sd-ping text-[#0F766E]' : ''
                }`}
              />
              {metric.label}
            </span>
            <span className="mt-2 text-2xl font-bold tabular-nums tracking-[-0.02em] text-stone-900">
              {loading ? <span className="animate-pulse text-stone-300">—</span> : metric.value}
            </span>
            <span className="mt-0.5 text-[11px] text-stone-400">{metric.sub}</span>
            {metric.active && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0F766E]" aria-hidden="true" />
            )}
          </button>
        ))}
      </section>

      {/* Split-Pane Queue + Inspector on xl:, Drawer on smaller screens */}
      <div className={selectedTicket ? 'grid grid-cols-1 gap-5 xl:grid-cols-12 xl:items-start' : ''}>
        {/* Unified Tickets Card: Filters + Table */}
        <section
          className={`overflow-hidden rounded-xl border border-[#E5E2DA] bg-white ${
            selectedTicket ? 'xl:col-span-8' : ''
          }`}
        >
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
            selectedTicketId={selectedTicketId}
            onSelectTicket={(t) => setSelectedTicketId((prev) => (prev === t.id ? null : t.id))}
            onEditTicket={(t) => setEditingTicket(t)}
            onDeleteTicket={handleDeleteTicket}
            onStatusChange={handleStatusChange}
          />
        </section>

        {/* Inline Inspector on xl+ screens */}
        {selectedTicket && (
          <div className="hidden xl:block xl:col-span-4 xl:sticky xl:top-20">
            <TicketQuickViewDrawer
              mode="inline"
              ticket={selectedTicket}
              role={user?.role ?? 'requester'}
              agents={agents}
              onClose={() => setSelectedTicketId(null)}
              onEdit={(t) => setEditingTicket(t)}
              onStatusChange={handleStatusChange}
              onAssign={handleAssignTicket}
            />
          </div>
        )}
      </div>

      {/* Overlay Drawer on < xl screens */}
      <div className="xl:hidden">
        <TicketQuickViewDrawer
          mode="drawer"
          ticket={selectedTicket}
          role={user?.role ?? 'requester'}
          agents={agents}
          onClose={() => setSelectedTicketId(null)}
          onEdit={(t) => setEditingTicket(t)}
          onStatusChange={handleStatusChange}
          onAssign={handleAssignTicket}
        />
      </div>

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
