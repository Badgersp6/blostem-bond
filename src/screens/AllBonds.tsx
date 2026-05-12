import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
import BondCard from '../components/BondCard';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonCard } from '../components/Skeleton';
import { fetchBonds, type ApiBond } from '../api/bonds';

type FilterKey =
  | 'all'
  | 'gsec'
  | 'bond-secondary'
  | 'sgb'
  | 'highYield'
  | 'min10k'
  | 'highYield10'
  | 'monthly';

const filterDefs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gsec', label: 'GSec' },
  { key: 'bond-secondary', label: 'Bonds' },
  { key: 'sgb', label: 'SGB' },
  { key: 'min10k', label: 'Invest at ₹10K' },
  { key: 'highYield10', label: 'Yield > 10%' },
  { key: 'monthly', label: 'Monthly payout' },
];

function applyFilter(b: ApiBond, f: FilterKey) {
  if (f === 'all') return true;
  if (f === 'highYield') return b.ytm >= 8;
  if (f === 'highYield10') return b.ytm > 10;
  if (f === 'min10k') return b.minInvest <= 10000;
  if (f === 'monthly') return b.couponFreq.toLowerCase() === 'monthly';
  return b.category === f;
}

const ALLOWED_FILTERS: FilterKey[] = [
  'all',
  'gsec',
  'bond-secondary',
  'sgb',
  'highYield',
  'min10k',
  'highYield10',
  'monthly',
];

function emptyState(filter: FilterKey, query: string): { title: string; message: string } {
  if (query) {
    return {
      title: 'No matches',
      message: `Nothing matches "${query}". Try a different keyword or clear the search.`,
    };
  }
  if (filter === 'sgb') {
    return {
      title: 'No SGB issuances active',
      message: 'Sovereign Gold Bonds are not currently open. Check back when the next tranche opens.',
    };
  }
  if (filter === 'gsec') {
    return {
      title: 'No GSec offers right now',
      message: 'No government securities are open for purchase at the moment.',
    };
  }
  if (filter === 'bond-secondary') {
    return {
      title: 'No corporate bonds right now',
      message: 'No secondary-market corporate bonds are listed at the moment.',
    };
  }
  if (filter === 'highYield') {
    return {
      title: 'Nothing above 8% today',
      message: 'No bonds yielding ≥8% are currently listed. Try All to see what is open.',
    };
  }
  if (filter === 'highYield10') {
    return {
      title: 'Nothing above 10% today',
      message: 'No bonds yielding above 10% are currently listed. Try All or Yield ≥ 8%.',
    };
  }
  if (filter === 'min10k') {
    return {
      title: 'No bonds at ₹10K right now',
      message: 'No bonds with a ₹10,000 minimum are open at the moment. Most current offers have higher minimums.',
    };
  }
  if (filter === 'monthly') {
    return {
      title: 'No monthly-payout bonds',
      message: 'No bonds with monthly coupons are listed right now. Try All to see other payout frequencies.',
    };
  }
  return {
    title: 'No bonds available',
    message: 'Inventory is empty right now. Check back shortly.',
  };
}

export default function AllBonds() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>(() => {
    const fromUrl = searchParams.get('filter') as FilterKey | null;
    return fromUrl && ALLOWED_FILTERS.includes(fromUrl) ? fromUrl : 'all';
  });
  const [bonds, setBonds] = useState<ApiBond[] | null>(null);

  // Keep URL ↔ state in sync when the user picks a chip
  const updateFilter = (f: FilterKey) => {
    setFilter(f);
    if (f === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', f);
    }
    setSearchParams(searchParams, { replace: true });
  };
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchBonds()
      .then((r) => {
        if (!cancelled) setBonds(r.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load bonds');
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  const retry = () => {
    setError(null);
    setBonds(null);
    setRetryTick((n) => n + 1);
  };

  const visible = useMemo(() => {
    if (!bonds) return [];
    const q = query.trim().toLowerCase();
    return bonds.filter((b) => {
      if (!applyFilter(b, filter)) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.isin.toLowerCase().includes(q) ||
        (b.rating ?? '').toLowerCase().includes(q) ||
        (b.fullName ?? '').toLowerCase().includes(q)
      );
    });
  }, [query, filter, bonds]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-3.5">
        <button
          onClick={() => navigate('/')}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#EBEBEB] active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <div className="text-[15px] font-semibold tracking-tight">All bonds</div>
        <div className="w-9 h-9" />
      </div>

      <div className="px-5 pb-3 rise" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-2 bg-white border border-[#EBEBEB] rounded-[12px] px-3.5 h-11">
          <Search className="w-4 h-4 text-[#A3A3A3] shrink-0" strokeWidth={2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ISIN, or rating"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-[#A3A3A3] tnum"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="w-6 h-6 flex items-center justify-center rounded-full bg-[#F5F5F5] active:scale-95 transition"
            >
              <X className="w-3 h-3 text-[#737373]" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div
        className="px-5 pb-4 flex gap-2 overflow-x-auto no-scrollbar rise"
        style={{ animationDelay: '40ms' }}
      >
        {filterDefs.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => updateFilter(f.key)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-medium whitespace-nowrap transition ${
                active
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white border border-[#EBEBEB] text-[#0A0A0A]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="px-5 pb-2 flex justify-between items-baseline">
        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
          {bonds === null && !error
            ? 'Loading…'
            : `${visible.length} ${visible.length === 1 ? 'bond' : 'bonds'}`}
        </div>
        <div className="text-[12px] text-[#A3A3A3]">Live · GSec · Bonds · SGB</div>
      </div>

      <div className="flex-1 px-5 pb-6 flex flex-col gap-2.5">
        {error && (
          <ErrorState title="Couldn't load bonds" message={error} onRetry={retry} />
        )}

        {!error && bonds === null && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!error && bonds !== null && visible.length === 0 && (
          <EmptyState
            title={emptyState(filter, query).title}
            message={emptyState(filter, query).message}
            actionLabel={query ? 'Clear search' : filter !== 'all' ? 'Show all bonds' : undefined}
            onAction={
              query
                ? () => setQuery('')
                : filter !== 'all'
                  ? () => updateFilter('all')
                  : undefined
            }
          />
        )}

        {!error &&
          visible.map((b, i) => (
            <div key={b.isin} className="rise" style={{ animationDelay: `${80 + i * 30}ms` }}>
              <BondCard bond={b} />
            </div>
          ))}
      </div>

      <Footer />
    </div>
  );
}
