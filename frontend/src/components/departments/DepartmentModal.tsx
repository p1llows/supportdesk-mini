import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  Building2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

interface DepartmentData {
  id: number;
  name: string;
}

interface DepartmentModalProps {
  isOpen: boolean;
  department: DepartmentData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DepartmentModal = ({ isOpen, department, onClose, onSuccess }: DepartmentModalProps) => {
  const { token } = useAuth();
  
  // Department fields
  const [name, setName] = useState('');
  
  // Agent fields (only for create)
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPassword, setAgentPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const isEditing = !!department;

  useEffect(() => {
    if (isOpen) {
      if (department) {
        setName(department.name);
      } else {
        setName('');
        setAgentName('');
        setAgentEmail('');
        setAgentPassword('');
      }
      setError(null);
      setFieldErrors({});
      setSuccessMessage(null);
    }
  }, [isOpen, department]);

  if (!isOpen) return null;

  const handleClose = () => {
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
      const url = isEditing 
        ? `${apiBaseUrl}/v1/departments/${department.id}`
        : `${apiBaseUrl}/v1/departments`;
      
      const payload: any = { name: name.trim() };
      
      if (!isEditing) {
        payload.agent_name = agentName.trim();
        payload.agent_email = agentEmail.trim();
        payload.agent_password = agentPassword;
      }

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setSuccessMessage(isEditing ? 'Department updated successfully' : 'Department and Agent created successfully');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        if (response.status === 422 && result.errors) {
          setFieldErrors(result.errors);
          setError('Please resolve validation errors below');
        } else {
          setError(result.message || `Failed to save department (HTTP ${response.status})`);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-lg bg-white rounded-xl border border-zinc-200 shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                {isEditing ? 'Edit Department' : 'Create Department'}
              </h2>
              <p className="text-xs text-zinc-500">
                {isEditing 
                  ? 'Update department details' 
                  : 'Add a new department along with its initial support agent'}
              </p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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

          {/* Department Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Building2 className="w-4 h-4 text-zinc-500" />
              Department Details
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Department Name</label>
              <Input
                type="text"
                placeholder="e.g. Information Technology"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.name[0]}</p>
              )}
            </div>
          </div>

          {/* Agent Info Section (Only on Create) */}
          {!isEditing && (
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
                <UserPlus className="w-4 h-4 text-zinc-500" />
                Initial Support Agent
              </h3>
              <p className="text-xs text-zinc-500">
                A department must be created with an initial agent to manage its queue.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Agent Full Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  required
                  disabled={loading}
                />
                {fieldErrors.agent_name && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.agent_name[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Agent Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. sarah.it@supportdesk.local"
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                {fieldErrors.agent_email && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.agent_email[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Agent Password</label>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  value={agentPassword}
                  onChange={(e) => setAgentPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
                {fieldErrors.agent_password && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.agent_password[0]}</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 mt-6 border-t border-zinc-100">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Department' : 'Create Department & Agent')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
