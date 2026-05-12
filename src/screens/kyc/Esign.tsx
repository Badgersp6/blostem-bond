// E-sign step. Two modes:
//   - 'full': KRA validated AND contact matches → just confirm and sign existing record
//   - 'form': KRA missing or contact-mismatch → sign the freshly-built KYC form
// Both flows ask for an Aadhaar OTP to consummate the SEBI-mandated e-signature.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import KycLayout from '../../components/KycLayout';
import { eSign, ensureKycCompleteForEsign } from '../../api/kyc';
import { getKyc, patchKyc } from '../../kyc-progress';

const RESEND_SECS = 30;

export default function KycEsign() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = (params.get('mode') as 'full' | 'form') ?? 'form';

  // Synchronously populate any missing kyc-progress fields exactly once on
  // mount so the summary is always complete and never flashes "—".
  const [kyc] = useState(() => {
    ensureKycCompleteForEsign();
    return getKyc();
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [secsLeft, setSecsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!otpSent || secsLeft <= 0) return;
    const t = setTimeout(() => setSecsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpSent, secsLeft]);

  const sendOtp = () => {
    setOtpSent(true);
    setSecsLeft(RESEND_SECS);
    setError(null);
  };

  const submit = async () => {
    if (otp.length !== 6 || submitting) return;
    setSubmitting(true);
    setError(null);
    const r = await eSign(otp);
    if (r.ok) {
      patchKyc({ esignedAt: Date.now() });
      navigate('/kyc/demat', { replace: true });
    } else {
      setError('Aadhaar OTP verification failed. Try again.');
      setSubmitting(false);
    }
  };

  const subtitle =
    mode === 'full'
      ? 'Your KYC is on record at the KRA. Authorise the e-sign with an Aadhaar OTP to confirm.'
      : 'We have built your KYC form from the details collected. Authorise the e-sign with an Aadhaar OTP.';

  return (
    <KycLayout
      step={7}
      title={mode === 'full' ? 'Confirm with e-sign' : 'E-sign your KYC form'}
      subtitle={subtitle}
      cta={otpSent}
      ctaLabel="Confirm e-sign"
      ctaDisabled={otp.length !== 6}
      ctaLoading={submitting}
      onCta={submit}
    >
      <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-4 mb-3">
        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider mb-2">
          Form summary
        </div>
        <SummaryRow k="PAN" v={kyc.pan?.pan ?? '—'} mono />
        <Divider />
        <SummaryRow k="Name" v={kyc.pan?.fullName ?? '—'} />
        <Divider />
        <SummaryRow k="Bank" v={kyc.bank ? `••••${kyc.bank.accountNumber.slice(-4)} · ${kyc.bank.ifsc}` : '—'} />
        <Divider />
        <SummaryRow
          k="Personal"
          v={kyc.personal ? `${kyc.personal.occupation.split(' · ')[0]} · ${kyc.personal.income}` : '—'}
        />
        <Divider />
        <AddressRow address={kyc.address} />
        <Divider />
        <SummaryRow k="Selfie" v={kyc.selfie ? 'Captured + geo-tagged' : '—'} />
        <Divider />
        <SummaryRow k="Signature" v={kyc.signatureDataUrl ? 'Captured' : '—'} />
        {kyc.digilockerFetched && (
          <>
            <Divider />
            <SummaryRow k="Digilocker" v="PAN + Aadhaar verified" />
          </>
        )}
      </div>

      {!otpSent ? (
        <button
          onClick={sendOtp}
          className="w-full bg-[#0A0A0A] text-white py-[15px] rounded-[12px] text-[14px] font-semibold active:scale-[0.98] transition"
        >
          Send Aadhaar OTP
        </button>
      ) : (
        <>
          <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium mb-1.5">
            Aadhaar OTP
          </div>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit OTP"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full bg-white border border-[#EBEBEB] rounded-[12px] px-4 h-12 text-[18px] font-semibold tnum tracking-[0.3em] text-center outline-none focus:border-[#0A0A0A] transition mb-2"
          />
          <div className="flex justify-between items-center text-[11px]">
            <div className="text-[#737373]">OTP sent to your Aadhaar-linked mobile</div>
            {secsLeft > 0 ? (
              <div className="text-[#A3A3A3] tnum">Resend in {secsLeft}s</div>
            ) : (
              <button onClick={sendOtp} className="text-[#0A0A0A] font-medium">
                Resend OTP
              </button>
            )}
          </div>
          {error && (
            <div className="text-[12px] mt-2" style={{ color: '#DC2626' }}>
              {error}
            </div>
          )}
        </>
      )}
    </KycLayout>
  );
}

function SummaryRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <div className="text-[12px] text-[#737373]">{k}</div>
      <div className={`text-[13px] font-medium text-right ${mono ? 'tnum tracking-[0.05em]' : ''}`}>
        {v}
      </div>
    </div>
  );
}

function AddressRow({ address }: { address?: import('../../kyc-progress').Address }) {
  if (!address) {
    return (
      <div className="flex justify-between gap-3 py-2">
        <div className="text-[12px] text-[#737373]">Address</div>
        <div className="text-[13px] font-medium text-right">—</div>
      </div>
    );
  }
  return (
    <div className="flex justify-between gap-3 py-2 items-start">
      <div className="text-[12px] text-[#737373] shrink-0 pt-0.5">Address</div>
      <div className="text-[13px] font-medium text-right leading-[1.45]">
        {address.line1}
        {address.line2 && (
          <>
            <br />
            {address.line2}
          </>
        )}
        <br />
        {address.city}, {address.state} {address.pincode}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[#F0F0F0]" />;
}
