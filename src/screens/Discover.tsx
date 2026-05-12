import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  BadgeCheck,
  CalendarClock,
  Layers,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import BondCard from '../components/BondCard';
import IpoCard from '../components/IpoCard';
import Footer from '../components/Footer';
import ErrorState from '../components/ErrorState';
import { SkeletonCard } from '../components/Skeleton';
import { fetchBonds, type ApiBondDetail } from '../api/bonds';
import { fetchIpos, type IpoIssuance } from '../api/ipos';
import { getHoldings, getPendingOrders, summarizeHoldings, subscribeOrder } from '../api/orders';
import { getSession } from '../api/auth';

const filterChips: Array<{
  label: string;
  icon: React.ReactNode;
  to: string;
}> = [
  {
    label: 'Invest at ₹10K',
    icon: <Wallet className="w-3.5 h-3.5" strokeWidth={2} />,
    to: '/bonds?filter=min10k',
  },
  {
    label: 'Yield > 10%',
    icon: <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />,
    to: '/bonds?filter=highYield10',
  },
  {
    label: 'IPO · No KYC',
    icon: <Zap className="w-3.5 h-3.5" strokeWidth={2} />,
    to: '/ipos',
  },
  {
    label: 'Monthly payout',
    icon: <CalendarClock className="w-3.5 h-3.5" strokeWidth={2} />,
    to: '/bonds?filter=monthly',
  },
];

