import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
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
  department?: {
    id: number;
    name: string;
  } | null;
  requester?: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface TicketsTableProps {
  tickets: TicketData[];
  loading: boolean;
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
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
          <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="p-14 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Ticket className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">No Tickets Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          There are currently no tickets matching your active filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-4 py-3.5">Title</th>
              <th className="px-4 py-3.5">Department</th>
              <th className="px-4 py-3.5">Priority</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Requester</th>
              <th className="px-4 py-3.5">Created</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => {
              const sStyle = statusStyles[ticket.status] ?? statusStyles.open;

              return (
                <tr key={ticket.id} className="transition-colors hover:bg-slate-50/90">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-500 whitespace-nowrap">
                    <Link to={`/tickets/${ticket.id}`} className="hover:text-indigo-600 transition-colors">
                      {formatTicketId(ticket.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="font-semibold text-slate-900 text-sm line-clamp-1 hover:text-indigo-600 transition-colors"
                      title={ticket.title}
                    >
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                    {ticket.department?.name ?? '—'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityStyles[ticket.priority] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                      {priorityLabels[ticket.priority] ?? ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {canChangeStatus ? (
                      <select
                        value={ticket.status}
                        onChange={(e) => onStatusChange?.(ticket, e.target.value as TicketData['status'])}
                        aria-label={`Change status for ${formatTicketId(ticket.id)}`}
                        className={`h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold ${sStyle.text} outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
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
                  <td className="px-4 py-4 whitespace-nowrap">
                    {ticket.requester ? (
                      <div className="flex items-center gap-2.5">
                        <Avatar name={ticket.requester.name} color={nameColor(ticket.requester.name)} />
                        <span className="text-sm font-medium text-slate-700">{ticket.requester.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs font-medium tabular-nums text-slate-500 whitespace-nowrap">
                    {formatDate(ticket.created_at)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    {(canEdit || canDelete) && (
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onEditTicket?.(ticket)}
                            disabled={role === 'requester' && ticket.status !== 'open'}
                            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
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
                            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
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

      {/* Delete Ticket Confirmation Dialog */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <Trash2 className="w-5 h-5" />
                <span>Confirm Ticket Deletion</span>
              </div>
              <button
                onClick={() => setTicketToDelete(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Are you sure you want to permanently delete ticket <strong className="text-slate-800">{formatTicketId(ticketToDelete.id)}</strong> ("{ticketToDelete.title}")? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTicketToDelete(null)}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
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
