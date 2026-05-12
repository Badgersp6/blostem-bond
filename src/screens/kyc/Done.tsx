import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock } from 'lucide-react';
import KycLayout from '../../components/KycLayout';
import { markKycDone } from '../../api/kyc';
import { clearKyc, getKyc } from '../../kyc-progress';
import { getCheckout } from '../../checkout';
import { emit } from '../../telemetry';

export default function KycDone() {
  const navigate = useNavigate();
  const kyc = getKyc();
  // Pending verification when esign happened on a freshly built form (form-mode)
  // since the registry needs ~24h to propagate. Existing KRA records are instant.
  const isPending = !!kyc.digilockerFetched;

  useEffect(() => {
    markKycDone();
    emit('bonds.kyc.completed', {
      pendingVerification: isPending,
      hasDigilocker: !!kyc.digilockerFetched,
    });
  }, []);

  const goNext = () => {
    clearKyc();
    const hasCheckout = !!getCheckout();
    navigate(hasCheckout ? '/checkout' : '/', { replace: true });
  };

  const titleByState = isPending ? 'KYC submitted · pending' : 'KYC complete';
  const subtitleByState = isPending
    ? 'Your KYC has been submitted to the registry. You can transact now — the verified badge appears in your portfolio within 24 hours.'
    : "You're all set. Your KYC is verified and you can now invest in any bond.";

  return (
    <KycLayout step={8} title={titleByState} subtitle={subtitleByState} hideBack cta ctaLabel={getCheckout() ? 'Continue to invest' : 'Browse bonds'} onCta={goNext}>
      <div
        className="bg-white border border-[#EBEBEB] rounded-[18px] py-8 px-5 flex flex-col items-center text-center mb-3"
      >
        <div
          className="w-16 h-16 rounded-full mb-3 flex items-center justify-center"
          style={{ background: isPending ? '#FEF3C7' : '#DCFCE7' }}
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white"
            style={{ background: isPending ? '#D97706' : '#16A34A' }}
          >
            {isPending ? <Clock className="w-5 h-5" strokeWidth={2.5} /> : <Check className="w-5 h-5" strokeWidth={3} />}
          </div>
        </div>
        <div className="text-[17px] font-semibold tracking-tight">
          {isPending ? 'Submitted to KRA' : 'Verified by KRA'}
        </div>
        <div className="text-[12px] text-[#737373] mt-1.5 max-w-[280px] leading-[1.5]">
          {isPending
            ? 'Your form is in queue at CKYC/KRA. We\'ve enabled investing in the meantime.'
            : 'You can use this KYC across any SEBI-registered intermediary, not just here.'}
        </div>
      </div>

      <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-4">
        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider mb-2">
          Confirmed
        </div>
        <Item ok label="PAN verified with ITD" />
        <Item ok label="Bank verified" />
        <Item ok label="Selfie + geo-tag captured" />
        <Item ok label="Wet signature captured" />
        <Item ok label="Personal details on record" />
        <Item ok label={isPending ? 'KYC form e-signed (pending KRA)' : 'KYC e-signed'} />
        <Item ok label="Demat verified with depository" />
      </div>
    </KycLayout>
  );
}

function Item({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div
        className="w-4 h-4 rounded-full flex items-center justify-center text-white"
        style={{ background: ok ? '#16A34A' : '#A3A3A3' }}
      >
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
      </div>
      <div className="text-[12px] text-[#0A0A0A]">{label}</div>
    </div>
  );
}
