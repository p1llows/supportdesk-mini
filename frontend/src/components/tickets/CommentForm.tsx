import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (body: string) => Promise<{ success: boolean; error?: string }>;
}

export const CommentForm: React.FC<CommentFormProps> = ({ onSubmit }) => {
  const [body, setBody] = useState<string>('');
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

    const result = await onSubmit(body.trim());

    if (result.success) {
      setBody('');
    } else {
      setError(result.error || 'Failed to add comment.');
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <label htmlFor="comment-body" className="text-sm font-semibold text-slate-700">
        Add a comment
      </label>
      <textarea
        id="comment-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={5000}
        disabled={submitting}
        placeholder="Write your reply..."
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:bg-slate-50 resize-y"
      />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{body.length}/5000</span>
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !body.trim()}
          className="bg-indigo-700 hover:bg-indigo-800 text-white"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Add Comment
        </Button>
      </div>
    </form>
  );
};
