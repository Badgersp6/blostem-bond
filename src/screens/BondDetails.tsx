import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ArrowUpRight, MoreHorizontal, FileText } from 'lucide-react';
import { bonds as mockBonds } from '../data';
import { fetchBondDetail, type ApiBondDetail, type PayoutEntry, type DocumentLink } from '../api/bonds';
import { emit } from '../telemetry';
import RatingChip from '../components/RatingChip';
import AccordionSection from '../components/AccordionSection';
import InvestSheet from '../components/InvestSheet';
import PayoutSheet from '../components/PayoutSheet';
import Footer from '../components/Footer';
import ErrorState from '../components/ErrorState';
import { SkeletonDetail } from '../components/Skeleton';

type DetailModel = ApiBondDetail & {
  // Optional rich fields only present on mock bonds
  ratingChangeNote?: string;
  ratingReviewedAt?: string;
  ratingOutlookNote?: string;
  financials?: any;
};

function fromMock(isin: string): DetailModel | null {
  const b: any = mockBonds.find((x) => x.isin === isin);
  if (!b) return null;
  const sched = (b.payoutSchedule ?? []).map((p: any) => ({
    date: p.date,
    label: p.label,
    amount: p.amount,
    isNext: !!p.isNext,
    kind: 'ip' as const,
  }));
  return {
    isin: b.isin,
    category: 'bond-secondary',
    name: b.name,
    fullName: b.name,
    type: b.type,
    rating: b.rating,
    ratingAgency: b.ratingAgency,
    ratingOutlook: b.ratingOutlook,
    ytm: b.ytm,
    coupon: b.coupon ?? b.ytm,
    couponFreq: b.couponFreq ?? 'Monthly',
    minInvest: b.minInvest,
    unitPrice: b.unitPrice ?? 1000,
    minUnits: b.minUnits ?? 10,
    // Mocks don't carry the price / accrued split, so default to 100% principal
    principalPerLot: b.minInvest,
    accruedPerLot: 0,
    maturityShort: b.maturityShort,
    maturityFull: b.maturityFull ?? b.maturityShort,
    tenureMonths: b.tenureMonths ?? 0,
    issuerTypeLabel: b.issuerType ?? '—',
    security: b.security ?? '—',
    listing: b.listing ?? '—',
    tax: b.tax ?? 'As per slab',
    perPayoutPerMin: b.perPayoutPerMin ?? 0,
    totalPayouts: b.totalPayouts ?? 0,
    payoutSchedule: sched,
    fullSchedule: sched,
    documents: [],
    ratingChangeNote: b.ratingChangeNote,
    ratingReviewedAt: b.ratingReviewedAt,
    financials: b.financials,
  };
}

