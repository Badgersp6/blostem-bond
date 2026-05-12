// Mock KYC infrastructure: status check + per-step API mocks. Real implementation
// would hit ITD, KRA, CDSL/NSDL, Digilocker, and the partner's selfie SDK.

import { getSession, type AuthSession } from './auth';
import { getKyc, patchKyc, type Address, type PanData, type PersonalData } from '../kyc-progress';

export type KycStatus = 'done' | 'pending';

export type KycResult = {
  status: KycStatus;
  reason?: 'pan_unverified' | 'aadhaar_pending' | 'demat_unlinked' | 'unknown';
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function checkKyc(): Promise<KycResult> {
  await wait(800);
  const session = getSession();
  if (!session) throw new Error('No active session');
  if (session.kycStatus === 'done') return { status: 'done' };
  return { status: 'pending', reason: 'pan_unverified' };
}

// Mark the user's KYC as done locally (real impl would re-fetch from backend).
export function markKycDone() {
  const session = getSession();
  if (!session) return;
  (session as AuthSession).kycStatus = 'done';
  try {
    sessionStorage.setItem('blostem.auth.session', JSON.stringify(session));
  } catch {
    // ignore
  }
}

/* ───────── PAN ───────── */

export type PanFetchResult = { found: true; pan: PanData } | { found: false };

export async function fetchPanByPhone(): Promise<PanFetchResult> {
  await wait(900);
  const session = getSession();
  if (!session?.panFetchedFromPhone) return { found: false };
  return {
    found: true,
    pan: {
      pan: session.pan ?? 'DCPPP5600H',
      fullName: 'Sukhad Pathak',
      dob: '12/06/1992',
    },
  };
}

export async function validatePanItd(pan: PanData): Promise<{ ok: true } | { ok: false; reason: string }> {
  await wait(900);
  // Basic format check; real ITD API verifies name+DOB+PAN match
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan.pan.toUpperCase())) {
    return { ok: false, reason: 'PAN format invalid' };
  }
  if (!pan.fullName.trim()) return { ok: false, reason: 'Name as per PAN is required' };
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(pan.dob)) return { ok: false, reason: 'DOB must be DD/MM/YYYY' };
  return { ok: true };
}

/* ───────── Bank ───────── */

export type BankFetchResult =
  | { source: 'partner'; accountNumber: string; ifsc: string; beneficiaryName: string }
  | { source: 'none' };

export async function fetchBankFromPartner(): Promise<BankFetchResult> {
  await wait(700);
  const session = getSession();
  if (!session?.bankFromPartner) return { source: 'none' };
  return {
    source: 'partner',
    accountNumber: session.bank.acc_no,
    ifsc: session.bank.ifsc,
    beneficiaryName: 'Sukhad Pathak',
  };
}

export async function validateBankUpi(upiId: string): Promise<{
  accountNumber: string;
  ifsc: string;
  beneficiaryName: string;
}> {
  await wait(1100);
  if (!/^[\w.-]+@[\w]+$/.test(upiId)) {
    throw new Error('Invalid UPI ID format');
  }
  return {
    accountNumber: '••••' + Math.floor(1000 + Math.random() * 9000),
    ifsc: 'HDFC0001234',
    beneficiaryName: 'Sukhad Pathak',
  };
}

export async function checkNameMatch(): Promise<{ percent: number; requiresDeclaration: boolean }> {
  await wait(500);
  const session = getSession();
  const percent = session?.bankNameMatchPercent ?? 87;
  return { percent, requiresDeclaration: percent < 60 };
}

/* ───────── KRA ───────── */

export type KraResult = {
  validated: boolean;
  contactMatches: boolean;
  personal?: PersonalData;
  address?: Address;
};

export async function fetchKra(): Promise<KraResult> {
  await wait(1200);
  const session = getSession();
  return {
    validated: session?.kraValidated ?? false,
    contactMatches: session?.kraContactMatch ?? false,
    personal: session?.kraValidated
      ? {
          fatherName: 'Mahesh Pathak',
          motherName: 'Anjali Pathak',
          maritalStatus: 'Single',
          income: '10–25 Lakh',
          occupation: 'Salaried · Private sector',
          qualification: 'Graduate',
          tradingExperience: '1–3 years',
        }
      : undefined,
    address: session?.kraValidated
      ? {
          line1: 'Flat 1204, Lodha Bellissimo',
          line2: 'N M Joshi Marg, Mahalaxmi',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400011',
          country: 'India',
        }
      : undefined,
  };
}

