import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { RichTextDisplay, RichTextEditor } from '@/components/ui/rich-text-editor';
import { SupportBadge } from '@/components/ui/status-badges';
import {
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Building2,
  MessageSquare,
  Pencil,
  Reply,
  Trash2,
  UserCheck,
  Lock,
} from 'lucide-react';

export interface ActivityData {
  id: number;
  type: 'created' | 'comment' | 'status_change' | 'priority_change' | 'department_change' | 'assigned' | string;
  body: string | null;
  is_internal?: boolean;
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
  isClosed?: boolean;
  onEditComment?: (activity: ActivityData, body: string) => Promise<{ success: boolean; error?: string }>;
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

  let icon = <PlusCircle className="w-3.5 h-3.5 text-zinc-400" />;
  let description = <span>did something</span>;

  switch (activity.type) {
    case 'created':
      description = <span><strong className="text-zinc-700">{name}</strong> created this ticket</span>;
      break;
    case 'status_change':
      icon = <RefreshCw className="w-3.5 h-3.5 text-blue-600" />;
      description = (
        <span>
          <strong className="text-zinc-700">{name}</strong> changed status from{' '}
          <code className="bg-zinc-100 px-1 rounded">{activity.metadata?.old}</code> to{' '}
          <code className="bg-zinc-100 px-1 rounded">{activity.metadata?.new}</code>
        </span>
      );
      break;
    case 'priority_change':
      icon = <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      description = (
        <span>
          <strong className="text-zinc-700">{name}</strong> changed priority from{' '}
          <code className="bg-zinc-100 px-1 rounded">{activity.metadata?.old}</code> to{' '}
          <code className="bg-zinc-100 px-1 rounded">{activity.metadata?.new}</code>
        </span>
      );
      break;
    case 'department_change':
      icon = <Building2 className="w-3.5 h-3.5 text-blue-600" />;
      description = (
        <span>
          <strong className="text-zinc-700">{name}</strong> reassigned department from{' '}
          <code className="bg-zinc-100 px-1 rounded">{activity.metadata?.old}</code> to{' '}
          <code className="bg-zinc-100 px-1 rounded">{activity.metadata?.new}</code>
        </span>
      );
      break;
    case 'assigned':
      icon = <UserCheck className="w-3.5 h-3.5 text-[#0F766E]" />;
      description = (
        <span>
          <strong className="text-zinc-700">{name}</strong>{' '}
          {activity.metadata?.new ? (
            <>
              assigned ticket to <code className="bg-zinc-100 px-1 rounded">{activity.metadata.new}</code>
            </>
          ) : (
            <>unassigned the ticket</>
          )}
        </span>
      );
      break;
  }

