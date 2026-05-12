import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, FileText, Loader2, MapPin } from 'lucide-react';
import KycLayout from '../../components/KycLayout';
import { fetchDigilocker, type DigilockerResult } from '../../api/kyc';
import { patchKyc } from '../../kyc-progress';

type Phase = 'idle' | 'fetching' | 'fetched';

export default function KycDigilocker() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [docs, setDocs] = useState<DigilockerResult | null>(null);
  const ranRef = useRef(false);

  const handleConsent = () => {
    if (ranRef.current) return;
    ranRef.current = true;
    setPhase('fetching');
    fetchDigilocker().then((r) => {
      setDocs(r);
      setPhase('fetched');
    });
  };

  useEffect(() => {
    if (phase === 'fetched' && docs?.pan && docs?.aadhaar) {
      patchKyc({
        digilockerFetched: true,
        address: docs.address,
      });
    }
  }, [phase, docs]);

  return (
    <KycLayout
      step={6}
      title="Connect Digilocker"
      subtitle="Since you don't have an existing KYC on record, we'll pull your PAN and Aadhaar from Digilocker to complete the form."
      cta={phase === 'fetched'}
      ctaLabel="Continue to e-sign"
      onCta={() => navigate('/kyc/esign?mode=form', { replace: true })}
    >
      {phase === 'idle' && (
        <>
          <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-5 mb-3">
            <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium mb-3">
              We'll fetch
            </div>
            <DocRow icon={<FileText className="w-4 h-4" strokeWidth={2} />} label="PAN card" />
            <Divider />
            <DocRow icon={<FileText className="w-4 h-4" strokeWidth={2} />} label="Aadhaar (XML)" />
          </div>
          <div
            className="text-[12px] leading-[1.5] px-3.5 py-3 rounded-[10px] mb-3"
            style={{ background: '#E0F2FE', color: '#0369A1' }}
          >
            You'll be redirected to Digilocker (operated by Govt of India) to grant access. We never see
            your password — Digilocker shares only the documents you approve.
          </div>
          <button
            onClick={handleConsent}
            className="w-full bg-[#0A0A0A] text-white py-[15px] rounded-[12px] text-[14px] font-semibold active:scale-[0.98] transition"
          >
            Connect Digilocker
          </button>
        </>
      )}

      {phase === 'fetching' && (
        <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-8 flex flex-col items-center text-center">
          <Loader2 className="w-5 h-5 text-[#737373] animate-spin mb-2" strokeWidth={2} />
          <div className="text-[12px] text-[#737373]">Pulling documents from Digilocker…</div>
        </div>
      )}

      {phase === 'fetched' && docs && (
        <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#16A34A' }} />
            <div className="text-[12px] font-semibold" style={{ color: '#16A34A' }}>
              Documents fetched
            </div>
          </div>
          <DocFetched label="PAN card" ok={docs.pan} />
          <Divider />
          <DocFetched
            label={docs.aadhaarMasked ? `Aadhaar · ${docs.aadhaarMasked}` : 'Aadhaar (XML)'}
            ok={docs.aadhaar}
          />
          {docs.address && (
            <>
              <Divider />
              <div className="flex items-start gap-2.5 py-2.5">
                <MapPin className="w-3.5 h-3.5 text-[#737373] mt-0.5 shrink-0" strokeWidth={2} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[#737373] mb-0.5">Address from Aadhaar</div>
                  <div className="text-[13px] leading-[1.45]">
                    {docs.address.line1}
                    {docs.address.line2 && (
                      <>
                        <br />
                        {docs.address.line2}
                      </>
                    )}
                    <br />
                    {docs.address.city}, {docs.address.state} {docs.address.pincode}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </KycLayout>
  );
}

function DocRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="text-[#737373]">{icon}</div>
      <div className="text-[13px] font-medium flex-1">{label}</div>
    </div>
  );
}

function DocFetched({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="text-[13px] font-medium">{label}</div>
      {ok ? (
        <div className="flex items-center gap-1.5 text-[12px]" style={{ color: '#16A34A' }}>
          <Check className="w-3 h-3" strokeWidth={2.5} />
          <span>Verified</span>
        </div>
      ) : (
        <div className="text-[12px]" style={{ color: '#DC2626' }}>
          Failed
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[#F0F0F0]" />;
}