function fmtINR(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, '')} L`;
  return n.toLocaleString('en-IN');
}

export default function Discover() {
  const navigate = useNavigate();

  const [bonds, setBonds] = useState<ApiBondDetail[] | null>(null);
  const [bondsError, setBondsError] = useState<string | null>(null);
  const [bondsRetryTick, setBondsRetryTick] = useState(0);

  const [issuances, setIssuances] = useState<IpoIssuance[] | null>(null);
  const [iposTotal, setIposTotal] = useState(0);
  const [iposError, setIposError] = useState<string | null>(null);
  const [iposRetryTick, setIposRetryTick] = useState(0);

  // Live activity derived from the orders store (re-renders on changes)
  const [, force] = useState(0);
  const pendingOrders = getPendingOrders();
  const pendingCount = pendingOrders.length;
  const holdings = getHoldings();
  const summary = summarizeHoldings(holdings);
  const featuredPending = pendingOrders.slice(0, 3);

  useEffect(() => {
    const all = [...holdings, ...pendingOrders];
    const unsubs = all.map((o) => subscribeOrder(o.orderNo, () => force((n) => n + 1)));
    return () => unsubs.forEach((u) => u());
  }, [holdings.length, pendingCount]);

  useEffect(() => {
    let cancelled = false;
    setBondsError(null);
    fetchBonds()
      .then((r) => {
        if (cancelled) return;
        setBonds(r.data);
      })
      .catch((e) => {
        if (cancelled) return;
        setBonds([]);
        setBondsError(e?.message || 'Failed to load bonds');
      });
    return () => {
      cancelled = true;
    };
  }, [bondsRetryTick]);

  useEffect(() => {
    let cancelled = false;
    setIposError(null);
    fetchIpos()
      .then((r) => {
        if (cancelled) return;
        const sorted = [...r.issuances].sort((a, b) => b.yieldMax - a.yieldMax);
        setIssuances(sorted.slice(0, 2));
        setIposTotal(r.total || r.issuances.length);
      })
      .catch((e) => {
        if (cancelled) return;
        setIssuances([]);
        setIposError(e?.message || 'Failed to load IPOs');
      });
    return () => {
      cancelled = true;
    };
  }, [iposRetryTick]);

  const topBonds = useMemo(() => {
    if (!bonds) return [];
    return [...bonds].sort((a, b) => b.ytm - a.ytm).slice(0, 5);
  }, [bonds]);

  const session = getSession();
  const profileInitial = (session?.email?.[0] ?? session?.phone?.[0] ?? '?').toUpperCase();
  const kycPending = session?.kycStatus !== 'done';

  const maxYtm = useMemo(() => {
    if (!bonds || bonds.length === 0) return null;
    return Math.max(...bonds.map((b) => b.ytm));
  }, [bonds]);

  const minInvest = useMemo(() => {
    if (!bonds || bonds.length === 0) return null;
    return Math.min(...bonds.map((b) => b.minInvest));
  }, [bonds]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex items-center justify-between px-5 pt-3 pb-3.5 rise" style={{ animationDelay: '0ms' }}>
        <div className="text-[17px] font-semibold tracking-tight">Bonds</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/bonds')}
            aria-label="Search all bonds"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
          >
            <Search className="w-4 h-4 text-[#737373]" strokeWidth={2} />
          </button>
          <button
            onClick={() => navigate('/profile')}
            aria-label="Profile"
            className="relative w-8 h-8 flex items-center justify-center rounded-full bg-[#0A0A0A] text-white text-[12px] font-bold active:scale-95 transition"
          >
            {profileInitial}
            {kycPending && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#F5F5F5]"
                style={{ background: '#D97706' }}
              />
            )}
          </button>
          <button
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
          >
            <X className="w-4 h-4 text-[#737373]" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="px-5 pb-5 rise" style={{ animationDelay: '40ms' }}>
        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
          Fixed Income
        </div>
        <div className="text-[28px] font-semibold leading-[1.15] tracking-tight mt-2">
          {maxYtm !== null ? (
            <>
              Earn up to <span style={{ color: '#16A34A' }} className="tnum">{maxYtm}%</span>
              <br />
              on bonds
            </>
          ) : (
            <>
              Earn high returns
              <br />
              on bonds
            </>
          )}
        </div>
        <div className="text-[13px] text-[#737373] mt-2 leading-[1.4]">
          {minInvest !== null
            ? `Start from ₹${fmtINR(minInvest)} · trade-grade bond inventory`
            : 'Start from ₹10,000 with monthly payouts'}
        </div>
      </div>

      {/* Filter chips — each pre-applies a filter on the destination list */}
      <div
        className="px-5 pb-5 flex gap-2 overflow-x-auto no-scrollbar rise"
        style={{ animationDelay: '80ms' }}
      >
        {filterChips.map((f) => (
          <button
            key={f.label}
            onClick={() => navigate(f.to)}
            className="flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-full text-[12px] font-medium whitespace-nowrap bg-white border border-[#EBEBEB] text-[#0A0A0A] active:scale-95 transition"
          >
            <span className="text-[#737373]">{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders in progress — only when there's something to show */}
      {featuredPending.length > 0 && (
        <>
          <div
            className="px-5 pb-3 flex justify-between items-baseline rise"
            style={{ animationDelay: '100ms' }}
          >
            <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
              Orders in progress
            </div>
            <button onClick={() => navigate('/orders')} className="text-[12px] font-medium">
              View all {pendingCount} →
            </button>
          </div>
          <div className="px-5 flex flex-col gap-2.5 mb-5">
            {featuredPending.map((o, i) => (
              <button
                key={o.orderNo}
                onClick={() => navigate(`/orders/${o.orderNo}`)}
                className="w-full text-left bg-white border border-[#EBEBEB] rounded-[14px] p-4 active:scale-[0.99] transition rise"
                style={{ animationDelay: `${140 + i * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="min-w-0 pr-2">
                    <div className="text-[13px] font-semibold tracking-tight truncate">
                      {o.kind === 'bond' ? o.bondName ?? 'Bond' : `${o.issuerName} · ${o.seriesLabel}`}
                    </div>
                    <div className="text-[11px] text-[#A3A3A3] mt-0.5 tnum">{o.orderNo}</div>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-1 rounded uppercase tracking-wider whitespace-nowrap shrink-0"
                    style={
                      o.paymentStatus === 'FAILED'
                        ? { background: '#FEE2E2', color: '#DC2626' }
                        : o.paymentStatus === 'SUCCESS'
                          ? { background: '#E0F2FE', color: '#0369A1' }
                          : { background: '#FEF3C7', color: '#92400E' }
                    }
                  >
                    {o.paymentStatus === 'FAILED'
                      ? 'Failed'
                      : o.paymentStatus === 'SUCCESS'
                        ? 'Settling'
                        : 'Pending payment'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0]">
                  <div className="text-[14px] font-semibold tnum">
                    ₹{o.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[12px] font-semibold text-[#0A0A0A]">View →</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Top opportunities */}
      <div
        className="px-5 pb-3 flex justify-between items-baseline rise"
        style={{ animationDelay: '120ms' }}
      >
        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
          Top opportunities
        </div>
        <button onClick={() => navigate('/bonds')} className="text-[12px] font-medium">
          View all bonds →
        </button>
      </div>

      {bondsError ? (
        <div className="px-5 mb-3">
          <ErrorState
            title="Couldn't load bonds"
            message={bondsError}
            onRetry={() => setBondsRetryTick((n) => n + 1)}
          />
        </div>
      ) : bonds === null ? (
        <div className="px-5 flex flex-col gap-2.5">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-2.5">
          {topBonds.map((b, i) => (
            <div key={b.isin} className="rise" style={{ animationDelay: `${160 + i * 50}ms` }}>
              <BondCard bond={b} />
            </div>
          ))}
        </div>
      )}

      {/* NCD IPOs */}
      {iposError ? (
        <>
          <div
            className="px-5 pt-5 pb-3 flex justify-between items-baseline rise"
            style={{ animationDelay: '260ms' }}
          >
            <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">NCD IPOs</div>
          </div>
          <div className="px-5">
            <ErrorState
              title="Couldn't load IPOs"
              message={iposError}
              onRetry={() => setIposRetryTick((n) => n + 1)}
            />
          </div>
        </>
      ) : (
        issuances &&
        issuances.length > 0 && (
          <>
            <div
              className="px-5 pt-5 pb-3 flex justify-between items-baseline rise"
              style={{ animationDelay: '260ms' }}
            >
              <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
                NCD IPOs
              </div>
              <button onClick={() => navigate('/ipos')} className="text-[12px] font-medium">
                View all {iposTotal} →
              </button>
            </div>
            <div className="px-5 flex flex-col gap-2.5">
              {issuances.map((issuance, i) => (
                <div
                  key={issuance.securityId}
                  className="rise"
                  style={{ animationDelay: `${300 + i * 60}ms` }}
                >
                  <IpoCard issuance={issuance} />
                </div>
              ))}
            </div>
          </>
        )
      )}

      {/* Your portfolio — only when there's at least one holding */}
      {holdings.length > 0 && (
        <>
          <div
            className="px-5 pt-6 pb-3 flex justify-between items-baseline rise"
            style={{ animationDelay: '340ms' }}
          >
            <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
              Your portfolio
            </div>
            <button onClick={() => navigate('/portfolio')} className="text-[12px] font-medium">
              View all →
            </button>
          </div>
          <button
            onClick={() => navigate('/portfolio')}
            className="mx-5 mb-2 bg-white border border-[#EBEBEB] rounded-[16px] p-5 text-left active:scale-[0.99] transition rise"
            style={{ animationDelay: '360ms' }}
          >
            <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
              Current value
            </div>
            <div className="flex items-baseline gap-2.5 mt-1.5 flex-wrap">
              <div className="text-[26px] font-bold tracking-tight leading-none tnum">
                ₹{summary.totalValue.toLocaleString('en-IN')}
              </div>
              {summary.totalGain > 0 && (
                <div className="text-[13px] font-semibold tnum" style={{ color: '#16A34A' }}>
                  +₹{summary.totalGain.toLocaleString('en-IN')}
                </div>
              )}
            </div>
            <div className="h-px bg-[#F0F0F0] my-4" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] text-[#A3A3A3] uppercase tracking-wider font-medium">
                  Invested
                </div>
                <div className="text-[13px] font-semibold mt-1 tnum">
                  ₹{summary.totalInvested.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#A3A3A3] uppercase tracking-wider font-medium">
                  Bonds
                </div>
                <div className="text-[13px] font-semibold mt-1 tnum">{summary.count}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#A3A3A3] uppercase tracking-wider font-medium">
                  Avg yield
                </div>
                <div className="text-[13px] font-semibold mt-1 tnum">{summary.avgYtm}%</div>
              </div>
            </div>
          </button>
        </>
      )}

      {/* Why invest in bonds */}
      <div className="px-5 pt-6 pb-3 rise" style={{ animationDelay: '380ms' }}>
        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
          Why invest in bonds
        </div>
      </div>
      <div className="px-5 mb-2 rise" style={{ animationDelay: '420ms' }}>
        <div className="bg-white border border-[#EBEBEB] rounded-[16px] p-4">
          <FeatureRow
            icon={<TrendingUp className="w-4 h-4" strokeWidth={2} />}
            iconColor="#16A34A"
            iconBg="#DCFCE7"
            title="Higher returns than FDs"
            sub={
              maxYtm !== null
                ? `Active offers yield up to ${maxYtm}% — meaningfully above bank deposit rates.`
                : 'Active offers yield well above bank deposit rates today.'
            }
          />
          <Divider />
          <FeatureRow
            icon={<CalendarClock className="w-4 h-4" strokeWidth={2} />}
            iconColor="#0369A1"
            iconBg="#E0F2FE"
            title="Predictable payouts"
            sub="Receive periodic interest on a fixed schedule, not at the market's whim."
          />
          <Divider />
          <FeatureRow
            icon={<Layers className="w-4 h-4" strokeWidth={2} />}
            iconColor="#92400E"
            iconBg="#FEF3C7"
            title="Diversify beyond equity"
            sub="Fixed income lowers overall portfolio volatility while preserving real returns."
          />
          <Divider />
          <FeatureRow
            icon={<Shield className="w-4 h-4" strokeWidth={2} />}
            iconColor="#0A0A0A"
            iconBg="#F5F5F5"
            title="Listed on NSE & BSE"
            sub="Every bond is exchange-listed and regulated by SEBI — no over-the-counter pricing."
          />
        </div>
      </div>

      {/* Why trust us */}
      <div className="px-5 pt-4 pb-3 rise" style={{ animationDelay: '500ms' }}>
        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
          Why trust us
        </div>
      </div>
      <div className="px-5 mb-2 rise" style={{ animationDelay: '540ms' }}>
        <div className="bg-white border border-[#EBEBEB] rounded-[16px] p-4">
          <FeatureRow
            icon={<ShieldCheck className="w-4 h-4" strokeWidth={2} />}
            iconColor="#16A34A"
            iconBg="#DCFCE7"
            title="Settled directly with ICCL"
            sub="Funds and securities clear via Indian Clearing Corporation — never held by us."
          />
          <Divider />
          <FeatureRow
            icon={<BadgeCheck className="w-4 h-4" strokeWidth={2} />}
            iconColor="#0369A1"
            iconBg="#E0F2FE"
            title="SEBI Registered Debt Broker"
            sub="Operating under a SEBI-issued broker-dealer licence with audited compliance."
          />
          <Divider />
          <FeatureRow
            icon={<Award className="w-4 h-4" strokeWidth={2} />}
            iconColor="#92400E"
            iconBg="#FEF3C7"
            title="0 Defaults"
            sub="No default has occurred on any bond placed through our platform."
          />
          <Divider />
          <FeatureRow
            icon={<Sparkles className="w-4 h-4" strokeWidth={2} />}
            iconColor="#0A0A0A"
            iconBg="#F5F5F5"
            title="Curated Bonds"
            sub="Every issuer is vetted on credit quality, governance, and disclosure before we list."
          />
        </div>
      </div>

      <div className="flex-1" />

      <Footer />
    </div>
  );
}

function FeatureRow({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold tracking-tight">{title}</div>
        <div className="text-[12px] text-[#737373] mt-0.5 leading-[1.45]">{sub}</div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[#F0F0F0] my-1" />;
}
