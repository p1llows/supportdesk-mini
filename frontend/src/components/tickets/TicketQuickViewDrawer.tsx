import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, Calendar, Pencil, UserCheck, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichTextDisplay } from '@/components/ui/rich-text-editor';
import { SupportBadge } from '@/components/ui/status-badges';
import type { TicketData } from '@/components/tickets/TicketsTable';

export interface AssignableAgent {
  id: number;
  name: string;
  role: string;
  department_id: number | null;
}

interface TicketQuickViewDrawerProps {
  ticket: TicketData | null;
  role: string;
  agents?: AssignableAgent[];
  mode?: 'drawer' | 'inline';
  onClose: () => void;
  onEdit?: (ticket: TicketData) => void;
  onStatusChange?: (ticket: TicketData, newStatus: TicketData['status']) => void;
  onAssign?: (ticket: TicketData, assigneeId: number | null) => void;
}

const statusLabels: Record<TicketData['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

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

export function TicketQuickViewDrawer({
  ticket,
  role,
  agents = [],
  mode = 'drawer',
  onClose,
  onEdit,
  onStatusChange,
  onAssign,
}: TicketQuickViewDrawerProps) {
  useEffect(() => {
    if (!ticket) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ticket, onClose]);

  if (!ticket) return null;

  const canChangeStatus = role === 'agent' || role === 'admin';
  const canEdit = role === 'admin' || (role === 'requester' && ticket.status === 'open');
  const nextStatuses = allowedNextStatuses(role, ticket.status);
  const formattedId = `TK-${String(ticket.id).padStart(3, '0')}`;

  const panel = (
    <aside
      className={
        mode === 'inline'
          ? 'flex flex-col overflow-hidden rounded-xl border border-[#E5E2DA] bg-white'
          : 'flex h-full w-full max-w-lg flex-col border-l border-[#E5E2DA] bg-white shadow-2xl'
      }
      onClick={(e) => e.stopPropagation()}
      aria-label="Ticket inspector"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E2DA] bg-[#FAF9F6] px-5 py-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-semibold text-stone-500">{formattedId}</span>
          <SupportBadge category="status" value={ticket.status} />
          <SupportBadge category="priority" value={ticket.priority} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-[#E7E4DC] hover:text-stone-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div>
          <h2 id="drawer-ticket-title" className="text-base font-bold leading-snug text-stone-900">
            {ticket.title}
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Created {new Date(ticket.created_at).toLocaleString()}
          </p>
        </div>

        {/* Inline Status Workflow */}
        {canChangeStatus && nextStatuses.length > 0 && (
          <div className="border-t border-[#EFECE6] pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Quick Transition
            </p>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((nextStatus) => (
                <Button
                  key={nextStatus}
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange?.(ticket, nextStatus)}
                  className="h-8 text-xs"
                >
                  Mark as {statusLabels[nextStatus]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2 border-t border-[#EFECE6] pt-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Description
          </h3>
          <RichTextDisplay content={ticket.description} />
        </div>

        {/* Properties */}
        <div className="space-y-2 border-t border-[#EFECE6] pt-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Properties
          </h3>
          <dl className="divide-y divide-[#EFECE6] text-xs">
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-2 text-stone-500">
                <Building2 className="h-3.5 w-3.5 text-stone-400" />
                Department
              </dt>
              <dd className="font-semibold text-stone-900">{ticket.department?.name ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 py-2.5">
              <dt className="flex items-center gap-2 text-stone-500">
                <UserCheck className="h-3.5 w-3.5 text-stone-400" />
                Assignee
              </dt>
              <dd>
                {canChangeStatus && ticket.status !== 'closed' && onAssign ? (
                  <select
                    aria-label="Assign ticket"
                    value={ticket.assigned_to ?? ''}
                    onChange={(e) => onAssign(ticket, e.target.value ? Number(e.target.value) : null)}
                    className="dark-select h-7 rounded-md border px-2 text-xs font-medium"
                  >
                    <option value="">Unassigned</option>
                    {agents
                      .filter((a) => a.role === 'admin' || a.department_id === ticket.department?.id)
                      .map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <span className="font-semibold text-stone-900">
                    {ticket.assignee?.name ?? 'Unassigned'}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-2 text-stone-500">
                <UserRound className="h-3.5 w-3.5 text-stone-400" />
                Requester
              </dt>
              <dd className="text-right">
                <p className="font-semibold text-stone-900">{ticket.requester?.name ?? '—'}</p>
                {ticket.requester?.email && (
                  <p className="text-[11px] text-stone-500">{ticket.requester.email}</p>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-2 text-stone-500">
                <Calendar className="h-3.5 w-3.5 text-stone-400" />
                Last Updated
              </dt>
              <dd className="font-mono text-stone-700">
                {new Date(ticket.updated_at).toISOString().slice(0, 10)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-[#E5E2DA] bg-[#FAF9F6] px-5 py-3.5">
        {canEdit && onEdit ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onEdit(ticket);
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit Ticket
          </Button>
        ) : (
          <div />
        )}

        <Link
          to={`/tickets/${ticket.id}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F766E] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#115E59]"
        >
          Open Full Thread
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );

  if (mode === 'inline') {
    return panel;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/30 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-ticket-title"
    >
      {panel}
    </div>
  );
}
