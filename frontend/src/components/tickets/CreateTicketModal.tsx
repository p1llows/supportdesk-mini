import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, PlusCircle, X, Paperclip, Trash2 } from 'lucide-react';

interface DepartmentOption {
  id: number;
  name: string;
  description: string | null;
}

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [fetchingDepartments, setFetchingDepartments] = useState<boolean>(false);
  const [departmentFetchError, setDepartmentFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (!isOpen || !token) return;

    const fetchDepartments = async () => {
      setFetchingDepartments(true);
      setDepartmentFetchError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/v1/departments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          setDepartments(result.data.departments || []);
          if (result.data.departments && result.data.departments.length > 0) {
            setDepartmentId(String(result.data.departments[0].id));
          }
        } else {
          setDepartmentFetchError(result.message || 'Failed to load department options');
        }
      } catch (err: unknown) {
        setDepartmentFetchError(err instanceof Error ? err.message : 'Network error loading departments');
      } finally {
        setFetchingDepartments(false);
      }
    };

    fetchDepartments();
  }, [isOpen, token, apiBaseUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!departmentId) {
      setError('Please select a department for your ticket');
      return;
    }

    // Validate attachments client-side
    const attachmentErrs: string[] = [];
    if (attachments.length > 3) {
      attachmentErrs.push('Maximum 3 files allowed');
    }
    for (const file of attachments) {
      if (file.size > 5 * 1024 * 1024) {
        attachmentErrs.push(`${file.name}: exceeds 5 MB limit`);
      }
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'text/plain', 'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
      ];
      if (!allowedTypes.includes(file.type)) {
        attachmentErrs.push(`${file.name}: unsupported file type`);
      }
    }
    if (attachmentErrs.length > 0) {
      setAttachmentErrors(attachmentErrs);
      return;
    }
    setAttachmentErrors([]);

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('priority', priority);
      formData.append('department_id', departmentId);
      attachments.forEach((file) => {
        formData.append('attachments[]', file);
      });

      const response = await fetch(`${apiBaseUrl}/v1/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const result = await response.json();

      if (response.status === 201 && result.status === 'success') {
        // Reset form
        setTitle('');
        setDescription('');
        setPriority('medium');
        setAttachments([]);
        onSuccess();
        onClose();
      } else {
        setError(result.message || 'Failed to submit ticket');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error submitting ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Submit New Support Ticket</h3>
              <p className="text-xs text-slate-500">Provide details for support assistance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Missing Department Block */}
        {user?.role === 'requester' && !user?.department_id ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Profile Incomplete</h4>
            <p className="text-sm text-slate-500 font-medium">
              A department must be selected first.
            </p>
            <div className="pt-4 border-t border-slate-100 mt-6">
              <Button onClick={onClose} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* Modal Body / Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {departmentFetchError && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Department Loading Error: {departmentFetchError}</span>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-title" className="text-xs font-semibold text-slate-700">
              Ticket Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ticket-title"
              type="text"
              required
              placeholder="e.g. Computer cannot connect to network"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="text-sm"
            />
          </div>

          {/* Department Select Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-department" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Department <span className="text-red-500">*</span></span>
              {fetchingDepartments && (
                <span className="text-xs text-slate-400 font-normal flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading departments...
                </span>
              )}
            </Label>
            <select
              id="ticket-department"
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={loading || fetchingDepartments}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select target department...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Select */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-priority" className="text-xs font-semibold text-slate-700">
              Priority <span className="text-red-500">*</span>
            </Label>
            <select
              id="ticket-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              disabled={loading}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-description" className="text-xs font-semibold text-slate-700">
              Description <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="ticket-description"
              required
              rows={4}
              placeholder="Detailed explanation of the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* File Attachments */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-attachments" className="text-xs font-semibold text-slate-700">
              Attachments (max 3 files, 5 MB each)
            </Label>
            <input
              id="ticket-attachments"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const combined = [...attachments, ...files].slice(0, 3);
                setAttachments(combined);
                setAttachmentErrors([]);
                // Reset input value to allow re-selecting same file
                (e.target as HTMLInputElement).value = '';
              }}
              disabled={loading}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {attachments.map((file, idx) => (
                  <span
                    key={`${file.name}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-xs text-slate-700"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span className="text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {attachmentErrors.length > 0 && (
              <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                {attachmentErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || fetchingDepartments || !departmentId}
              className="bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Ticket'
              )}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
