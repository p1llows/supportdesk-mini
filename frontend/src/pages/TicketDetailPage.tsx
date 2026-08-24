import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SupportBadge } from '@/components/ui/status-badges';
import { ActivityTimeline, type ActivityData } from '@/components/tickets/ActivityTimeline';
import { CommentForm } from '@/components/tickets/CommentForm';
import {
  Building2,
  AlertCircle,
  Lock,
  Loader2,
  User as UserIcon,
  Paperclip,
  Download,
} from 'lucide-react';

interface TicketDetail {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  department: { id: number; name: string } | null;
  requester: { id: number; name: string; email: string } | null;
  attachments: { id: number; original_name: string; mime_type: string; size_bytes: number; created_at: string }[] | null;
  created_at: string;
  updated_at: string;
}

export const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activitiesLoading, setActivitiesLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleAddComment = async (body: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${id}/comments`, {
        method: 'POST',
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

      return { success: false, error: result.message || 'Failed to add comment.' };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error. Failed to submit comment.',
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
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading ticket...
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">{error}</p>
          <p className="text-xs text-slate-500">
            You may not have access to this ticket with your current role.
          </p>
        </div>
      </div>
    );
  }

  const isClosed = ticket?.status === 'closed';

  return (
    <div className="mx-auto max-w-4xl space-y-6">

        {/* Ticket header card */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  TICKET #{ticket?.id}
                </div>
                <h1 className="text-xl font-bold text-slate-900 break-words">{ticket?.title}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <SupportBadge category="status" value={ticket?.status ?? ''} />
                  <SupportBadge category="priority" value={ticket?.priority ?? ''} />
                  {ticket?.department && (
                    <Badge className="bg-slate-100 text-slate-700 border-slate-300">
                      <Building2 className="w-3 h-3 mr-1 inline" />
                      {ticket.department.name}
                    </Badge>
                  )}
                </div>
              </div>
              {ticket?.requester && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 shrink-0">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-800">{ticket.requester.name}</div>
                    <div className="text-slate-500">{ticket.requester.email}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
              Submitted {formatDate(ticket?.created_at)} · Last updated {formatDate(ticket?.updated_at)}
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        {ticket?.attachments && ticket.attachments.length > 0 && (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Attachments</h2>
              <div className="space-y-2">
                {ticket.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Paperclip className="w-5 h-5 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {attachment.original_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(attachment.size_bytes / 1024).toFixed(1)} KB · {attachment.mime_type}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadAttachment(attachment)}
                      className="shrink-0"
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Description</h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
              {ticket?.description}
            </p>
          </CardContent>
        </Card>

        {/* Unified activity timeline */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Activity</h2>
          <ActivityTimeline
            activities={activities}
            loading={activitiesLoading}
            onDeleteComment={handleDeleteComment}
            onAddReply={handleAddReply}
          />
        </section>

        {/* Comment form — hidden on closed tickets */}
        {!isClosed && (
          <CommentForm onSubmit={handleAddComment} />
        )}
        {isClosed && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600">
            <Lock className="w-4 h-4 text-slate-500" />
            This ticket is closed. Reopen it to add comments.
          </div>
        )}
    </div>
  );
};
