import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import Logo from '../components/ui/Logo';

const DEFAULT_MESSAGE = "We're performing scheduled maintenance and will be back shortly.";

export default function MaintenancePage() {
  // The admin-configured 503 message is stashed by the axios interceptor.
  let message = DEFAULT_MESSAGE;
  try {
    message = sessionStorage.getItem('maintenance_message') || DEFAULT_MESSAGE;
  } catch {
    /* ignore storage errors */
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="mb-8">
        <Logo size={24} />
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accentSoft">
        <Wrench size={28} className="text-brand-600" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold text-ink">Under Maintenance</h1>
      <p className="mt-3 max-w-md text-sm text-subtle">{message}</p>
      <p className="mt-8 text-xs text-subtle">
        Administrators can still{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          sign in
        </Link>
        .
      </p>
    </div>
  );
}
