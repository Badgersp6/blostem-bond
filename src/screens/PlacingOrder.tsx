// Calls place-order (bonds) or place-application (IPOs) on mount, then hands
// off to /payment for the gateway redirect (Phase 6). Surfaces any placement
// error inline with a Try again affordance.

import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getCheckout } from '../checkout';
import { placeBondOrder, placeIpoApplication } from '../api/orders';
import Footer from '../components/Footer';
import { emit } from '../telemetry';

export default function PlacingOrder() {
  const navigate = useNavigate();
  const checkout = getCheckout();
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const placedRef = useRef(false);

  useEffect(() => {
    if (!checkout) return;
    // Guard against StrictMode double-invocation. Placement is idempotent
    // (orders Map write) so the second effect run can safely no-op.
    if (placedRef.current) return;
    placedRef.current = true;

    (async () => {
      try {
        const record =
          checkout.kind === 'bond'
            ? await placeBondOrder(checkout)
            : await placeIpoApplication(checkout);
        emit('bonds.order.placed', {
          orderNo: record.orderNo,
          kind: record.kind,
          amount: record.amount,
          ytm: record.ytm,
        });
        navigate(`/payment/${record.orderNo}`, { replace: true });
      } catch (e: any) {
        emit('bonds.order.failed', {
          kind: checkout.kind,
          amount: checkout.amount,
          reason: e?.message || 'unknown',
        });
        setError(e?.message || 'Could not place your order');
        placedRef.current = false; // allow retry
      }
    })();
    // retryTick re-runs the effect for the Try Again button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryTick]);

  if (!checkout) return <Navigate to="/" replace />;

  const isBond = checkout.kind === 'bond';

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <div className="flex-1 px-5 pb-6 flex flex-col items-center justify-center">
          <div className="bg-white border border-[#FEE2E2] rounded-[14px] p-5 max-w-sm w-full">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
              <div className="text-[14px] font-semibold" style={{ color: '#DC2626' }}>
                {isBond ? "Couldn't place order" : "Couldn't submit application"}
              </div>
            </div>
            <div className="text-[12px] text-[#737373] leading-[1.5] break-words mb-4">{error}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setRetryTick((n) => n + 1)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#0A0A0A] text-white py-2.5 px-4 rounded-[10px] text-[13px] font-semibold active:scale-95 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.25} />
                Try again
              </button>
              <button
                onClick={() => navigate('/checkout', { replace: true })}
                className="flex-1 bg-white border border-[#EBEBEB] py-2.5 px-4 rounded-[10px] text-[13px] font-semibold active:scale-95 transition"
              >
                Back to review
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6">
      <Loader2 className="w-7 h-7 text-[#0A0A0A] animate-spin mb-4" strokeWidth={2} />
      <div className="text-[17px] font-semibold tracking-tight text-center">
        {isBond ? 'Placing your order…' : 'Submitting your application…'}
      </div>
      <div className="text-[12px] text-[#737373] mt-1.5 text-center max-w-[280px] leading-[1.5]">
        {isBond
          ? 'Confirming with the dealer and preparing your payment.'
          : 'Validating your application and preparing the ASBA mandate.'}
      </div>
    </div>
  );
}
