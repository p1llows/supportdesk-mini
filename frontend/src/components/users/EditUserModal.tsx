import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  Edit3,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface EditUserData {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
}

interface EditUserModalProps {
  isOpen: boolean;
  user: EditUserData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditUserModal = ({ isOpen, user: editUser, onClose, onSuccess }: EditUserModalProps) => {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'agent' | 'requester'>('requester');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (!isOpen || !token) return;
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/v1/departments`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
          setDepartments(result.data.departments || []);
        }
      } catch {
        // gracefully handle
      }
    };
    fetchDepartments();
  }, [isOpen, token, apiBaseUrl]);

  useEffect(() => {
    if (isOpen && editUser) {
      setName(editUser.name);
      setEmail(editUser.email);
      setRole(editUser.role as 'admin' | 'agent' | 'requester');
      setDepartmentId(editUser.department_id ? String(editUser.department_id) : '');
      setError(null);
      setFieldErrors({});
      setSuccessMessage(null);
    }
  }, [isOpen, editUser]);

  if (!isOpen || !editUser) return null;

  const handleClose = () => {
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        role,
      };

      if (role === 'agent') {
        payload.department_id = departmentId ? parseInt(departmentId, 10) : null;
      } else {
        payload.department_id = null;
      }

      const response = await fetch(`${apiBaseUrl}/v1/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setSuccessMessage('User updated successfully');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        if (response.status === 422 && result.errors) {
          setFieldErrors(result.errors);
          setError('Please resolve validation errors below');
        } else {
          setError(result.message || `Failed to update user (HTTP ${response.status})`);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-xl border border-zinc-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Edit User</h2>
              <p className="text-xs text-zinc-500">Update user details</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-all"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Full Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400"
            />
            {fieldErrors.name && <p className="text-xs text-red-600 font-medium">{fieldErrors.name[0]}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400"
            />
            {fieldErrors.email && <p className="text-xs text-red-600 font-medium">{fieldErrors.email[0]}</p>}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'agent' | 'requester')}
              disabled={loading}
              className="dark-select w-full h-9 rounded-md border px-3 py-1 text-sm"
            >
              <option value="admin">Administrator</option>
              <option value="agent">Support Agent</option>
              <option value="requester">Requester</option>
            </select>
            {fieldErrors.role && <p className="text-xs text-red-600 font-medium">{fieldErrors.role[0]}</p>}
          </div>

          {/* Department (for agents) */}
          {role === 'agent' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={loading}
                className="dark-select w-full h-9 rounded-md border px-3 py-1 text-sm"
              >
                <option value="">Select a department...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {fieldErrors.department_id && <p className="text-xs text-red-600 font-medium">{fieldErrors.department_id[0]}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200">
            <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={loading} className="text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="bg-zinc-900 hover:bg-zinc-800 text-white">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
