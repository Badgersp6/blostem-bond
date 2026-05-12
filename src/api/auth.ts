import { partnerUser, profileMock, type PartnerUser, type ProfileMock } from '../sdk-init';

const STORAGE_KEY = 'blostem.auth.session';

export type AuthSession = {
  userId: string;
  phone: string;
  email: string;
  pan?: string;
  bank: { acc_no: string; ifsc: string };
  demat: { dp_id: string };
  kycStatus: 'done' | 'pending';
  // KYC simulation toggles passed through from profileMock
  panFetchedFromPhone: boolean;
  bankFromPartner: boolean;
  kraValidated: boolean;
  kraContactMatch: boolean;
  bankNameMatchPercent: number;
};

let memorySession: AuthSession | null = null;

function loadFromStorage(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function saveToStorage(s: AuthSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // sessionStorage unavailable — fall back to memory only
  }
}

export function getSession(): AuthSession | null {
  if (memorySession) return memorySession;
  const stored = loadFromStorage();
  if (stored) memorySession = stored;
  return memorySession;
}

export function clearSession() {
  memorySession = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Synchronous SSO: partner has already authenticated the user inside their app.
// We just take the partner-supplied identity (phone/email/pan) and merge it with
// the mocked profile (userId/bank/demat/kyc). In production the profile half
// would come from a separate API call after SSO.
function buildSession(user: PartnerUser, profile: ProfileMock): AuthSession {
  return {
    userId: profile.userId,
    phone: user.phone,
    email: user.email,
    pan: user.pan,
    bank: profile.bank,
    demat: profile.demat,
    kycStatus: profile.kycStatus,
    panFetchedFromPhone: profile.panFetchedFromPhone,
    bankFromPartner: profile.bankFromPartner,
    kraValidated: profile.kraValidated,
    kraContactMatch: profile.kraContactMatch,
    bankNameMatchPercent: profile.bankNameMatchPercent,
  };
}

export function authenticate(): AuthSession {
  const existing = getSession();
  if (existing) return existing;
  const session = buildSession(partnerUser, profileMock);
  memorySession = session;
  saveToStorage(session);
  return session;
}
