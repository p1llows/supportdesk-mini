import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { TicketData } from '@/components/tickets/TicketsTable';
import type { DepartmentOption } from '@/components/tickets/TicketFilters';
import {
  X,
  Edit3,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface EditTicketModalProps {
  isOpen: boolean;
  ticket: TicketData | null;
  departments: DepartmentOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export const EditTicketModal = ({
  isOpen,
  ticket,
  departments,
  onClose,
  onSuccess,
}: EditTicketModalProps) => {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [departmentId, setDepartmentId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title || '');
      setDescription(ticket.description || '');
      setPriority(ticket.priority || 'medium');
      setDepartmentId(ticket.department?.id ? String(ticket.department.id) : '');
      setError(null);
      setFieldErrors({});
      setSuccessMessage(null);
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const handleClose = () => {
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !ticket) return;

    setLoading(true);
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          department_id: Number(departmentId),
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setSuccessMessage('Ticket updated successfully');
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 500);
      } else {
        if (response.status === 422 && result.errors) {
          setFieldErrors(result.errors);
          setError('Please resolve validation errors below');
        } else {
          setError(result.message || `Failed to update ticket (HTTP ${response.status})`);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-xl border border-zinc-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Edit Ticket #{ticket.id}</h2>
              <p className="text-xs text-zinc-500">Update ticket details and department assignment</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 transition-all"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Ticket Title</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
            {fieldErrors.title && (
              <p className="text-xs text-red-600 font-medium">{fieldErrors.title[0]}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Description</label>
            <RichTextEditor
              rows={4}
              value={description}
              onChange={setDescription}
              required
              disabled={loading}
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-600 font-medium">{fieldErrors.description[0]}</p>
            )}
          </div>

          {/* Priority & Department Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                disabled={loading}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              {fieldErrors.priority && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.priority[0]}</p>
              )}
            </div>

            {/* Department Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
                disabled={loading}
              >
                <option value="" disabled>Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {fieldErrors.department_id && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.department_id[0]}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
