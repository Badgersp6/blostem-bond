// Drop-off screen when KYC isn't complete. In production, the CTA hands off to
// the partner app (PhonePe/CRED/etc.) to complete the user's KYC, and we resume
// the bonds flow when the partner re-mounts the SDK with kycStatus=done.
//
// For the prototype this is a stub the happy flow won't hit.

import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import Footer from '../components/Footer';

const REASON_COPY: Record<string, string> = {
  pan_unverified: "Your PAN hasn't been verified yet.",
  aadhaar_pending: 'Aadhaar e-sign is pending.',
  demat_unlinked: "Your demat account isn't linked.",
  unknown: 'KYC verification is incomplete.',
};

export default function KycRequired() {
  const navigate = useNavigate();
  const location = useLocation();
  const reason = (location.state as { reason?: string } | null)?.reason;
  const message = REASON_COPY[reason || 'unknown'] || REASON_COPY.unknown;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <div className="text-[15px] font-semibold tracking-tight">Complete KYC</div>
        <div className="w-9 h-9" />
      </div>

      <div className="flex-1 px-5 pb-6 flex flex-col items-center justify-center">
        <div
          className="w-16 h-16 rounded-full mb-4 flex items-center justify-center"
          style={{ background: '#FEF3C7' }}
        >
          <ShieldAlert className="w-7 h-7" strokeWidth={1.75} style={{ color: '#D97706' }} />
        </div>
        <div className="text-[19px] font-semibold tracking-tight text-center">
          KYC required to invest
        </div>
        <div className="text-[13px] text-[#737373] mt-2 text-center max-w-[280px] leading-[1.5]">
          {message} Complete it in your partner app — we'll resume your investment when you're back.
        </div>

        <button
          className="mt-6 bg-[#0A0A0A] text-white py-3 px-6 rounded-[12px] text-[14px] font-semibold active:scale-[0.98] transition"
          onClick={() => navigate('/')}
        >
          Continue in partner app
        </button>
      </div>

      <Footer />
    </div>
  );
}
