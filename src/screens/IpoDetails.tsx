import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ArrowUpRight, Calendar, FileText } from 'lucide-react';
import RatingChip from '../components/RatingChip';
import AccordionSection from '../components/AccordionSection';
import ApplySheet from '../components/ApplySheet';
import Footer from '../components/Footer';
import ErrorState from '../components/ErrorState';
import { SkeletonDetail } from '../components/Skeleton';
import { fetchIpos, getCachedIssuance, type IpoIssuance, type IpoSeries } from '../api/ipos';
import { emit } from '../telemetry';

export default function IpoDetails() {
  const { secId } = useParams();
  const navigate = useNavigate();
  const [issuance, setIssuance] = useState<IpoIssuance | null>(() =>
    secId ? getCachedIssuance(secId) ?? null : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!secId || issuance) return;
    let cancelled = false;
    fetchIpos()
      .then((r) => {
        if (cancelled) return;
        const found = r.issuances.find((i) => i.securityId === secId);
        if (!found) setError(`Issuance ${secId} not in current offerings`);
        else setIssuance(found);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load issuance');
      });
    return () => {
      cancelled = true;
    };
  }, [secId, issuance, retryTick]);

  // Default to the highest-yield series + emit view event once
  useEffect(() => {
    if (issuance && !selectedSeriesId) {
      const top = [...issuance.series].sort((a, b) => b.effectiveYield - a.effectiveYield)[0];
      if (top) setSelectedSeriesId(top.seriesId);
      emit('bonds.ipo.viewed', {
        securityId: issuance.securityId,
        seriesCount: issuance.series.length,
        yieldMax: issuance.yieldMax,
      });
    }
  }, [issuance, selectedSeriesId]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <Header onBack={() => navigate(-1)} />
        <div className="flex-1 px-5 pb-6 flex items-center justify-center">
          <div className="max-w-sm w-full">
            <ErrorState
              title="Couldn't load IPO"
              message={error}
              onRetry={() => {
                setError(null);
                setRetryTick((n) => n + 1);
              }}
            />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!issuance) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <Header onBack={() => navigate(-1)} />
        <div className="flex-1 px-5 pb-6 overflow-y-auto">
          <SkeletonDetail />
        </div>
        <Footer />
      </div>
    );
  }

  const selected = issuance.series.find((s) => s.seriesId === selectedSeriesId) || issuance.series[0];
  const yieldRange =
    issuance.yieldMin === issuance.yieldMax
      ? `${issuance.yieldMin}%`
      : `${issuance.yieldMin}–${issuance.yieldMax}%`;
  const tenureRange =
    issuance.tenureMin === issuance.tenureMax
      ? issuance.tenureMin
      : `${issuance.tenureMin}–${issuance.tenureMax}`;

  const handleApply = () => {
    if (!selected) return;
    setApplyOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Header onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* Issuer block */}
        <div className="flex items-start gap-3.5 mb-3 rise" style={{ animationDelay: '0ms' }}>
          <div
            className="bg-[#0A0A0A] text-white rounded-[14px] flex items-center justify-center font-bold tracking-tighter text-[20px] shrink-0"
            style={{ width: 52, height: 52 }}
          >
            {issuance.issuerNameShort?.[0] ?? 'I'}
          </div>
          <div className="flex-1 pt-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[17px] font-semibold tracking-tight truncate">{issuance.issuerNameShort}</div>
              <RatingChip rating={issuance.rating} />
            </div>
            <div className="text-[12px] text-[#737373] mt-1">
              NCD IPO · {issuance.type} · {issuance.securityId}
            </div>
          </div>
        </div>

        {/* Issue window strip */}
        {(issuance.issueOpen || issuance.issueClose) && (
          <div
            className="flex items-center gap-2.5 mb-3.5 px-3.5 py-2.5 rounded-[12px] rise"
            style={{ background: '#E0F2FE', animationDelay: '20ms' }}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" strokeWidth={2} style={{ color: '#0369A1' }} />
            <div className="text-[12px] leading-[1.4] flex-1" style={{ color: '#0369A1' }}>
              <span className="font-semibold">Issue window:</span>{' '}
              {issuance.issueOpen && <span>opens {issuance.issueOpen}</span>}
              {issuance.issueOpen && issuance.issueClose && <span> · </span>}
              {issuance.issueClose && (
                <span>
                  closes <b>{issuance.issueClose}</b>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Issuance summary card */}
        <div
          className="bg-white border border-[#EBEBEB] rounded-[16px] p-[18px] mb-3.5 rise"
          style={{ animationDelay: '40ms' }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">
                Effective yield
              </div>
              <div
                className="text-[28px] font-bold tracking-tight leading-none mt-1.5 tnum"
                style={{ color: '#16A34A' }}
              >
                {yieldRange}
              </div>
              <div className="text-[12px] text-[#737373] mt-0.5">across {issuance.series.length} series</div>
            </div>
            <div>
              <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Tenure range</div>
              <div className="text-[17px] font-semibold mt-1.5">{tenureRange}</div>
              <div className="text-[12px] text-[#737373] mt-0.5">
                Min ₹{issuance.minAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Series picker */}
        <div className="rise mb-3" style={{ animationDelay: '80ms' }}>
          <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider mb-2.5">
            Pick a series
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {issuance.series.map((s) => {
              const active = s.seriesId === selectedSeriesId;
              return (
                <button
                  key={s.seriesId}
                  onClick={() => setSelectedSeriesId(s.seriesId)}
                  className={`shrink-0 px-3 py-2.5 rounded-[12px] text-left transition border ${
                    active
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                      : 'bg-white text-[#0A0A0A] border-[#EBEBEB]'
                  }`}
                  style={{ minWidth: 108 }}
                >
                  <div className="text-[10px] uppercase tracking-wider font-medium opacity-70">
                    {s.series}
                  </div>
                  <div className="text-[15px] font-bold tracking-tight tnum mt-0.5">
                    {s.effectiveYield}%
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-80">
                    {s.tenureLabel} · {s.isCumulative ? 'Cumulative' : s.ipFrequency || '—'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected series — pay & receive */}
        {selected && (
          <div
            className="bg-white border border-[#EBEBEB] rounded-[16px] p-[18px] mb-3.5 rise"
            style={{ animationDelay: '120ms' }}
          >
            <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider mb-3">
              {selected.series} · Pay & receive
            </div>
            {selected.isCumulative ? (
              <CumulativeSummary series={selected} />
            ) : (
              <CouponSummary series={selected} />
            )}
            <div className="h-px bg-[#F0F0F0] my-4" />
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Min" value={`₹${selected.minAmount.toLocaleString('en-IN')}`} />
              <Stat label="Step" value={`₹${selected.incrementAmount.toLocaleString('en-IN')}`} />
              <Stat label="Max" value={`₹${selected.maxAmount.toLocaleString('en-IN')}`} />
            </div>
          </div>
        )}

        {/* Issue info */}
        <div className="rise mb-2.5" style={{ animationDelay: '160ms' }}>
          <AccordionSection title="Issue info" hint="Issuer · Listing · Series count">
            <div className="px-[18px] py-2">
              {[
                ['Issuer', issuance.issuerName],
                ['Security id', issuance.securityId],
                ['Type', issuance.type],
                ['Series available', String(issuance.series.length)],
                ['Yield range', yieldRange],
                ['Tenure range', tenureRange],
              ].map(([k, v]: any, i, a) => (
                <div
                  key={k}
                  className={`flex justify-between gap-3 py-3 ${i < a.length - 1 ? 'border-b border-[#F0F0F0]' : ''}`}
                >
                  <div className="text-[13px] text-[#737373] shrink-0">{k}</div>
                  <div className="text-[13px] font-medium text-right break-words">{v}</div>
                </div>
              ))}
            </div>
          </AccordionSection>
        </div>

        {/* About issuer */}
        {issuance.issuerDescription && (
          <div className="rise mb-2.5" style={{ animationDelay: '180ms' }}>
            <AccordionSection title="About the issuer">
              <div className="px-[18px] py-3 text-[13px] leading-[1.55] text-[#737373]">
                {issuance.issuerDescription}
              </div>
            </AccordionSection>
          </div>
        )}

        {/* Documents */}
        {(issuance.imFileUrl || issuance.issuerLink) && (
          <div className="rise mb-2.5" style={{ animationDelay: '200ms' }}>
            <AccordionSection title="Documents">
              <div className="px-[18px] py-2">
                {issuance.imFileUrl && (
                  <a
                    href={issuance.imFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 py-3 border-b border-[#F0F0F0] active:opacity-60 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#737373]" strokeWidth={2} />
                    <div className="text-[13px] font-medium flex-1">Information memorandum</div>
                    <div className="text-[14px] text-[#737373]">↗</div>
                  </a>
                )}
                {issuance.issuerLink && (
                  <a
                    href={issuance.issuerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 py-3 active:opacity-60 transition"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#737373]" strokeWidth={2} />
                    <div className="text-[13px] font-medium flex-1">Issuer website</div>
                    <div className="text-[14px] text-[#737373]">↗</div>
                  </a>
                )}
              </div>
            </AccordionSection>
          </div>
        )}

        {/* Disclosures */}
        <div className="rise mb-3" style={{ animationDelay: '220ms' }}>
          <AccordionSection title="Disclosures" hint="Risk factors · Terms · Prospectus">
            <div className="px-[18px] py-3 text-[13px] leading-[1.55] text-[#737373]">
              Investment in non-convertible debentures involves risks including default risk, liquidity risk, and
              reinvestment risk. Read the issue prospectus before applying. Allotment is subject to issuer discretion;
              partial allotment or refund is possible.
            </div>
          </AccordionSection>
        </div>

        <Footer />
      </div>

      {/* Sticky CTA */}
      <div className="bg-white border-t border-[#EBEBEB] px-5 pt-3.5 pb-6">
        {selected && (
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] text-[#737373]">Applying for</div>
              <div className="text-[15px] font-semibold tracking-tight">
                {selected.series} <span className="font-normal text-[#737373] text-[12px]">· {selected.tenureLabel}</span>
              </div>
            </div>
            <div
              className="text-[12px] font-semibold px-2.5 py-1.5 rounded tnum"
              style={{ background: '#DCFCE7', color: '#16A34A' }}
            >
              {selected.effectiveYield}% YTM
            </div>
          </div>
        )}
        <button
          onClick={handleApply}
          disabled={!selected}
          className="w-full bg-[#0A0A0A] text-white py-[15px] rounded-[12px] text-[14px] font-semibold disabled:opacity-50 active:scale-[0.98] transition"
        >
          {selected ? `Apply from ₹${selected.minAmount.toLocaleString('en-IN')}` : 'Pick a series'}
        </button>
      </div>

      {applyOpen && selected && (
        <ApplySheet
          issuance={issuance}
          series={selected}
          onClose={() => setApplyOpen(false)}
        />
      )}
    </div>
  );
}

function CumulativeSummary({ series }: { series: IpoSeries }) {
  const ratio = series.redemptionAmount && series.issuePrice
    ? series.redemptionAmount / series.issuePrice
    : null;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[12px] text-[#A3A3A3]">Effective yield</div>
          <div className="text-[20px] font-bold mt-1 tnum" style={{ color: '#16A34A' }}>
            {series.effectiveYield}%
          </div>
        </div>
        <div>
          <div className="text-[12px] text-[#A3A3A3]">Return multiple</div>
          <div className="text-[20px] font-bold mt-1 tnum">
            {ratio ? `${ratio.toFixed(2)}×` : '—'}
          </div>
        </div>
      </div>
      <div className="text-[12px] text-[#737373] mt-2">
        Cumulative over <b>{series.tenureLabel}</b> · no interim payouts · paid in full at maturity
      </div>
    </div>
  );
}

function CouponSummary({ series }: { series: IpoSeries }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[12px] text-[#A3A3A3]">Coupon</div>
          <div className="text-[20px] font-bold mt-1 tnum">{series.couponRate}% p.a.</div>
        </div>
        <div>
          <div className="text-[12px] text-[#A3A3A3]">Frequency</div>
          <div className="text-[15px] font-semibold mt-1">{series.ipFrequency || '—'}</div>
        </div>
      </div>
      <div className="text-[12px] text-[#737373] mt-2">
        Receive coupons {series.ipFrequency?.toLowerCase() ?? 'as scheduled'} for <b>{series.tenureLabel}</b>, plus
        principal back at maturity.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-[#A3A3A3] uppercase tracking-wider font-medium">{label}</div>
      <div className="text-[13px] font-semibold mt-0.5 tnum">{value}</div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
      <button
        onClick={onBack}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
      </button>
      <div className="text-[15px] font-semibold tracking-tight">IPO details</div>
      <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition">
        <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
