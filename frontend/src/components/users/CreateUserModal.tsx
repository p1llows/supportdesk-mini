import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateUserModal = ({ isOpen, onClose, onSuccess }: CreateUserModalProps) => {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'agent' | 'requester'>('agent');
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
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
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

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('agent');
    setDepartmentId('');
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetForm();
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
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      };

      if (role === 'agent') {
        if (!departmentId) {
          setError('Department is required for support agents.');
          setLoading(false);
          return;
        }
        payload.department_id = parseInt(departmentId, 10);
      }

      const response = await fetch(`${apiBaseUrl}/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setSuccessMessage('User created successfully');
        setTimeout(() => {
          resetForm();
          onSuccess();
          onClose();
        }, 600);
      } else {
        if (response.status === 422 && result.errors) {
          setFieldErrors(result.errors);
          setError('Please resolve validation errors below');
        } else {
          setError(result.message || `Failed to create user (HTTP ${response.status})`);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create New System User</h2>
              <p className="text-xs text-slate-500">Add an administrator, support agent, or requester</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Global Error Banner */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Full Name</label>
            <Input
              type="text"
              placeholder="e.g. Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600 font-medium">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Email Address</label>
            <Input
              type="email"
              placeholder="e.g. sarah.agent@supportdesk.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 font-medium">{fieldErrors.email[0]}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Initial Password</label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600 font-medium">{fieldErrors.password[0]}</p>
            )}
          </div>

          {/* Role Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Assigned Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('agent')}
                className={`p-2.5 rounded-lg border text-left flex flex-col items-center justify-center gap-1 transition-all ${
                  role === 'agent'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs">Support Agent</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('requester')}
                className={`p-2.5 rounded-lg border text-left flex flex-col items-center justify-center gap-1 transition-all ${
                  role === 'requester'
                    ? 'border-slate-800 bg-slate-100 text-slate-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserIcon className="w-4 h-4 text-slate-600" />
                <span className="text-xs">Requester</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-2.5 rounded-lg border text-left flex flex-col items-center justify-center gap-1 transition-all ${
                  role === 'admin'
                    ? 'border-purple-600 bg-purple-50 text-purple-800 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <span className="text-xs">Administrator</span>
              </button>
            </div>
            {fieldErrors.role && (
              <p className="text-xs text-red-600 font-medium">{fieldErrors.role[0]}</p>
            )}
          </div>

          {/* Department Select (Only for Agents) */}
          {role === 'agent' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Assigned Department</label>
              <select
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:opacity-50"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={loading}
                required
              >
                <option value="">Select a department...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {fieldErrors.department_id && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.department_id[0]}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Creating User...' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
