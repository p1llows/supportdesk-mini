import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  Building2,
  Edit3,
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
}

export const TicketsTable: React.FC<TicketsTableProps> = ({
  tickets,
  loading,
  onEditTicket,
  onDeleteTicket,
}) => {
  const { user } = useAuth();
  const [ticketToDelete, setTicketToDelete] = useState<TicketData | null>(null);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="w-3 h-3 mr-1 inline" />
            Open
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            <AlertCircle className="w-3 h-3 mr-1 inline" />
            In Progress
          </Badge>
        );
      case 'resolved':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 inline" />
            Resolved
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary">
            Closed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canEditTicket = (ticket: TicketData): boolean => {
    if (ticket.status === 'closed') return false; // Universal closed ticket lock
    if (user?.role === 'admin' || user?.role === 'agent') return true;
    if (user?.role === 'requester') {
      return ticket.status === 'open' && ticket.requester?.id === user.id;
    }
    return false;
  };

  const canDeleteTicket = (): boolean => {
    return user?.role === 'admin'; // Delete is strictly for Admin
  };

  const confirmDelete = () => {
    if (ticketToDelete && onDeleteTicket) {
      onDeleteTicket(ticketToDelete);
      setTicketToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Ticket className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">No Tickets Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          There are currently no tickets matching your active role view.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Ticket className="w-4 h-4 text-blue-600" />
            Support Ticket Queue
          </h3>
          <p className="text-xs text-slate-500">
            Displaying {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Title & Description</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Submitted Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => {
              const showEdit = canEditTicket(ticket);
              const showDelete = canDeleteTicket();

              return (
                <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-500">
                    #{ticket.id}
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <div className="font-bold text-slate-900 text-sm line-clamp-1">
                      {ticket.title}
                    </div>
                    <div className="text-slate-500 line-clamp-1 text-xs mt-0.5">
                      {ticket.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ticket.department ? (
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-medium">
                        <Building2 className="w-3 h-3 mr-1 text-slate-500 inline" />
                        {ticket.department.name}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ticket.requester ? (
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ticket.requester.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getPriorityBadge(ticket.priority)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(ticket.status)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                    {formatDate(ticket.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {showEdit && onEditTicket && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTicket(ticket)}
                          className="h-8 px-2 text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Edit Ticket"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {showDelete && onDeleteTicket && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTicketToDelete(ticket)}
                          className="h-8 px-2 text-slate-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {!showEdit && !showDelete && (
                        <span className="text-slate-400 text-xs px-2">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Ticket Confirmation Dialog */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <Trash2 className="w-5 h-5" />
                <span>Confirm Ticket Deletion</span>
              </div>
              <button
                onClick={() => setTicketToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete ticket <strong className="text-slate-900">#{ticketToDelete.id}</strong> ("{ticketToDelete.title}")? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTicketToDelete(null)}
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
