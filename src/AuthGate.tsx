import { useEffect, useState, type ReactNode } from 'react';
import { authenticate, getSession, type AuthSession } from './api/auth';
import Authenticating from './screens/Authenticating';
import { emit } from './telemetry';

// The SDK is rendering inside the partner app's authenticated context. We don't
// re-auth against an external API — we just take the partner-supplied identity
// and run a brief brand transition before handing control to the bonds flow.
const MIN_DISPLAY_MS = 1200;

export default function AuthGate({ children }: { children: ReactNode }) {
  const initial = getSession();
  const [session, setSession] = useState<AuthSession | null>(initial);

  useEffect(() => {
    if (session) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const result = authenticate();
      setSession(result);
      emit('bonds.module.opened', {
        userId: result.userId,
        kycStatus: result.kycStatus,
      });
    }, MIN_DISPLAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [session]);

  if (!session) return <Authenticating />;
  return <>{children}</>;
}
