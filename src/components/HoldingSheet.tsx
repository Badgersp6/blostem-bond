// Holding detail + Sell flow. Opens from a holding row on /portfolio.
// 3 phases: idle → confirming → submitting → success
// Sell submits to the (mock) place-order API as a sell request; user is told
// the Ops team will contact them for next steps.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Clock, Loader2, X } from 'lucide-react';
import { estimatedAccruedGain, placeSellRequest, type OrderRecord } from '../api/orders';
import { useDialogA11y } from '../hooks/useDialogA11y';

function fmtINR(n: number): string {
  return n.toLocaleString('en-IN');
}

type Phase = 'idle' | 'confirming' | 'submitting' | 'success';

export default function HoldingSheet({
  holding,
  onClose,
}: {
  holding: OrderRecord;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const dialogRef = useDialogA11y(true, onClose);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [requestNo, setRequestNo] = useState<string | null>(null);

  const isBond = holding.kind === 'bond';
  const title = isBond
    ? holding.bondName ?? 'Bond'
    : `${holding.issuerName} · ${holding.seriesLabel}`;
  const sub = isBond
    ? `${holding.bondType ?? 'Bond'} · ${holding.bondIsin ?? ''}`
    : `${holding.couponFreq} · ${holding.securityId ?? ''}`;

  const gain = estimatedAccruedGain(holding);
  const currentValue = holding.amount + gain;
  const maturity = new Date(holding.createdAt);
  maturity.setMonth(maturity.getMonth() + holding.tenureMonths);

  const handleConfirm = async () => {
    if (phase !== 'confirming') return;
    setPhase('submitting');
    setError(null);
    try {
      const res = await placeSellRequest(holding.orderNo);
      setRequestNo(res.requestNo);
      setPhase('success');
    } catch (e: any) {
      setError(e?.message || 'Could not raise sell request');
      setPhase('confirming');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="fade-in flex-1 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="holding-sheet-title"
        className="sheet-up bg-white rounded-t-[24px] flex flex-col max-h-[88vh] overflow-y-auto"
      >
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
          </div>
          <div className="flex justify-between items-start">
            <div className="min-w-0 pr-2">
              <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">
                Holding
              </div>
              <div
                id="holding-sheet-title"
                className="text-[17px] font-semibold tracking-tight mt-0.5 truncate"
              >
                {title}
              </div>
              <div className="text-[12px] text-[#737373] mt-0.5 truncate">{sub}</div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F5F5F5] active:scale-95 transition shrink-0"
            >
              <X className="w-4 h-4 text-[#737373]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          {phase === 'success' ? (
            <SuccessPanel
              requestNo={requestNo}
              onClose={() => {
                onClose();
              }}
            />
          ) : (
            <>
              <div className="bg-[#F5F5F5] rounded-[12px] p-4 mb-3">
                <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">
                  Current value
                </div>
                <div className="flex items-baseline gap-2.5 mt-1.5 flex-wrap">
                  <div className="text-[24px] font-bold tracking-tight tnum">
                    ₹{fmtINR(currentValue)}
                  </div>
                  {gain > 0 && (
                    <div className="text-[12px] font-semibold tnum" style={{ color: '#16A34A' }}>
                      +₹{fmtINR(gain)}
                    </div>
                  )}
                </div>
                <div className="h-px bg-[#E5E5E5] my-3" />
                <div className="grid grid-cols-3 gap-2">
                  <Cell label="Invested" value={`₹${fmtINR(holding.amount)}`} />
                  <Cell label="YTM" value={`${holding.ytm}%`} />
                  <Cell label="Tenure" value={`${holding.tenureMonths} mo`} />
                </div>
              </div>

              <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-4 mb-3">
                <Row k="Order no." v={holding.orderNo} mono />
                <Divider />
                <Row k="Coupon" v={holding.couponFreq} />
                <Divider />
                {holding.rating && (
                  <>
                    <Row k="Rating" v={holding.rating} />
                    <Divider />
                  </>
                )}
                <Row k="Maturity" v={fmtMaturity(maturity)} />
              </div>

              <button
                onClick={() => navigate(`/orders/${holding.orderNo}`)}
                className="w-full bg-white border border-[#EBEBEB] rounded-[12px] py-3 flex items-center justify-between px-4 mb-3 active:scale-[0.99] transition"
              >
                <span className="text-[13px] font-medium">View settlement timeline</span>
                <ChevronRight className="w-4 h-4 text-[#737373]" strokeWidth={2} />
              </button>

              {phase === 'idle' && (
                <button
                  onClick={() => setPhase('confirming')}
                  className="w-full bg-[#0A0A0A] text-white py-4 rounded-[14px] text-[15px] font-semibold active:scale-[0.98] transition"
                >
                  Sell this holding
                </button>
              )}

              {phase === 'confirming' && (
                <div
                  className="rounded-[14px] p-4 expand"
                  style={{ background: '#FEF3C7' }}
                >
                  <div className="flex items-start gap-2.5 mb-3">
                    <Clock
                      className="w-4 h-4 mt-0.5 shrink-0"
                      strokeWidth={2}
                      style={{ color: '#92400E' }}
                    />
                    <div className="text-[12px] leading-[1.5]" style={{ color: '#92400E' }}>
                      Sell requests aren't instant. Our Ops team contacts you within 24 hours with
                      indicative quotes, then settles via the demat depository.
                    </div>
                  </div>
                  {error && (
                    <div className="text-[12px] mb-2.5" style={{ color: '#DC2626' }}>
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setPhase('idle');
                        setError(null);
                      }}
                      className="bg-white py-3 rounded-[12px] text-[13px] font-semibold active:scale-[0.99] transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="text-white py-3 rounded-[12px] text-[13px] font-semibold active:scale-[0.99] transition"
                      style={{ background: '#92400E' }}
                    >
                      Confirm sell request
                    </button>
                  </div>
                </div>
              )}

              {phase === 'submitting' && (
                <div className="w-full bg-[#0A0A0A] text-white py-4 rounded-[14px] text-[15px] font-semibold flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  Raising sell request…
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessPanel({
  requestNo,
  onClose,
}: {
  requestNo: string | null;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-2">
      <div
        className="w-14 h-14 rounded-full mb-3.5 flex items-center justify-center"
        style={{ background: '#DCFCE7' }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{ background: '#16A34A' }}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </div>
      </div>
      <div className="text-[17px] font-semibold tracking-tight">Sell request raised</div>
      <div className="text-[13px] text-[#737373] mt-1.5 max-w-[300px] leading-[1.5]">
        Our Ops team will get in touch within 24 hours with an indicative quote and the next steps.
      </div>
      {requestNo && (
        <div className="text-[11px] text-[#A3A3A3] mt-3 tnum">Request {requestNo}</div>
      )}
      <button
        onClick={onClose}
        className="w-full mt-5 bg-[#0A0A0A] text-white py-3.5 rounded-[12px] text-[14px] font-semibold active:scale-[0.98] transition"
      >
        Back to portfolio
      </button>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-[#A3A3A3] uppercase tracking-wider font-medium">{label}</div>
      <div className="text-[13px] font-semibold mt-1 tnum truncate">{value}</div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <div className="text-[12px] text-[#737373]">{k}</div>
      <div className={`text-[13px] font-medium text-right ${mono ? 'tnum tracking-[0.04em]' : ''}`}>
        {v}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[#F0F0F0]" />;
}

function fmtMaturity(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
