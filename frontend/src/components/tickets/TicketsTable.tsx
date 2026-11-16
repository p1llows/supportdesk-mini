import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';

export interface TicketData {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: number | null;
  department?: {
    id: number;
    name: string;
  } | null;
  requester?: {
    id: number;
    name: string;
    email: string;
  } | null;
  assignee?: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

type SortKey = 'id' | 'priority' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;
const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
const statusRank: Record<string, number> = { open: 1, in_progress: 2, resolved: 3, closed: 4 };

interface TicketsTableProps {
  tickets: TicketData[];
  loading: boolean;
  selectedTicketId?: number | null;
  onSelectTicket?: (ticket: TicketData) => void;
  onEditTicket?: (ticket: TicketData) => void;
  onDeleteTicket?: (ticket: TicketData) => void;
  onStatusChange?: (ticket: TicketData, newStatus: TicketData['status']) => void;
}

// Avatar initials component
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

// Generate deterministic color from name
function nameColor(name: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const priorityStyles: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  high: 'bg-red-50 text-red-700 ring-red-200',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const statusStyles: Record<string, { dot: string; text: string; pill: string }> = {
  open: { dot: 'bg-emerald-500', text: 'text-emerald-700', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  in_progress: { dot: 'bg-blue-500', text: 'text-blue-700', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
  resolved: { dot: 'bg-purple-500', text: 'text-purple-700', pill: 'bg-purple-50 text-purple-700 ring-purple-200' },
  closed: { dot: 'bg-slate-400', text: 'text-slate-600', pill: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

// Forward-only status workflow per role (mirrors backend TicketStatusController):
// Agent/Admin: open → in_progress → resolved. Admin only: resolved → closed, closed → open.
function allowedNextStatuses(role: string, current: TicketData['status']): TicketData['status'][] {
  const next: TicketData['status'][] = [];
  if (role === 'agent' || role === 'admin') {
    if (current === 'open') next.push('in_progress');
    if (current === 'in_progress') next.push('resolved');
  }
  if (role === 'admin') {
    if (current === 'resolved') next.push('closed');
    if (current === 'closed') next.push('open');
  }
  return next;
}

export const TicketsTable: React.FC<TicketsTableProps> = ({
  tickets,
  loading,
  selectedTicketId,
  onSelectTicket,
  onEditTicket,
  onDeleteTicket,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const role = user?.role ?? 'requester';
  const canEdit = role === 'admin' || role === 'requester';
  const canDelete = role === 'admin';
  const canChangeStatus = role === 'agent' || role === 'admin';
  const [ticketToDelete, setTicketToDelete] = useState<TicketData | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState<number>(1);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'created_at' || key === 'id' || key === 'priority' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const sortedTickets = useMemo(() => {
    const copy = [...tickets];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'id') {
        cmp = a.id - b.id;
      } else if (sortKey === 'priority') {
        cmp = (priorityRank[a.priority] ?? 0) - (priorityRank[b.priority] ?? 0);
      } else if (sortKey === 'status') {
        cmp = (statusRank[a.status] ?? 0) - (statusRank[b.status] ?? 0);
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [tickets, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedTickets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedTickets = sortedTickets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 text-stone-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[#0F766E]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#0F766E]" />
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateString).toISOString().slice(0, 10);
  };

  const formatTicketId = (id: number) => {
    return `TK-${String(id).padStart(3, '0')}`;
  };

  const confirmDelete = () => {
    if (ticketToDelete && onDeleteTicket) {
      onDeleteTicket(ticketToDelete);
      setTicketToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 bg-zinc-200 rounded animate-pulse" />
          <div className="h-5 w-24 bg-zinc-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full bg-zinc-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="p-14 text-center space-y-2.5">
        <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
          <Ticket className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-zinc-900 text-sm">No tickets found</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          There are currently no tickets matching your active filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-[#E5E2DA] bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-5 py-3">
                <button type="button" onClick={() => toggleSort('id')} className="inline-flex items-center gap-1 hover:text-stone-900">
                  ID <SortIcon column="id" />
                </button>
              </th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => toggleSort('priority')} className="inline-flex items-center gap-1 hover:text-stone-900">
                  Priority <SortIcon column="priority" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 hover:text-stone-900">
                  Status <SortIcon column="status" />
                </button>
              </th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => toggleSort('created_at')} className="inline-flex items-center gap-1 hover:text-stone-900">
                  Created <SortIcon column="created_at" />
                </button>
              </th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFECE6]">
            {paginatedTickets.map((ticket) => {
              const sStyle = statusStyles[ticket.status] ?? statusStyles.open;

              return (
                <tr
                  key={ticket.id}
                  onClick={() => onSelectTicket?.(ticket)}
                  className={`group cursor-pointer transition-colors hover:bg-[#FAF9F6] ${
                    selectedTicketId === ticket.id ? 'bg-[#0F766E]/5 ring-1 ring-inset ring-[#0F766E]/25' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 font-mono text-xs font-medium tabular-nums text-stone-500 whitespace-nowrap">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-[#0F766E] transition-colors"
                    >
                      {formatTicketId(ticket.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 max-w-sm">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-stone-900 text-sm line-clamp-1 hover:text-[#0F766E] transition-colors"
                      title={ticket.title}
                    >
                      {ticket.title}
                    </Link>
                    {ticket.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                        {ticket.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-stone-600 whitespace-nowrap">
                    {ticket.department?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityStyles[ticket.priority] ?? 'bg-stone-100 text-stone-600 ring-stone-200'}`}>
                      {priorityLabels[ticket.priority] ?? ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {canChangeStatus ? (
                      <select
                        value={ticket.status}
                        onChange={(e) => onStatusChange?.(ticket, e.target.value as TicketData['status'])}
                        aria-label={`Change status for ${formatTicketId(ticket.id)}`}
                        className={`h-8 rounded-lg border border-[#E5E2DA] bg-white px-2.5 text-xs font-semibold ${sStyle.text} outline-none transition-shadow focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15`}
                      >
                        <option value={ticket.status}>{statusLabels[ticket.status] ?? ticket.status}</option>
                        {allowedNextStatuses(role, ticket.status).map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status] ?? status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${sStyle.pill}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${sStyle.dot}`} />
                        {statusLabels[ticket.status] ?? ticket.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={ticket.assignee.name} color={nameColor(ticket.assignee.name)} />
                        <span className="text-[13px] font-medium text-stone-700">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-stone-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {ticket.requester ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={ticket.requester.name} color={nameColor(ticket.requester.name)} />
                        <span className="text-[13px] font-medium text-stone-700">{ticket.requester.name}</span>
                      </div>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3.5 text-xs font-medium tabular-nums text-stone-500 whitespace-nowrap"
                    title={ticket.created_at ? new Date(ticket.created_at).toLocaleString() : undefined}
                  >
                    {formatDate(ticket.created_at)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    {(canEdit || canDelete) && (
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onEditTicket?.(ticket)}
                            disabled={role === 'requester' && ticket.status !== 'open'}
                            className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                            title={
                              role === 'requester' && ticket.status !== 'open'
                                ? 'Requesters can only edit their own open tickets'
                                : `Edit ${formatTicketId(ticket.id)}`
                            }
                            aria-label={`Edit ticket ${formatTicketId(ticket.id)}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setTicketToDelete(ticket)}
                            className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title={`Delete ${formatTicketId(ticket.id)}`}
                            aria-label={`Delete ticket ${formatTicketId(ticket.id)}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E5E2DA] bg-[#FAF9F6] px-5 py-3 text-xs text-stone-500">
          <span className="tabular-nums">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedTickets.length)} of{' '}
            {sortedTickets.length}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
              Prev
            </Button>
            <span className="px-2 font-mono tabular-nums text-stone-700">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="h-7 px-2 text-xs"
            >
              Next
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Ticket Confirmation Dialog */}
      {ticketToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs"
          onClick={() => setTicketToDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-xl border border-zinc-200 shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Confirm Ticket Deletion</span>
              </div>
              <button
                onClick={() => setTicketToDelete(null)}
                aria-label="Close dialog"
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-zinc-500">
              Are you sure you want to permanently delete ticket <strong className="text-zinc-900">{formatTicketId(ticketToDelete.id)}</strong> ("{ticketToDelete.title}")? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTicketToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
              >
                Delete Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
