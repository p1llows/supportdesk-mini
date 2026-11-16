import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TablePagination } from '@/components/ui/table-pagination';
import { SupportBadge } from '@/components/ui/status-badges';

interface ActivityLogItem {
  id: number;
  type: 'created' | 'comment' | 'status_change' | 'priority_change' | 'department_change' | 'assigned' | string;
  body: string | null;
  is_internal?: boolean;
  metadata: { old?: string; new?: string } | null;
  ticket: {
    id: number;
    title: string;
    status: string;
  } | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  created: 'Created',
  comment: 'Comment',
  status_change: 'Status Change',
  priority_change: 'Priority Change',
  department_change: 'Department Change',
  assigned: 'Assigned',
};

const typePillStyles: Record<string, string> = {
  created: 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20',
  comment: 'bg-stone-100 text-stone-700 border-stone-200',
  status_change: 'bg-amber-50 text-amber-800 border-amber-200',
  priority_change: 'bg-[#F7F6F2] text-stone-700 border-[#E5E2DA]',
  department_change: 'bg-[#F7F6F2] text-stone-700 border-[#E5E2DA]',
  assigned: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

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

function summarizeActivity(item: ActivityLogItem): string {
  switch (item.type) {
    case 'created':
      return 'Submitted a new ticket';
    case 'status_change':
      return `Status: ${item.metadata?.old ?? '—'} → ${item.metadata?.new ?? '—'}`;
    case 'priority_change':
      return `Priority: ${item.metadata?.old ?? '—'} → ${item.metadata?.new ?? '—'}`;
    case 'department_change':
      return `Department: ${item.metadata?.old ?? '—'} → ${item.metadata?.new ?? '—'}`;
    case 'assigned':
      return item.metadata?.new
        ? `Assigned to ${item.metadata.new}`
        : 'Unassigned ticket';
    case 'comment': {
      const plain = (item.body ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const prefix = item.is_internal ? '[Internal Note] ' : '';
      return prefix + (plain.length > 90 ? `${plain.slice(0, 90)}…` : plain || 'Added a comment');
    }
    default:
      return item.type;
  }
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E5E2DA] bg-[#F1EFE9] text-[10px] font-bold text-stone-700">
      {initials}
    </div>
  );
}

export function ActivityLogsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (typeFilter) params.append('type', typeFilter);
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await fetch(`${apiBaseUrl}/v1/activity-logs${qs}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setActivities(data.data.activities ?? []);
      } else {
        setError(data.message || 'Failed to load activity logs.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error loading activity logs.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, debouncedSearch, typeFilter]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    fetchLogs();
  }, [user, navigate, fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(activities.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = activities.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">Activity Logs</h1>
        <p className="mt-1 text-sm text-stone-500">
          System-wide audit trail across all tickets, assignments, and comments.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#E5E2DA] bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E5E2DA] bg-[#FAF9F6] px-4 py-3 sm:px-5">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket, user, or comment..."
              className="h-9 w-full rounded-lg border border-[#E5E2DA] bg-white pl-9 pr-8 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-shadow focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter by event type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="dark-select h-9 rounded-lg border px-3 py-1 text-[13px] font-medium"
          >
            <option value="">All Events</option>
            <option value="created">Created</option>
            <option value="status_change">Status Change</option>
            <option value="priority_change">Priority Change</option>
            <option value="department_change">Department Change</option>
            <option value="assigned">Assigned</option>
            <option value="comment">Comment</option>
          </select>

          {(search || typeFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setTypeFilter('');
                setPage(1);
              }}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E5E2DA] bg-white px-2.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          )}

          <span className="ml-auto text-xs font-medium tabular-nums text-stone-500">
            {activities.length} {activities.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading activity logs...
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-14 text-center text-sm text-stone-500">
            No activity logs match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E2DA] bg-[#FAF9F6]/60 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE6]">
                {paginated.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-[#FAF9F6]">
                    <td className="px-5 py-3.5 max-w-[240px]">
                      {item.ticket ? (
                        <Link
                          to={`/tickets/${item.ticket.id}`}
                          className="group inline-flex flex-col"
                        >
                          <span className="font-mono text-xs font-semibold text-[#0F766E] group-hover:underline">
                            TK-{String(item.ticket.id).padStart(3, '0')}
                          </span>
                          <span className="line-clamp-1 text-xs font-medium text-stone-700">
                            {item.ticket.title}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          typePillStyles[item.type] ?? 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}
                      >
                        {typeLabels[item.type] ?? item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-md text-[13px] text-stone-700">
                      <span className="line-clamp-1">{summarizeActivity(item)}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {item.user ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={item.user.name} />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium text-stone-800">
                              {item.user.name}
                            </span>
                            <SupportBadge
                              category="role"
                              value={item.user.role}
                              className="px-1.5 py-0 text-[10px]"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">System</span>
                      )}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-stone-500 whitespace-nowrap"
                      title={new Date(item.created_at).toLocaleString()}
                    >
                      {formatRelative(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          page={safePage}
          pageSize={pageSize}
          totalItems={activities.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
