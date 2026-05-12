import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { fetchKra } from '../../api/kyc';
import Footer from '../../components/Footer';

export default function KycKraFetch() {
  const navigate = useNavigate();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    (async () => {
      // Result is read again later by the branching step; here we just
      // simulate the fetch and then advance to selfie capture.
      await fetchKra();
      navigate('/kyc/selfie', { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6">
      <Loader2 className="w-7 h-7 text-[#0A0A0A] animate-spin mb-4" strokeWidth={2} />
      <div className="text-[17px] font-semibold tracking-tight text-center">Checking KRA records…</div>
      <div className="text-[12px] text-[#737373] mt-1.5 text-center max-w-[280px] leading-[1.5]">
        Looking up your existing KYC at the KRA registry to skip steps you've already done.
      </div>
      <div className="mt-auto pb-2">
        <Footer />
      </div>
    </div>
  );
}
