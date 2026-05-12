import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, Loader2, MapPin } from 'lucide-react';
import KycLayout from '../../components/KycLayout';
import ErrorState from '../../components/ErrorState';
import { submitSelfie } from '../../api/kyc';
import { patchKyc } from '../../kyc-progress';

type Phase = 'idle' | 'capturing' | 'success' | 'rejected';

export default function KycSelfie() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [reason, setReason] = useState<string | null>(null);

  const start = () => setPhase('capturing');

  const completeOk = async () => {
    const r = await submitSelfie();
    if (r.ok) {
      patchKyc({
        selfie: { capturedAt: Date.now(), geoLat: 19.0760, geoLng: 72.8777 },
      });
      setPhase('success');
    } else {
      setPhase('rejected');
    }
  };

  const completeFail = () => {
    setReason('Liveness check failed. Make sure your face is centered and well-lit, then retry.');
    setPhase('rejected');
  };

  const handleContinue = () => navigate('/kyc/wet-sign', { replace: true });

  return (
    <KycLayout
      step={3}
      title="Capture a selfie"
      subtitle="Required by SEBI for video-KYC. Your face is matched against the photo on your PAN, and your location is geo-tagged."
      cta={phase === 'success'}
      ctaLabel="Continue"
      onCta={handleContinue}
    >
      <div className="bg-white border border-[#EBEBEB] rounded-[16px] p-5 mb-3">
        <div className="aspect-square w-full max-w-[260px] mx-auto rounded-full bg-[#F5F5F5] flex flex-col items-center justify-center mb-4 relative overflow-hidden">
          {phase === 'idle' && <Camera className="w-10 h-10 text-[#A3A3A3]" strokeWidth={1.5} />}
          {phase === 'capturing' && <Loader2 className="w-8 h-8 text-[#0A0A0A] animate-spin" strokeWidth={2} />}
          {phase === 'success' && (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: '#16A34A' }}
            >
              <Check className="w-6 h-6 text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#737373] mb-3">
          <MapPin className="w-3 h-3" strokeWidth={2} />
          <span>Geo-tag · Mumbai 19.07°N 72.88°E</span>
        </div>

        {phase === 'idle' && (
          <button
            onClick={start}
            className="w-full bg-[#0A0A0A] text-white py-3 rounded-[12px] text-[14px] font-semibold active:scale-[0.98] transition"
          >
            Open camera
          </button>
        )}

        {phase === 'capturing' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={completeOk}
              className="bg-[#0A0A0A] text-white py-3 rounded-[12px] text-[13px] font-semibold active:scale-[0.98] transition"
            >
              Simulate success
            </button>
            <button
              onClick={completeFail}
              className="bg-white border border-[#EBEBEB] py-3 rounded-[12px] text-[13px] font-semibold active:scale-[0.98] transition"
            >
              Simulate reject
            </button>
          </div>
        )}

        {phase === 'success' && (
          <div className="text-[12px] text-center" style={{ color: '#16A34A' }}>
            Selfie captured · liveness verified · geo-tagged
          </div>
        )}
      </div>

      {phase === 'rejected' && (
        <ErrorState
          title="Selfie rejected"
          message={reason ?? 'The partner SDK could not verify your selfie. Try again with better lighting.'}
          onRetry={() => {
            setReason(null);
            setPhase('idle');
          }}
        />
      )}
    </KycLayout>
  );
}
