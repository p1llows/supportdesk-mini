import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { SupportBadge } from '@/components/ui/status-badges';
import {
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Building2,
  MessageSquare,
  Reply,
} from 'lucide-react';

export interface ActivityData {
  id: number;
  type: 'created' | 'comment' | 'status_change' | 'priority_change' | 'department_change' | string;
  body: string | null;
  metadata: { old?: string; new?: string } | null;
  parent_id: number | null;
  is_edited: boolean;
  user: {
    id: number;
    name: string;
    role: string;
  } | null;
  created_at: string;
  updated_at: string;
  replies?: ActivityData[];
}

interface ActivityTimelineProps {
  activities: ActivityData[];
  loading: boolean;
  onDeleteComment: (activity: ActivityData) => Promise<void>;
  onAddReply: (parentActivity: ActivityData, body: string) => Promise<{ success: boolean; error?: string }>;
}

export const formatRelative = (isoString: string): string => {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};


export const SystemEventLine: React.FC<{ activity: ActivityData }> = ({ activity }) => {
  const name = activity.user?.name ?? 'System';

  let icon = <PlusCircle className="w-3.5 h-3.5 text-slate-400" />;
  let description = <span>did something</span>;

  switch (activity.type) {
    case 'created':
      description = <span><strong className="text-slate-700">{name}</strong> created this ticket</span>;
      break;
    case 'status_change':
      icon = <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />;
      description = (
        <span>
          <strong className="text-slate-700">{name}</strong> changed status from{' '}
          <code className="bg-slate-100 px-1 rounded">{activity.metadata?.old}</code> to{' '}
          <code className="bg-slate-100 px-1 rounded">{activity.metadata?.new}</code>
        </span>
      );
      break;
    case 'priority_change':
      icon = <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      description = (
        <span>
          <strong className="text-slate-700">{name}</strong> changed priority from{' '}
          <code className="bg-slate-100 px-1 rounded">{activity.metadata?.old}</code> to{' '}
          <code className="bg-slate-100 px-1 rounded">{activity.metadata?.new}</code>
        </span>
      );
      break;
    case 'department_change':
      icon = <Building2 className="w-3.5 h-3.5 text-indigo-600" />;
      description = (
        <span>
          <strong className="text-slate-700">{name}</strong> reassigned department from{' '}
          <code className="bg-slate-100 px-1 rounded">{activity.metadata?.old}</code> to{' '}
          <code className="bg-slate-100 px-1 rounded">{activity.metadata?.new}</code>
        </span>
      );
      break;
  }

  return (
    <div className="flex items-center gap-2 py-2 pl-1 text-xs text-slate-500">
      {icon}
      <span>{description}</span>
      <span className="text-slate-400 shrink-0">· {formatRelative(activity.created_at)}</span>
    </div>
  );
};

const ReplyForm: React.FC<{
  parentActivity: ActivityData;
  onSubmit: (body: string) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}> = ({ parentActivity, onSubmit, onCancel }) => {
  const [body, setBody] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await onSubmit(body.trim());

    if (result.success) {
      setBody('');
    } else {
      setError(result.error || 'Failed to add reply.');
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3 ml-8 mt-2">
      <label htmlFor={`reply-${parentActivity.id}`} className="text-sm font-semibold text-slate-700">
        Reply to {parentActivity.user?.name ?? 'Unknown'}
      </label>
      <textarea
        id={`reply-${parentActivity.id}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={5000}
        disabled={submitting}
        placeholder="Write your reply..."
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:bg-slate-50 resize-y"
      />

      {error && (
        <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <span className="text-xs text-slate-400">{body.length}/5000</span>
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="ml-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Replying...' : 'Reply'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="ml-2 px-3 py-1.5 text-sm font-medium text-slate-600 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const CommentCard: React.FC<{
  activity: ActivityData;
  canDelete: boolean;
  onDelete: (activity: ActivityData) => Promise<void>;
  onAddReply: (parentActivity: ActivityData, body: string) => Promise<{ success: boolean; error?: string }>;
  depth?: number;
}> = ({ activity, canDelete, onDelete, onAddReply, depth = 0 }) => {
  const [showReplyForm, setShowReplyForm] = React.useState(false);
  const { user } = useAuth();
  const canReply = !!user && activity.type === 'comment';

  const renderReplies = () => {
    if (!activity.replies || activity.replies.length === 0) {
      return null;
    }

    return (
      <div className="ml-8 mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
        {activity.replies.map((reply) => (
          <CommentCard
            key={reply.id}
            activity={reply}
            canDelete={canDelete}
            onDelete={onDelete}
            onAddReply={onAddReply}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  };

  const marginLeft = depth * 32;

  return (
    <div style={{ marginLeft }} className="space-y-2">
      <div className="py-3">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                {activity.user?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {activity.user?.name ?? 'Unknown'}
                </span>
                {activity.user && <SupportBadge category="role" value={activity.user.role} className="text-[10px] px-1.5 py-0" />}
                <span className="text-xs text-slate-400">
                  · {formatRelative(activity.created_at)}
                </span>
                {activity.is_edited && (
                  <span className="text-xs text-slate-400 italic">(edited)</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {canReply && (
                <button
                  onClick={() => setShowReplyForm(true)}
                  title="Reply"
                  className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
                >
                  <Reply className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap break-words pl-9">
            {activity.body}
          </p>
          {showReplyForm && (
            <ReplyForm
              parentActivity={activity}
              onSubmit={async (body) => {
                const result = await onAddReply(activity, body);
                if (result.success) {
                  setShowReplyForm(false);
                }
                return result;
              }}
              onCancel={() => setShowReplyForm(false)}
            />
          )}
        </div>
      </div>
      {renderReplies()}
    </div>
  );
};


export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  loading,
  onDeleteComment,
  onAddReply,
}) => {
  const { user } = useAuth();
  const canDeleteComments = user?.role === 'admin';

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-full bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center space-y-2">
        <MessageSquare className="w-6 h-6 text-slate-400 mx-auto" />
        <p className="text-xs text-slate-500">No activity on this ticket yet.</p>
      </div>
    );
  }

  return (
    <div className="pl-3 border-l-2 border-slate-200 ml-2 space-y-0">
      {activities.map((activity) =>
        activity.type === 'comment' ? (
          <CommentCard
            key={activity.id}
            activity={activity}
            canDelete={canDeleteComments}
            onDelete={onDeleteComment}
            onAddReply={onAddReply}
          />
        ) : (
          <SystemEventLine key={activity.id} activity={activity} />
        )
      )}
    </div>
  );
};
