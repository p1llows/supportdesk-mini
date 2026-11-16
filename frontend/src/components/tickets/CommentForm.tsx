import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, Send } from 'lucide-react';

interface CommentFormProps {
  canPostInternal?: boolean;
  onSubmit: (body: string, isInternal: boolean) => Promise<{ success: boolean; error?: string }>;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  canPostInternal = false,
  onSubmit,
}) => {
  const [body, setBody] = useState<string>('');
  const [isInternal, setIsInternal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) {
      setError('Comment cannot be empty.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await onSubmit(body.trim(), canPostInternal && isInternal);

    if (result.success) {
      setBody('');
      setIsInternal(false);
    } else {
      setError(result.error || 'Failed to add comment.');
    }

    setSubmitting(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border p-4 space-y-3 transition-colors ${
        isInternal
          ? 'border-amber-200 bg-amber-50/40'
          : 'border-[#E5E2DA] bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="comment-body" className="text-sm font-semibold text-stone-800">
          {isInternal ? 'Add an internal note' : 'Add a comment'}
        </label>

        {canPostInternal && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-stone-600 select-none">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              disabled={submitting}
              className="h-3.5 w-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
            <Lock className="h-3 w-3 text-amber-600" />
            Internal note (hidden from requester)
          </label>
        )}
      </div>

      <textarea
        id="comment-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={5000}
        disabled={submitting}
        placeholder={isInternal ? 'Write an internal note for agents and admins...' : 'Write your reply...'}
        className="w-full rounded-lg border border-[#E5E2DA] bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent disabled:bg-stone-50 resize-y"
      />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-stone-400">{body.length}/5000</span>
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !body.trim()}
          className={isInternal ? 'bg-amber-700 hover:bg-amber-800 text-white' : undefined}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {isInternal ? 'Post Internal Note' : 'Add Comment'}
        </Button>
      </div>
    </form>
  );
};
