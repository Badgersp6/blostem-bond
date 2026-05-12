import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { fetchPanByPhone } from '../../api/kyc';
import { patchKyc } from '../../kyc-progress';
import Footer from '../../components/Footer';
import { emit } from '../../telemetry';

export default function KycPanFetch() {
  const navigate = useNavigate();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    emit('bonds.kyc.started', {});
    (async () => {
      try {
        const r = await fetchPanByPhone();
        if (r.found) {
          patchKyc({ pan: r.pan });
          navigate('/kyc/pan-verify', { replace: true });
        } else {
          navigate('/kyc/pan-input', { replace: true });
        }
      } catch {
        navigate('/kyc/pan-input', { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6">
      <Loader2 className="w-7 h-7 text-[#0A0A0A] animate-spin mb-4" strokeWidth={2} />
      <div className="text-[17px] font-semibold tracking-tight text-center">Fetching your PAN…</div>
      <div className="text-[12px] text-[#737373] mt-1.5 text-center max-w-[280px] leading-[1.5]">
        Looking up PAN details linked to your phone number to skip a step.
      </div>
      <div className="mt-auto pb-2">
        <Footer />
      </div>
    </div>
  );
}
