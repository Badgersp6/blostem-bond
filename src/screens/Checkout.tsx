// Review screen between the invest/apply sheet and order placement.
// KYC is checked at SDK login (AuthGate), so this screen only branches the
// CTA based on the already-known session.kycStatus:
//   - 'done'    → Invest · ₹X → /placing-order (creates order, redirects to PG)
//   - 'pending' → Complete KYC to invest → /kyc/start

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import Footer from '../components/Footer';
import { getCheckout } from '../checkout';
import { getSession } from '../api/auth';

function fmtINR(n: number): string {
  return n.toLocaleString('en-IN');
}

export default function Checkout() {
  const navigate = useNavigate();
  const checkout = getCheckout();
  const session = getSession();
  const isKycDone = session?.kycStatus === 'done';
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!checkout) {
    return <Navigate to="/" replace />;
  }

  const handleCta = () => {
    if (isKycDone) {
      navigate('/placing-order');
    } else {
      navigate('/kyc/start');
    }
  };

  const isBond = checkout.kind === 'bond';
  const summary = isBond
    ? {
        title: checkout.bond.name,
        sub: `${checkout.bond.type} · ${checkout.bond.isin}`,
        ytm: `${checkout.bond.ytm}% YTM`,
        amount: checkout.amount,
        rows: [
          ['Quantity', `${checkout.qty} ${checkout.qty === 1 ? 'lot' : 'lots'}`],
          ['Settlement', checkout.settlementType === '1' ? 'T+0 (same day)' : 'T+1 (next day)'],
          ['Tenure', `${checkout.bond.tenureMonths} months`],
        ],
      }
    : {
        title: checkout.issuance.issuerNameShort,
        sub: `${checkout.series.series} · ${checkout.series.tenureLabel} · ${checkout.series.isCumulative ? 'Cumulative' : checkout.series.ipFrequency || 'Coupon'}`,
        ytm: `${checkout.series.effectiveYield}% YTM`,
        amount: checkout.amount,
        rows: [
          ['NCDs', String(Math.floor(checkout.amount / Math.max(1, checkout.series.issuePrice)))],
          ['Tenure', checkout.series.tenureLabel],
          ['Settlement', 'ASBA (funds blocked, debited on allotment)'],
        ],
      };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <div className="text-[15px] font-semibold tracking-tight">Review</div>
        <div className="w-9 h-9" />
      </div>

      <div className="flex-1 px-5 pb-6 overflow-y-auto">
        <div
          className="bg-white border border-[#EBEBEB] rounded-[16px] p-5 mb-3.5 rise"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="min-w-0 pr-2">
              <div className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">
                {isBond ? 'Investing in' : 'Applying to'}
              </div>
              <div className="text-[17px] font-semibold tracking-tight mt-0.5 truncate">{summary.title}</div>
              <div className="text-[12px] text-[#737373] mt-0.5 truncate">{summary.sub}</div>
            </div>
            <div
              className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg shrink-0 tnum"
              style={{ background: '#DCFCE7', color: '#16A34A' }}
            >
              {summary.ytm}
            </div>
          </div>

          <div className="h-px bg-[#F0F0F0] my-3" />

          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="text-[13px] text-[#737373]">Amount</div>
              {isBond && (
                <button
                  onClick={() => setShowBreakdown((v) => !v)}
                  aria-label="View amount breakdown"
                  aria-expanded={showBreakdown}
                  className="w-4 h-4 flex items-center justify-center text-[#A3A3A3] active:text-[#0A0A0A] transition"
                >
                  <Info className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
            <div className="text-[22px] font-bold tracking-tight tnum">₹{fmtINR(summary.amount)}</div>
          </div>

          {isBond && showBreakdown && (
            <div className="bg-[#F5F5F5] rounded-[10px] p-3 mb-2 mt-2 expand">
              <div className="text-[11px] text-[#737373] uppercase tracking-wider font-medium mb-2">
                Net traded value
              </div>
              <div className="flex justify-between py-1">
                <div className="text-[12px] text-[#737373]">
                  Principal · {checkout.qty} {checkout.qty === 1 ? 'lot' : 'lots'}
                </div>
                <div className="text-[12px] tnum">
                  ₹{fmtINR(Math.round(checkout.bond.principalPerLot * checkout.qty))}
                </div>
              </div>
              <div className="flex justify-between py-1">
                <div className="text-[12px] text-[#737373]">Accrued interest</div>
                <div className="text-[12px] tnum">
                  ₹{fmtINR(Math.round(checkout.bond.accruedPerLot * checkout.qty))}
                </div>
              </div>
              <div className="h-px bg-[#E5E5E5] my-1" />
              <div className="flex justify-between py-1">
                <div className="text-[12px] font-semibold">Total payable</div>
                <div className="text-[12px] font-semibold tnum">₹{fmtINR(checkout.amount)}</div>
              </div>
              <div className="text-[10px] text-[#A3A3A3] mt-1.5 leading-[1.4]">
                Quote refreshed twice daily · principal at offer price + interest accrued since last coupon
              </div>
            </div>
          )}

          <div className="mt-2">
            {summary.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2 text-[13px]">
                <div className="text-[#737373]">{k}</div>
                <div className="font-medium text-right">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="bg-white border border-[#EBEBEB] rounded-[14px] p-4 flex items-start gap-3 rise"
          style={{ animationDelay: '60ms' }}
        >
          {isKycDone ? (
            <>
              <ShieldCheck
                className="w-4 h-4 mt-0.5 shrink-0"
                strokeWidth={2}
                style={{ color: '#16A34A' }}
              />
              <div>
                <div className="text-[13px] font-semibold mb-0.5">KYC verified</div>
                <div className="text-[12px] text-[#737373] leading-[1.5]">
                  {isBond
                    ? "You'll be taken to the payment gateway after we confirm the deal."
                    : "You'll authorise the ASBA mandate to block the funds with your bank."}
                </div>
              </div>
            </>
          ) : (
            <>
              <ShieldAlert
                className="w-4 h-4 mt-0.5 shrink-0"
                strokeWidth={2}
                style={{ color: '#D97706' }}
              />
              <div>
                <div className="text-[13px] font-semibold mb-0.5">One-time KYC required</div>
                <div className="text-[12px] text-[#737373] leading-[1.5]">
                  Complete a quick KYC to invest. It takes about 5 minutes and only happens once.
                </div>
              </div>
            </>
          )}
        </div>

        <Footer />
      </div>

      <div className="bg-white border-t border-[#EBEBEB] px-5 pt-3.5 pb-6">
        <button
          onClick={handleCta}
          className="w-full bg-[#0A0A0A] text-white py-[15px] rounded-[12px] text-[14px] font-semibold active:scale-[0.98] transition"
        >
          {isKycDone
            ? isBond
              ? `Invest · ₹${fmtINR(checkout.amount)}`
              : `Apply · ₹${fmtINR(checkout.amount)}`
            : 'Complete KYC to invest'}
        </button>
      </div>
    </div>
  );
}
