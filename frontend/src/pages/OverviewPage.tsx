import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SupportBadge } from '@/components/ui/status-badges';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';
import type { TicketData } from '@/components/tickets/TicketsTable';

interface DashboardStats {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
}

function formatRelative(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toISOString().slice(0, 10);
}

export function OverviewPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const loadOverview = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
      const [statsRes, ticketsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/v1/dashboard/stats`, { headers }),
        fetch(`${apiBaseUrl}/v1/tickets`, { headers }),
      ]);
      const statsJson = await statsRes.json();
      const ticketsJson = await ticketsRes.json();

      if (statsRes.ok && statsJson.status === 'success') {
        setStats(statsJson.data.stats);
      } else {
        setError(statsJson.message || 'Failed to load dashboard overview.');
      }

      if (ticketsRes.ok && ticketsJson.status === 'success') {
        setTickets(ticketsJson.data.tickets ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error loading overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [token, apiBaseUrl]);

  const total = stats?.total_tickets ?? 0;
  const open = stats?.open_tickets ?? 0;
  const inProgress = stats?.in_progress_tickets ?? 0;
  const resolved = stats?.resolved_tickets ?? 0;
  const closed = stats?.closed_tickets ?? 0;
  const completed = resolved + closed;
  const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const highCount = tickets.filter((t) => t.priority === 'high').length;
  const mediumCount = tickets.filter((t) => t.priority === 'medium').length;
  const lowCount = tickets.filter((t) => t.priority === 'low').length;
  const unassignedCount = tickets.filter((t) => !t.assigned_to && t.status !== 'closed').length;

  // Group tickets by department
  const deptCounts = tickets.reduce<Record<string, number>>((acc, t) => {
    const name = t.department?.name ?? 'Unassigned';
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const deptRows = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
  const recentTickets = tickets.slice(0, 5);

  const pct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {user?.role === 'admin'
              ? 'System-wide support overview across all departments.'
              : user?.role === 'agent'
                ? 'Department queue summary and recent activity.'
                : 'Overview of your submitted support requests.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {user?.role === 'requester' && user.department_id && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F766E] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59]"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </button>
          )}
          <Link
            to="/tickets"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E2DA] bg-white px-3.5 text-sm font-semibold text-stone-800 transition-colors hover:bg-[#FAF9F6]"
          >
            Open Ticket Queue
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Top KPI Strip */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-2 divide-y divide-[#E5E2DA] overflow-hidden rounded-xl border border-[#E5E2DA] bg-white lg:grid-cols-4 lg:divide-x lg:divide-y-0"
      >
        {[
          { label: 'Total Tickets', value: total, sub: 'all recorded', dot: 'bg-stone-400' },
          { label: 'Open Queue', value: open, sub: 'awaiting triage', dot: 'bg-[#0F766E]' },
          { label: 'In Progress', value: inProgress, sub: 'actively handled', dot: 'bg-amber-600' },
          { label: 'Resolution Rate', value: `${resolutionRate}%`, sub: `${completed} completed`, dot: 'bg-emerald-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="px-5 py-4">
            <p className="flex items-center gap-2 text-xs font-medium text-stone-500">
              <span
                className={`h-2 w-2 rounded-full ${kpi.dot} ${
                  kpi.label === 'Open Queue' && open > 0 ? 'animate-sd-ping text-[#0F766E]' : ''
                }`}
              />
              {kpi.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-[-0.02em] text-stone-900">
              {loading ? <span className="animate-pulse text-stone-300">—</span> : kpi.value}
            </p>
            <p className="mt-0.5 text-[11px] text-stone-400">{kpi.sub}</p>
          </div>
        ))}
      </section>

      {/* Analytical Breakdown Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status & Priority Breakdown */}
        <section className="rounded-xl border border-[#E5E2DA] bg-white p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Status Distribution</h2>
            <p className="mt-0.5 text-xs text-stone-500">Current ticket breakdown by workflow stage.</p>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Open', count: open, bar: 'bg-[#0F766E]' },
                { label: 'In Progress', count: inProgress, bar: 'bg-amber-600' },
                { label: 'Resolved', count: resolved, bar: 'bg-emerald-600' },
                { label: 'Closed', count: closed, bar: 'bg-stone-400' },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-700">{row.label}</span>
                    <span className="font-mono tabular-nums text-stone-500">
                      {row.count} ({pct(row.count)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE6]">
                    <div
                      className={`h-full rounded-full ${row.bar} transition-all duration-300`}
                      style={{ width: `${pct(row.count)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#EFECE6] pt-5">
            <h2 className="text-sm font-bold text-stone-900">Priority Breakdown</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'High', count: highCount, cls: 'text-red-700' },
                { label: 'Medium', count: mediumCount, cls: 'text-stone-800' },
                { label: 'Low', count: lowCount, cls: 'text-stone-500' },
              ].map((p) => (
                <div key={p.label} className="py-1">
                  <p className={`text-xl font-bold tabular-nums ${p.cls}`}>{p.count}</p>
                  <p className="text-[11px] font-medium text-stone-500">{p.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Department Volume & Assignment Health */}
        <section className="flex flex-col justify-between rounded-xl border border-[#E5E2DA] bg-white p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Tickets by Department</h2>
            <p className="mt-0.5 text-xs text-stone-500">Volume distribution across support queues.</p>

            {loading ? (
              <div className="flex items-center gap-2 py-8 text-xs text-stone-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading breakdown...
              </div>
            ) : deptRows.length === 0 ? (
              <p className="py-8 text-xs italic text-stone-400">No ticket data yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {deptRows.map(([deptName, count]) => (
                  <div key={deptName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-stone-700">{deptName}</span>
                      <span className="font-mono tabular-nums text-stone-500">
                        {count} ({pct(count)}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE6]">
                      <div
                        className="h-full rounded-full bg-stone-700 transition-all duration-300"
                        style={{ width: `${pct(count)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#EFECE6] pt-4 text-xs">
            <span className="text-stone-500">
              Active unassigned tickets:{' '}
              <strong className="font-mono text-stone-900">{unassignedCount}</strong>
            </span>
            <Link to="/tickets" className="font-semibold text-[#0F766E] hover:underline">
              Triage queue →
            </Link>
          </div>
        </section>
      </div>

      {/* Recent Tickets */}
      <section className="overflow-hidden rounded-xl border border-[#E5E2DA] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E2DA] bg-[#FAF9F6] px-5 py-3.5">
          <h2 className="text-sm font-bold text-stone-900">Recent Tickets</h2>
          <Link to="/tickets" className="text-xs font-semibold text-[#0F766E] hover:underline">
            View all →
          </Link>
        </div>

        {recentTickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">No tickets to display.</div>
        ) : (
          <div className="divide-y divide-[#EFECE6]">
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[#FAF9F6]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-semibold text-stone-400">
                    TK-{String(ticket.id).padStart(3, '0')}
                  </span>
                  <span className="truncate text-sm font-semibold text-stone-900">
                    {ticket.title}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <SupportBadge category="priority" value={ticket.priority} />
                  <SupportBadge category="status" value={ticket.status} />
                  <span className="w-14 text-right font-mono text-xs tabular-nums text-stone-400">
                    {formatRelative(ticket.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <CreateTicketModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={loadOverview}
      />
    </div>
  );
}
