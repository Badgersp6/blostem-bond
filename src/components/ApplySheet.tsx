import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Minus, Plus } from 'lucide-react';
import type { IpoIssuance, IpoSeries } from '../api/ipos';
import { setCheckout } from '../checkout';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { emit } from '../telemetry';

function fmtINR(n: number): string {
  return n.toLocaleString('en-IN');
}

export default function ApplySheet({
  issuance,
  series,
  onClose,
}: {
  issuance: IpoIssuance;
  series: IpoSeries;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  // Convert ₹ ranges into NCD units. Each NCD is series.issuePrice rupees;
  // increments are typically 1 NCD (incrementAmount === issuePrice on this issuer).
  const issuePrice = series.issuePrice || 1000;
  const minNcds = Math.max(1, Math.round(series.minAmount / issuePrice));
  const incrNcds = Math.max(1, Math.round(series.incrementAmount / issuePrice));
  const maxNcds = Math.max(minNcds, Math.round(series.maxAmount / issuePrice));

  const [ncds, setNcds] = useState(minNcds);
  const [submitting, setSubmitting] = useState(false);

  const amount = ncds * issuePrice;

  // Estimated receive at maturity (cumulative) or coupon income (coupon-paying)
  const ratio = series.redemptionAmount && series.issuePrice ? series.redemptionAmount / series.issuePrice : null;
  const cumulativeReceive = ratio ? Math.round(amount * ratio) : null;
  const annualCoupon = (amount * series.couponRate) / 100;
  const totalCoupon = (annualCoupon * series.tenureMonths) / 12;
  const couponMaturity = amount + totalCoupon;

  const canDec = ncds - incrNcds >= minNcds;
  const canInc = ncds + incrNcds <= maxNcds;

  const dec = () => canDec && setNcds((n) => n - incrNcds);
  const inc = () => canInc && setNcds((n) => n + incrNcds);

  const quickNcds = useMemo(() => {
    const candidates = [minNcds, minNcds * 5, minNcds * 10, minNcds * 50].filter((n) => n <= maxNcds);
    return Array.from(new Set(candidates));
  }, [minNcds, maxNcds]);

  const handleContinue = () => {
    if (submitting) return;
    setSubmitting(true);
    setCheckout({
      kind: 'ipo',
      issuance,
      series,
      amount,
      startedAt: Date.now(),
    });
    emit('bonds.apply.continued', {
      securityId: issuance.securityId,
      seriesCode: series.seriesCode,
      amount,
      ncds,
      effectiveYield: series.effectiveYield,
    });
    setTimeout(() => navigate('/checkout'), 300);
  };

  useEffect(() => {
    emit('bonds.apply.opened', {
      securityId: issuance.securityId,
      seriesCode: series.seriesCode,
      effectiveYield: series.effectiveYield,
    });
  }, [issuance.securityId, series.seriesCode, series.effectiveYield]);

  const dialogRef = useDialogA11y(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="fade-in flex-1 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-sheet-title"
        className="sheet-up bg-white rounded-t-[24px] px-5 pt-3 pb-6 flex flex-col max-h-[88vh] overflow-y-auto"
      >
        <div className="flex justify-center mb-3.5">
          <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
        </div>

        <div className="flex justify-between items-start mb-5">
          <div className="min-w-0 pr-2">
            <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">Apply to</div>
            <div id="apply-sheet-title" className="text-[17px] font-semibold tracking-tight mt-0.5 truncate">
              {issuance.issuerNameShort}
            </div>
            <div className="text-[12px] text-[#737373] mt-0.5">
              {series.series} · {series.tenureLabel} · {series.isCumulative ? 'Cumulative' : series.ipFrequency || '—'}
            </div>
          </div>
          <div
            className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg shrink-0 tnum"
            style={{ background: '#DCFCE7', color: '#16A34A' }}
          >
            {series.effectiveYield}% YTM
          </div>
        </div>

        <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium mb-2.5">
          Application amount
        </div>
        <div className="flex items-center justify-between p-1.5 bg-[#F5F5F5] rounded-[14px] mb-3">
          <button
            onClick={dec}
            disabled={!canDec}
            aria-label="Decrease NCDs"
            className="w-11 h-11 bg-white rounded-[10px] flex items-center justify-center active:scale-95 transition disabled:opacity-40"
          >
            <Minus className="w-5 h-5 text-[#737373]" strokeWidth={2} />
          </button>
          <div className="text-center px-2 min-w-0">
            <div className="text-[24px] font-bold tracking-tight leading-none tnum truncate">
              ₹{fmtINR(amount)}
            </div>
            <div className="text-[12px] text-[#737373] mt-1">
              {ncds} {ncds === 1 ? 'NCD' : 'NCDs'}
            </div>
          </div>
          <button
            onClick={inc}
            disabled={!canInc}
            aria-label="Increase NCDs"
            className="w-11 h-11 bg-[#0A0A0A] text-white rounded-[10px] flex items-center justify-center active:scale-95 transition disabled:opacity-40"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex gap-2 mb-[18px]">
          {quickNcds.map((v) => {
            const active = ncds === v;
            return (
              <button
                key={v}
                onClick={() => setNcds(v)}
                className={`flex-1 py-2.5 rounded-lg text-[12px] font-semibold transition tnum ${
                  active ? 'bg-[#0A0A0A] text-white' : 'bg-[#F5F5F5] text-[#0A0A0A]'
                }`}
              >
                {v} {v === 1 ? 'NCD' : 'NCDs'}
              </button>
            );
          })}
        </div>

        <div className="bg-[#F5F5F5] rounded-[12px] p-4 mb-4">
          <div className="flex justify-between py-1">
            <div className="text-[13px] text-[#737373]">You pay today</div>
            <div className="text-[13px] font-semibold tnum">₹{fmtINR(amount)}</div>
          </div>
          {series.isCumulative ? (
            <>
              <div className="flex justify-between py-1">
                <div className="text-[13px] text-[#737373]">Tenure</div>
                <div className="text-[13px] font-semibold">{series.tenureLabel}</div>
              </div>
              <div className="h-px bg-[#E5E5E5] my-1.5" />
              <div className="flex justify-between py-1">
                <div className="text-[13px] font-semibold">Receive at maturity</div>
                <div className="text-[15px] font-bold tnum" style={{ color: '#16A34A' }}>
                  ₹{fmtINR(cumulativeReceive ?? 0)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between py-1">
                <div className="text-[13px] text-[#737373]">
                  Coupon ({series.ipFrequency?.toLowerCase() ?? 'periodic'})
                </div>
                <div className="text-[13px] font-semibold tnum" style={{ color: '#16A34A' }}>
                  ~₹{fmtINR(Math.round(annualCoupon))}/yr
                </div>
              </div>
              <div className="flex justify-between py-1">
                <div className="text-[13px] text-[#737373]">Total interest ({series.tenureMonths} mo)</div>
                <div className="text-[13px] font-semibold tnum" style={{ color: '#16A34A' }}>
                  ₹{fmtINR(Math.round(totalCoupon))}
                </div>
              </div>
              <div className="h-px bg-[#E5E5E5] my-1.5" />
              <div className="flex justify-between py-1">
                <div className="text-[13px] font-semibold">Maturity amount</div>
                <div className="text-[15px] font-bold tnum">₹{fmtINR(Math.round(couponMaturity))}</div>
              </div>
            </>
          )}
        </div>

        <div
          className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[12px] mb-3.5"
          style={{ background: '#E0F2FE' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0"
            style={{ background: '#0369A1' }}
          />
          <div className="text-[12px] leading-[1.5]" style={{ color: '#0369A1' }}>
            Funds will be <b>blocked</b> in your bank account on apply, and debited only on allotment. Unallocated
            amounts are released back automatically.
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={submitting}
          className="bg-[#0A0A0A] text-white py-4 rounded-[14px] text-[15px] font-semibold disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              Continuing…
            </>
          ) : (
            <>Continue · ₹{fmtINR(amount)}</>
          )}
        </button>
        <div className="text-center text-[12px] text-[#A3A3A3] mt-2.5">
          ASBA application · Allotment {issuance.issueClose ? `by ${issuance.issueClose}` : 'on issue close'}
        </div>
      </div>
    </div>
  );
}