/* ───────── Selfie + Wet sign ───────── */

export async function submitSelfie(): Promise<{ ok: boolean }> {
  await wait(1400);
  return { ok: true };
}

export async function submitSignature(_dataUrl: string): Promise<{ ok: boolean }> {
  await wait(600);
  return { ok: true };
}

/* ───────── Digilocker / Esign ───────── */

export type DigilockerResult = {
  pan: boolean;
  aadhaar: boolean;
  aadhaarMasked?: string;
  address?: Address;
};

export async function fetchDigilocker(): Promise<DigilockerResult> {
  await wait(1500);
  return {
    pan: true,
    aadhaar: true,
    aadhaarMasked: 'XXXX XXXX 4216',
    address: {
      line1: '102 Sunshine Apartments',
      line2: 'Linking Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      country: 'India',
    },
  };
}

export async function eSign(_aadhaarOtp: string): Promise<{ ok: boolean }> {
  await wait(1000);
  return { ok: true };
}

/* ───────── Demat ───────── */

/* ───────── Esign pre-fill ───────── */

// Synchronously fills any missing kyc-progress fields with sensible defaults.
// Run on Esign mount so the form summary is never empty, regardless of whether
// the user walked the linear flow or landed on the screen directly.
export function ensureKycCompleteForEsign(): void {
  const session = getSession();
  const k = getKyc();
  const isKraPath = session?.kraValidated ?? false;

  if (!k.pan) {
    patchKyc({
      pan: {
        pan: session?.pan ?? 'DCPPP5600H',
        fullName: 'Sukhad Pathak',
        dob: '12/06/1992',
      },
    });
  }
  if (!k.panDeclarations) {
    patchKyc({ panDeclarations: { notPep: true, indianCitizen: true } });
  }
  if (!k.bank) {
    patchKyc({
      bank: {
        accountNumber: session?.bank.acc_no ?? '6546546546',
        ifsc: session?.bank.ifsc ?? 'BARB0AIROLI',
        beneficiaryName: 'Sukhad Pathak',
        source: session?.bankFromPartner ? 'partner' : 'upi',
        nameMatchPercent: session?.bankNameMatchPercent ?? 87,
      },
    });
  }
  if (!k.personal) {
    patchKyc({
      personal: {
        fatherName: 'Mahesh Pathak',
        motherName: 'Anjali Pathak',
        maritalStatus: 'Single',
        income: '10–25 Lakh',
        occupation: 'Salaried · Private sector',
        qualification: 'Graduate',
        tradingExperience: '1–3 years',
      },
    });
  }
  if (!k.address) {
    // KRA path → Mahalaxmi (KRA-on-record); Digilocker path → Bandra West
    patchKyc({
      address: isKraPath
        ? {
            line1: 'Flat 1204, Lodha Bellissimo',
            line2: 'N M Joshi Marg, Mahalaxmi',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400011',
            country: 'India',
          }
        : {
            line1: '102 Sunshine Apartments',
            line2: 'Linking Road, Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400050',
            country: 'India',
          },
    });
  }
  if (!k.selfie) {
    patchKyc({ selfie: { capturedAt: Date.now(), geoLat: 19.076, geoLng: 72.8777 } });
  }
  if (!k.signatureDataUrl) {
    patchKyc({
      signatureDataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    });
  }
  // Digilocker only marked when the upstream branch actually used it
  if (!isKraPath && !k.digilockerFetched) {
    patchKyc({ digilockerFetched: true });
  }
}

/* ───────── Demat ───────── */

export async function verifyDemat(dpId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  await wait(900);
  // Demat client IDs (BO IDs) are 16 digits — 8 DP + 8 client account
  const cleaned = dpId.replace(/\s+/g, '');
  if (!/^\d{16}$/.test(cleaned)) {
    return { ok: false, reason: 'Demat ID must be 16 digits' };
  }
  return { ok: true };
}
