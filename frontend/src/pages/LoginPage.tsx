import { LoginForm } from '@/components/auth/LoginForm';
import { AuthShell } from '@/components/auth/AuthShell';

export const LoginPage = () => {
  return (
    <AuthShell>
      <header className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Welcome back</h1>
        <p className="text-sm text-zinc-500">
          Sign in to your SupportDesk account to continue.
        </p>
      </header>

      <div className="mt-8">
        <LoginForm />
      </div>
    </AuthShell>
  );
};