export default function BondDetails() {
  const { isin } = useParams();
  const navigate = useNavigate();
  const [investOpen, setInvestOpen] = useState(false);
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const [bond, setBond] = useState<DetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!isin) return;
    let cancelled = false;
    setBond(null);
    setError(null);
    fetchBondDetail(isin)
      .then((b) => {
        if (cancelled) return;
        setBond(b as DetailModel);
        emit('bonds.bond.viewed', { isin: b.isin, ytm: b.ytm, category: b.category });
      })
      .catch((e) => {
        if (cancelled) return;
        const fallback = fromMock(isin);
        if (fallback) {
          setBond(fallback);
          emit('bonds.bond.viewed', { isin: fallback.isin, source: 'mock' });
        } else {
          setError(e?.message || 'Failed to load bond');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isin, retryTick]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <ScreenHeader onBack={() => navigate(-1)} />
        <div className="flex-1 px-5 pb-6 flex items-center justify-center">
          <div className="max-w-sm w-full">
            <ErrorState
              title="Couldn't load bond"
              message={error}
              onRetry={() => setRetryTick((n) => n + 1)}
            />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!bond) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <ScreenHeader onBack={() => navigate(-1)} />
        <div className="flex-1 px-5 pb-6 overflow-y-auto">
          <SkeletonDetail />
        </div>
        <Footer />
      </div>
    );
  }

  const fin = bond.financials;
  const hasSchedule = bond.payoutSchedule && bond.payoutSchedule.length > 0;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <ScreenHeader onBack={() => navigate(-1)} showActions />

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* Issuer block */}
        <div className="flex items-start gap-3.5 mb-4 rise" style={{ animationDelay: '0ms' }}>
          <div
            className="bg-[#0A0A0A] text-white rounded-[14px] flex items-center justify-center font-bold tracking-tighter text-[20px] shrink-0"
            style={{ width: 52, height: 52 }}
          >
            {bond.name?.[0] ?? '?'}
          </div>
          <div className="flex-1 pt-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[17px] font-semibold tracking-tight">{bond.name}</div>
              <RatingChip rating={bond.rating} />
            </div>
            <div className="text-[12px] text-[#737373] mt-1 truncate">
              {bond.type} · {bond.isin}
            </div>
          </div>
        </div>

        {/* Stat card */}
        <div className="bg-white border border-[#EBEBEB] rounded-[16px] p-[18px] mb-3.5 rise" style={{ animationDelay: '40ms' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Yield to maturity</div>
              <div className="text-[28px] font-bold tracking-tight leading-none mt-1.5 tnum" style={{ color: '#16A34A' }}>
                {bond.ytm}%
              </div>
            </div>
            <div>
              <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Coupon</div>
              <div className="text-[17px] font-semibold mt-1.5 tnum">{bond.coupon}% p.a.</div>
              <div className="text-[12px] text-[#737373] mt-0.5">Paid {bond.couponFreq.toLowerCase()}</div>
            </div>
          </div>
          <div className="h-px bg-[#F0F0F0] my-4" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Min investment</div>
              <div className="text-[17px] font-semibold mt-1.5 tnum">₹{bond.minInvest.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Maturity</div>
              <div className="text-[17px] font-semibold mt-1.5">{bond.maturityFull}</div>
              <div className="text-[12px] text-[#737373] mt-0.5">
                {bond.tenureLabel || `${bond.tenureMonths} months`}
              </div>
            </div>
          </div>
        </div>

        {/* Cashflow expanded */}
        <div className="rise mb-2.5" style={{ animationDelay: '80ms' }}>
          <AccordionSection
            title="Cashflow"
            badge={
              <span
                className="text-[12px] font-semibold px-2 py-0.5 rounded"
                style={{ background: '#DCFCE7', color: '#16A34A' }}
              >
                {bond.couponFreq}
              </span>
            }
            defaultOpen
          >
            <div className="px-[18px] pt-3.5 pb-4">
              <div className="flex justify-between mb-3.5">
                <div>
                  <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Per payout</div>
                  <div className="text-[15px] font-semibold mt-1 tnum">
                    {bond.perPayoutPerMin > 0 ? `₹${bond.perPayoutPerMin.toLocaleString('en-IN')}` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Total payouts</div>
                  <div className="text-[15px] font-semibold mt-1 tnum">
                    {bond.totalPayouts ? `${bond.totalPayouts} over tenure` : '—'}
                  </div>
                </div>
              </div>
              {hasSchedule ? (
                <div className="bg-[#F5F5F5] rounded-[10px] px-3 mb-3">
                  {bond.payoutSchedule.map((p: PayoutEntry, i: number, a: PayoutEntry[]) => (
                    <div
                      key={i}
                      className={`flex justify-between items-center py-2.5 ${
                        i < a.length - 1 ? 'border-b border-[#EBEBEB]' : ''
                      }`}
                    >
                      <div>
                        <div className="text-[13px] font-medium">{p.date}</div>
                        <div className="text-[12px] text-[#A3A3A3] mt-0.5">{p.label}</div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        {p.kind !== 'ip' && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={
                              p.kind === 'combined'
                                ? { background: '#DCFCE7', color: '#16A34A' }
                                : { background: '#E0F2FE', color: '#0369A1' }
                            }
                          >
                            {p.kind === 'combined' ? 'IP + Principal' : 'Principal'}
                          </span>
                        )}
                        <div
                          className="text-[13px] font-semibold tnum"
                          style={p.isNext ? { color: '#16A34A' } : {}}
                        >
                          ₹{p.amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#F5F5F5] rounded-[10px] p-3 mb-3 text-[12px] text-[#737373]">
                  Cashflow schedule not available
                </div>
              )}
              {bond.totalPayouts > 3 && bond.fullSchedule.length > 0 && (
                <button
                  onClick={() => setPayoutsOpen(true)}
                  className="flex justify-between items-center w-full mb-3 active:opacity-60 transition"
                >
                  <div className="text-[13px] font-medium">View all {bond.totalPayouts} payouts</div>
                  <div className="text-[14px]">→</div>
                </button>
              )}
              <div className="flex gap-2.5 p-2.5 px-3 bg-[#F5F5F5] rounded-lg">
                <div className="text-[12px] text-[#737373] leading-[1.5]">
                  <b style={{ color: '#0A0A0A' }}>Tax</b> · TDS @ 10% applies if total interest exceeds ₹5,000/year
                </div>
              </div>
            </div>
          </AccordionSection>
        </div>

        {/* Bond Info collapsed */}
        <div className="rise mb-2.5" style={{ animationDelay: '120ms' }}>
          <AccordionSection title="Bond info" hint="Security · Maturity · Coupon · Frequency">
            <div className="px-[18px] py-2">
              {[
                ['Security', bond.security],
                ['Maturity Date', bond.maturityFull],
                ['Coupon Rate', `${bond.coupon}% p.a.`],
                ['Payout Frequency', bond.couponFreq],
              ].map(([k, v]: any, i, a) => (
                <div
                  key={k}
                  className={`flex justify-between py-3 ${i < a.length - 1 ? 'border-b border-[#F0F0F0]' : ''}`}
                >
                  <div className="text-[13px] text-[#737373]">{k}</div>
                  <div className="text-[13px] font-medium">{v}</div>
                </div>
              ))}
            </div>
          </AccordionSection>
        </div>

        {/* Credit health (always show if rating is present) */}
        {bond.rating && bond.rating !== '—' && (
          <div className="rise mb-2.5" style={{ animationDelay: '160ms' }}>
            <AccordionSection
              title="Credit health"
              hint={bond.ratingAgency ? `Rated by ${bond.ratingAgency}` : undefined}
            >
              <div className="px-[18px] pt-4 pb-4">
                <div className="bg-[#F5F5F5] rounded-[12px] p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-[12px] text-[#737373]">Current rating</div>
                      <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                        <div className="text-[22px] font-bold tracking-tight leading-none">{bond.rating}</div>
                        {bond.ratingOutlook && (
                          <div className="text-[12px] text-[#737373]">{bond.ratingOutlook}</div>
                        )}
                      </div>
                    </div>
                    {bond.ratingReviewedAt && (
                      <div className="text-right">
                        <div className="text-[12px] text-[#737373]">Reviewed</div>
                        <div className="text-[13px] font-semibold mt-1">{bond.ratingReviewedAt}</div>
                      </div>
                    )}
                  </div>
                  {bond.ratingChangeNote && (
                    <div className="flex gap-2.5 p-2.5 px-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                      <div className="w-2 h-2 rounded-full mt-[6px] shrink-0" style={{ background: '#D97706' }} />
                      <div className="text-[12px] leading-[1.5]" style={{ color: '#92400E' }}>
                        {bond.ratingChangeNote}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AccordionSection>
          </div>
        )}

        {/* About the Company — issuer description + financials snapshot + termsheet */}
        {(() => {
          const termsheet = bond.documents.find((d) => /term sheet/i.test(d.label));
          const hasAny = bond.issuerDescription || fin || termsheet;
          if (!hasAny) return null;
          return (
            <div className="rise mb-2.5" style={{ animationDelay: '200ms' }}>
              <AccordionSection
                title="About the Company"
                hint={fin?.auditedNote ?? 'Issuer profile · financials'}
              >
                {bond.issuerDescription && (
                  <div className="px-[18px] py-4 text-[13px] leading-[1.55] text-[#0A0A0A]">
                    {bond.issuerDescription}
                  </div>
                )}

                {fin?.metrics && (
                  <>
                    {bond.issuerDescription && <div className="h-px bg-[#F0F0F0] mx-[18px]" />}
                    <div className="px-[18px] py-4">
                      <div className="flex justify-between items-baseline mb-3.5">
                        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
                          Key financials
                        </div>
                        <div className="text-[12px] text-[#A3A3A3]">FY24 vs FY23</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {fin.metrics.map((m: any) => (
                          <div key={m.label}>
                            <div className="text-[12px] text-[#737373]">{m.label}</div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <div className="text-[17px] font-bold tracking-tight tnum">{m.value}</div>
                              <div className="text-[12px] font-semibold tnum" style={{ color: '#16A34A' }}>
                                {m.delta}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {fin?.summary && (
                  <>
                    <div className="h-px bg-[#F0F0F0] mx-[18px]" />
                    <div className="px-[18px] py-4">
                      <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider mb-2.5">
                        Business summary
                      </div>
                      <div className="text-[13px] leading-[1.55]">{fin.summary}</div>
                    </div>
                  </>
                )}

                {termsheet && (
                  <>
                    <div className="h-px bg-[#F0F0F0] mx-[18px]" />
                    <a
                      href={termsheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex justify-between items-center mx-[18px] py-3.5 active:opacity-60 transition"
                    >
                      <div className="text-[13px] font-medium">
                        {fin ? 'Full financials in term sheet' : 'View detailed financials in term sheet'}
                      </div>
                      <div className="text-[14px] text-[#737373]">↗</div>
                    </a>
                  </>
                )}
              </AccordionSection>
            </div>
          );
        })()}

        {/* Disclosures — all ISIN documents + risk factors */}
        <div className="rise mb-3" style={{ animationDelay: '260ms' }}>
          <AccordionSection
            title="Disclosures"
            hint={
              bond.documents.length > 0
                ? `${bond.documents.length} document${bond.documents.length === 1 ? '' : 's'} · Risk factors`
                : 'Risk factors · Terms'
            }
          >
            {bond.documents.length > 0 && (
              <div className="px-[18px] py-2">
                {bond.documents.map((d: DocumentLink, i, a) => (
                  <a
                    key={d.url}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2.5 py-3 active:opacity-60 transition ${
                      i < a.length - 1 ? 'border-b border-[#F0F0F0]' : ''
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-[#737373] shrink-0" strokeWidth={2} />
                    <div className="text-[13px] font-medium flex-1 truncate">{d.label}</div>
                    <div className="text-[14px] text-[#737373] shrink-0">↗</div>
                  </a>
                ))}
              </div>
            )}
            {bond.documents.length > 0 && <div className="h-px bg-[#F0F0F0] mx-[18px]" />}
            <div className="px-[18px] py-3 text-[13px] leading-[1.55] text-[#737373]">
              {bond.remarks ||
                `Investment in non-convertible debentures involves risks including default risk, liquidity risk, and reinvestment risk. Read the term sheet and information memorandum before investing.`}
            </div>
          </AccordionSection>
        </div>
        <Footer />
      </div>

      {/* Sticky CTA */}
      <div className="bg-white border-t border-[#EBEBEB] px-5 pt-3.5 pb-6">
        {(bond.settlementDate || bond.quoteValidUntil) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2.5 text-[11px] text-[#737373]">
            {bond.settlementDate && <span>Settles {bond.settlementDate}</span>}
            {bond.settlementDate && bond.quoteValidUntil && (
              <span className="text-[#D4D4D4]">·</span>
            )}
            {bond.quoteValidUntil && (
              <span>
                Quote valid till <span className="font-medium text-[#0A0A0A]">{bond.quoteValidUntil}</span>
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[12px] text-[#737373]">From</div>
            <div className="text-[16px] font-semibold tracking-tight tnum">
              ₹{bond.minInvest.toLocaleString('en-IN')}{' '}
              <span className="font-normal text-[#737373] text-[13px]">· {bond.ytm}% YTM</span>
            </div>
          </div>
          {bond.perPayoutPerMin > 0 && (
            <div
              className="text-[12px] font-semibold px-2.5 py-1.5 rounded"
              style={{ background: '#DCFCE7', color: '#16A34A' }}
            >
              ~₹{bond.perPayoutPerMin.toLocaleString('en-IN')}/payout
            </div>
          )}
        </div>
        <button
          onClick={() => setInvestOpen(true)}
          className="w-full bg-[#0A0A0A] text-white py-[15px] rounded-[12px] text-[14px] font-semibold active:scale-[0.98] transition"
        >
          Invest now
        </button>
      </div>

      {investOpen && <InvestSheet bond={bond} onClose={() => setInvestOpen(false)} />}
      {payoutsOpen && (
        <PayoutSheet
          bondName={bond.name}
          schedule={bond.fullSchedule}
          minInvest={bond.minInvest}
          onClose={() => setPayoutsOpen(false)}
        />
      )}
    </div>
  );
}

function ScreenHeader({ onBack, showActions = false }: { onBack: () => void; showActions?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
      <button
        onClick={onBack}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
      </button>
      {showActions ? (
        <div className="flex gap-2">
          <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition">
            <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition">
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <div className="w-9 h-9" />
      )}
    </div>
  );
}