  return (
    <div className="flex items-center gap-2 py-2 pl-1 text-xs text-zinc-500">
      {icon}
      <span>{description}</span>
      <span className="text-zinc-400 shrink-0">· {formatRelative(activity.created_at)}</span>
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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4 space-y-3 ml-8 mt-2">
      <label htmlFor={`reply-${parentActivity.id}`} className="text-sm font-semibold text-zinc-700">
        Reply to {parentActivity.user?.name ?? 'Unknown'}
      </label>
      <RichTextEditor
        id={`reply-${parentActivity.id}`}
        value={body}
        onChange={setBody}
        rows={2}
        maxLength={5000}
        disabled={submitting}
        placeholder="Write your reply..."
      />

      {error && (
        <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <span className="text-xs text-zinc-400">{body.length}/5000</span>
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="ml-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Replying...' : 'Reply'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="ml-2 px-3 py-1.5 text-sm font-medium text-zinc-600 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const CommentCard: React.FC<{
  activity: ActivityData;
  isClosed?: boolean;
  canDelete: boolean;
  onEdit?: (activity: ActivityData, body: string) => Promise<{ success: boolean; error?: string }>;
  onDelete: (activity: ActivityData) => Promise<void>;
  onAddReply: (parentActivity: ActivityData, body: string) => Promise<{ success: boolean; error?: string }>;
  depth?: number;
}> = ({ activity, isClosed = false, canDelete, onEdit, onDelete, onAddReply, depth = 0 }) => {
  const [showReplyForm, setShowReplyForm] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(activity.body ?? '');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const { user } = useAuth();
  const canReply = !!user && !isClosed && activity.type === 'comment';
  const canEdit =
    !!user &&
    !isClosed &&
    !!onEdit &&
    activity.type === 'comment' &&
    (user.role === 'admin' || user.id === activity.user?.id);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onEdit || !editBody.replace(/<[^>]+>/g, '').trim()) {
      setEditError('Comment cannot be empty.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    const res = await onEdit(activity, editBody);
    if (res.success) {
      setIsEditing(false);
    } else {
      setEditError(res.error || 'Failed to update comment.');
    }
    setSavingEdit(false);
  };

  const renderReplies = () => {
    if (!activity.replies || activity.replies.length === 0) {
      return null;
    }

    return (
      <div className="ml-8 mt-2 space-y-2 border-l-2 border-zinc-200 pl-3">
        {activity.replies.map((reply) => (
          <CommentCard
            key={reply.id}
            activity={reply}
            isClosed={isClosed}
            canDelete={canDelete}
            onEdit={onEdit}
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
        <div
          className={`rounded-lg border p-4 space-y-2 ${
            activity.is_internal
              ? 'border-amber-200 bg-amber-50/50'
              : 'border-[#E5E2DA] bg-white'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#F1EFE9] border border-[#E5E2DA] flex items-center justify-center text-stone-700 font-bold text-xs shrink-0">
                {activity.user?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-sm font-bold text-zinc-900 truncate">
                  {activity.user?.name ?? 'Unknown'}
                </span>
                {activity.user && <SupportBadge category="role" value={activity.user.role} className="text-[10px] px-1.5 py-0" />}
                {activity.is_internal && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    <Lock className="h-2.5 w-2.5" />
                    Internal Note
                  </span>
                )}
                <span className="text-xs text-zinc-400">
                  · {formatRelative(activity.created_at)}
                </span>
                {activity.is_edited && (
                  <span className="text-xs text-zinc-400 italic">(edited)</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {canReply && (
                <button
                  type="button"
                  onClick={() => setShowReplyForm(true)}
                  title="Reply"
                  aria-label="Reply to comment"
                  className="p-1.5 rounded-md text-stone-400 hover:text-[#0F766E] hover:bg-[#F7F6F2] transition-colors shrink-0"
                >
                  <Reply className="w-4 h-4" />
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setEditBody(activity.body ?? '');
                    setEditError(null);
                    setIsEditing((prev) => !prev);
                  }}
                  title="Edit comment"
                  aria-label="Edit comment"
                  className="p-1.5 rounded-md text-stone-400 hover:text-stone-900 hover:bg-[#F7F6F2] transition-colors shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    await onDelete(activity);
                    setDeleting(false);
                  }}
                  title="Delete comment"
                  aria-label="Delete comment"
                  className="p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="pl-9">
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-2">
                <RichTextEditor
                  value={editBody}
                  onChange={setEditBody}
                  rows={2}
                  disabled={savingEdit}
                />
                {editError && (
                  <p className="text-xs text-red-600">{editError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-3 py-1 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-medium rounded-md disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={savingEdit}
                    className="px-3 py-1 text-stone-600 hover:text-stone-900 text-xs font-medium rounded-md hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <RichTextDisplay content={activity.body ?? ''} />
            )}
          </div>
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
  isClosed = false,
  onEditComment,
  onDeleteComment,
  onAddReply,
}) => {
  const { user } = useAuth();
  const canDeleteComments = user?.role === 'admin';

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-full bg-zinc-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8 text-center space-y-2">
        <MessageSquare className="w-6 h-6 text-zinc-400 mx-auto" />
        <p className="text-xs text-zinc-500">No activity on this ticket yet.</p>
      </div>
    );
  }

  return (
    <div className="pl-3 border-l-2 border-zinc-200 ml-2 space-y-0">
      {activities.map((activity) =>
        activity.type === 'comment' ? (
          <CommentCard
            key={activity.id}
            activity={activity}
            isClosed={isClosed}
            canDelete={canDeleteComments}
            onEdit={onEditComment}
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
