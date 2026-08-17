import { LoginForm } from '@/components/auth/LoginForm';
import { Activity } from 'lucide-react';

export const LoginPage = () => {
  return (
    <div className="w-full max-w-md space-y-6">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          SupportDesk Mini — Account Access
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">SupportDesk Mini</h1>
        <p className="text-sm text-slate-500">
          Internal IT Support Ticket Management System
        </p>
      </header>

      <LoginForm />
    </div>
  );
};
