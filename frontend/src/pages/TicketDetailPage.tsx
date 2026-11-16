import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichTextDisplay } from '@/components/ui/rich-text-editor';
import { SupportBadge } from '@/components/ui/status-badges';
import { ActivityTimeline, type ActivityData } from '@/components/tickets/ActivityTimeline';
import { CommentForm } from '@/components/tickets/CommentForm';
import {
  ArrowLeft,
  Building2,
  AlertCircle,
  Calendar,
  Lock,
  Loader2,
  User as UserIcon,
  UserCheck,
  Paperclip,
  Download,
} from 'lucide-react';
import type { AssignableAgent } from '@/components/tickets/TicketQuickViewDrawer';

interface TicketDetail {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to?: number | null;
  department: { id: number; name: string } | null;
  requester: { id: number; name: string; email: string } | null;
  assignee?: { id: number; name: string; email: string } | null;
  attachments: { id: number; original_name: string; mime_type: string; size_bytes: number; created_at: string }[] | null;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

function allowedNextStatuses(role: string, current: string): string[] {
  const next: string[] = [];
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

export const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [agents, setAgents] = useState<AssignableAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activitiesLoading, setActivitiesLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const authHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  });

  // Fetch ticket header + timeline in parallel
  useEffect(() => {
    if (!token || !id) return;

    const fetchData = async () => {
      setLoading(true);
      setActivitiesLoading(true);
      setError(null);

      try {
        const [ticketRes, activitiesRes] = await Promise.all([
          fetch(`${apiBaseUrl}/v1/tickets/${id}`, { headers: authHeaders() }),
          fetch(`${apiBaseUrl}/v1/tickets/${id}/activities`, { headers: authHeaders() }),
        ]);

        if (ticketRes.status === 403 || activitiesRes.status === 403) {
          setError('You are not authorized to view this ticket.');
          setLoading(false);
          return;
        }

        if (ticketRes.status === 404) {
          setError('Ticket not found.');
          setLoading(false);
          return;
        }

        const ticketJson = await ticketRes.json();
        const activitiesJson = await activitiesRes.json();

        if (ticketRes.ok && ticketJson.status === 'success') {
          setTicket(ticketJson.data.ticket);
        } else {
          setError(ticketJson.message || 'Failed to load ticket.');
        }

        if (activitiesRes.ok && activitiesJson.status === 'success') {
          setActivities(activitiesJson.data.activities ?? []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend server');
      } finally {
        setLoading(false);
        setActivitiesLoading(false);
      }
    };

    fetchData();
  }, [id, token, apiBaseUrl]);

  useEffect(() => {
    if (!token || user?.role === 'requester') return;
    fetch(`${apiBaseUrl}/v1/users`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((result) => {
        if (result.status === 'success') {
          setAgents(
            (result.data.users || []).filter(
              (u: AssignableAgent) => u.role === 'agent' || u.role === 'admin'
            )
          );
        }
      })
      .catch(() => {});
  }, [token, apiBaseUrl, user?.role]);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    setActionError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setTicket((prev) => (prev ? { ...prev, status: newStatus } : prev));
        await refetchActivities();
      } else {
        setActionError(result.message || 'Failed to update ticket status.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Network error updating status.');
    }
  };

  const handleAssign = async (assigneeId: number | null) => {
    if (!ticket) return;
    setActionError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigned_to: assigneeId }),
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        const updated = result.data.ticket;
        setTicket((prev) =>
          prev ? { ...prev, assigned_to: updated.assigned_to, assignee: updated.assignee } : prev
        );
        await refetchActivities();
      } else {
        setActionError(result.message || 'Failed to assign ticket.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Network error assigning ticket.');
    }
  };

  const refetchActivities = async () => {
    if (!token || !id) return;
    setActivitiesLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${id}/activities`, {
        headers: authHeaders(),
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setActivities(result.data.activities ?? []);
      }
    } catch {
      // Timeline refresh errors are non-fatal; existing entries remain shown.
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleAddComment = async (
    body: string,
    isInternal = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${id}/comments`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body, is_internal: isInternal }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        await refetchActivities();
        return { success: true };
      }

      return { success: false, error: result.message || 'Failed to add comment.' };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error. Failed to submit comment.',
      };
    }
  };

  const handleEditComment = async (
    activity: ActivityData,
    body: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${id}/comments/${activity.id}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        await refetchActivities();
        return { success: true };
      }

      return { success: false, error: result.message || 'Failed to update comment.' };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error. Failed to update comment.',
      };
    }
  };

  const handleDeleteComment = async (activity: ActivityData): Promise<void> => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/v1/tickets/${id}/comments/${activity.id}`,
        {
          method: 'DELETE',
          headers: authHeaders(),
        }
      );

      if (response.ok) {
        await refetchActivities();
      }
    } catch {
      // Deletion refresh failures are non-fatal.
    }
  };

  const handleAddReply = async (parentActivity: ActivityData, body: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/v1/tickets/${id}/comments`,
        {
          method: 'POST',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ body, parent_id: parentActivity.id }),
        }
      );

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        await refetchActivities();
        return { success: true };
      }

      return { success: false, error: result.message || 'Failed to add reply.' };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error. Failed to submit reply.',
      };
    }
  };

  const handleDownloadAttachment = async (attachment: { id: number; original_name: string }) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/v1/tickets/${id}/attachments/${attachment.id}/download`,
        { headers: authHeaders() }
      );

      if (!response.ok) {
        const result = await response.json();
        alert(result.message || 'Failed to download attachment');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.original_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download attachment');
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-stone-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading ticket...
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="p-6 rounded-xl bg-white border border-[#E5E2DA] shadow-sm text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-stone-800">{error}</p>
          <p className="text-xs text-stone-500">
            You may not have access to this ticket with your current role.
          </p>
        </div>
      </div>
    );
  }

  const isClosed = ticket?.status === 'closed';
  const role = user?.role ?? 'requester';
  const canManageTicket = role === 'admin' || role === 'agent';
  const nextStatuses = allowedNextStatuses(role, ticket?.status ?? '');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back breadcrumb */}
      <div>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 transition-colors hover:text-[#0F766E]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Tickets
        </Link>
      </div>

      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Ticket header card */}
      <Card className="border-[#E5E2DA] shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-stone-400">
                TICKET #{ticket?.id}
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 break-words">{ticket?.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <SupportBadge category="status" value={ticket?.status ?? ''} />
                <SupportBadge category="priority" value={ticket?.priority ?? ''} />
                {ticket?.department && (
                  <Badge className="bg-stone-100 text-stone-700 border-[#E5E2DA]">
                    <Building2 className="w-3 h-3 mr-1 inline" />
                    {ticket.department.name}
                  </Badge>
                )}
              </div>
            </div>

            {canManageTicket && nextStatuses.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {nextStatuses.map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(nextStatus)}
                  >
                    Mark as {statusLabels[nextStatus] ?? nextStatus}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2-column content + metadata sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card className="border-[#E5E2DA] shadow-xs">
            <CardContent className="p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Description</h2>
              <RichTextDisplay content={ticket?.description ?? ''} />
            </CardContent>
          </Card>

          {/* Unified activity timeline */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Activity</h2>
            <ActivityTimeline
              activities={activities}
              loading={activitiesLoading}
              isClosed={isClosed}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              onAddReply={handleAddReply}
            />
          </section>

          {/* Comment form — hidden on closed tickets */}
          {!isClosed && (
            <CommentForm
              canPostInternal={canManageTicket}
              onSubmit={handleAddComment}
            />
          )}
          {isClosed && (
            <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-stone-100 border border-[#E5E2DA] text-sm text-stone-600">
              <Lock className="w-4 h-4 text-stone-500" />
              This ticket is closed. Reopen it to add comments.
            </div>
          )}
        </div>

        {/* Metadata & Attachments Sidebar */}
        <div className="space-y-6">
          <Card className="border-[#E5E2DA] shadow-xs">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Details</h2>

              {ticket?.requester && (
                <div className="flex items-center gap-3 pb-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F766E] text-white">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-stone-900 truncate">{ticket.requester.name}</p>
                    <p className="text-stone-500 truncate">{ticket.requester.email}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2.5 border-t border-stone-100 pt-3 text-xs">
                <div className="flex items-center justify-between gap-2 text-stone-500">
                  <span className="inline-flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-stone-400" />
                    Assignee
                  </span>
                  {canManageTicket && !isClosed ? (
                    <select
                      aria-label="Assign ticket"
                      value={ticket?.assigned_to ?? ''}
                      onChange={(e) => handleAssign(e.target.value ? Number(e.target.value) : null)}
                      className="dark-select h-7 rounded-md border px-2 text-xs font-medium"
                    >
                      <option value="">Unassigned</option>
                      {agents
                        .filter((a) => a.role === 'admin' || a.department_id === ticket?.department?.id)
                        .map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <span className="font-medium text-stone-700">
                      {ticket?.assignee?.name ?? 'Unassigned'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 text-stone-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    Created
                  </span>
                  <span className="font-medium text-stone-700">{formatDate(ticket?.created_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-stone-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    Updated
                  </span>
                  <span className="font-medium text-stone-700">{formatDate(ticket?.updated_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {ticket?.attachments && ticket.attachments.length > 0 && (
            <Card className="border-[#E5E2DA] shadow-xs">
              <CardContent className="p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Attachments</h2>
                <div className="space-y-2">
                  {ticket.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between gap-2 p-2.5 bg-stone-50 rounded-lg border border-[#E5E2DA] hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Paperclip className="w-4 h-4 text-stone-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-900 truncate">
                            {attachment.original_name}
                          </p>
                          <p className="text-[11px] text-stone-500">
                            {(attachment.size_bytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                        className="shrink-0 h-8 px-2.5 text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
