// Stand-in for what the host app passes to Blostem SDK on init.
// In production this is supplied by `Blostem.init({ user, deepLink, theme })`
// from the host fintech (PhonePe / CRED / Kotak / etc.).

export type PartnerUser = {
  phone: string;          // mandatory
  email: string;          // mandatory
  pan?: string;           // optional
};

// Happy-flow profile data — these fields aren't part of the partner SDK init
// contract. In production they'd come from a separate profile/registration API
// after SSO. For the prototype we mock them here so the order-placement flow
// has the data it needs (userId, bank, demat).
export type ProfileMock = {
  userId: string;
  bank: { acc_no: string; ifsc: string };
  demat: { dp_id: string };
  kycStatus: 'done' | 'pending';
  // KYC-flow simulation toggles. In production these come from real APIs;
  // here they let us exercise each branch without code changes.
  panFetchedFromPhone: boolean;
  bankFromPartner: boolean;
  kraValidated: boolean;
  kraContactMatch: boolean;
  bankNameMatchPercent: number; // <60 forces declaration step
};

export const partnerUser: PartnerUser = {
  phone: '9810536858',
  email: 'sukhad.pathak@blostem.com',
  pan: 'DCPPP5600H',
};

export const profileMock: ProfileMock = {
  userId: '31',
  bank: { acc_no: '6546546546', ifsc: 'BARB0AIROLI' },
  demat: { dp_id: '1234567887654123' },
  // Flip to 'pending' to test the KYC flow end-to-end
  kycStatus: 'pending',
  panFetchedFromPhone: true,
  bankFromPartner: true,
  kraValidated: true,
  kraContactMatch: true,
  bankNameMatchPercent: 87,
};

export type DeepLink = {
  isin?: string;
  orderId?: string;
};

// Read deep-link target from URL params. In production the SDK init payload
// would carry this; for the prototype we read `?isin=…` off the entry URL.
export function readDeepLink(): DeepLink {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    isin: params.get('isin') || undefined,
    orderId: params.get('orderId') || undefined,
  };
}
