// In-memory store for KYC data collected across the multi-step flow.
// Each step writes its slice; the next step reads from session/profile + this store.
// On Done, the store is cleared and session.kycStatus flips to 'done'.

export type PanData = {
  pan: string;
  fullName: string;
  dob: string; // 'DD/MM/YYYY'
};

export type BankData = {
  accountNumber: string;
  ifsc: string;
  beneficiaryName: string;
  source: 'partner' | 'upi';
  nameMatchPercent: number;
  nameMatchAcknowledged?: boolean;
};

export type PersonalData = {
  fatherName: string;
  motherName: string;
  maritalStatus: string;
  income: string;
  occupation: string;
  qualification: string;
  tradingExperience: string;
};

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type KycProgress = {
  pan?: PanData;
  panDeclarations?: { notPep: boolean; indianCitizen: boolean };
  bank?: BankData;
  selfie?: { capturedAt: number; geoLat?: number; geoLng?: number };
  signatureDataUrl?: string;
  personal?: PersonalData;
  address?: Address;
  digilockerFetched?: boolean;
  esignedAt?: number;
  demat?: { dpId: string; verified: boolean };
};

let state: KycProgress = {};
const subs = new Set<() => void>();

function notify() {
  subs.forEach((fn) => fn());
}

export function getKyc(): KycProgress {
  return state;
}

export function patchKyc(p: Partial<KycProgress>) {
  state = { ...state, ...p };
  notify();
}

export function clearKyc() {
  state = {};
  notify();
}

export function subscribeKyc(fn: () => void): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
