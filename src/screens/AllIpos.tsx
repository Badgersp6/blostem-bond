import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
import IpoCard from '../components/IpoCard';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonCard } from '../components/Skeleton';
import { fetchIpos, type IpoIssuance } from '../api/ipos';

export default function AllIpos() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [issuances, setIssuances] = useState<IpoIssuance[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchIpos()
      .then((r) => {
        if (!cancelled) setIssuances(r.issuances);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load IPOs');
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  const retry = () => {
    setError(null);
    setIssuances(null);
    setRetryTick((n) => n + 1);
  };

  const visible = useMemo(() => {
    if (!issuances) return [];
    const q = query.trim().toLowerCase();
    if (!q) return issuances;
    return issuances.filter(
      (i) =>
        i.issuerName.toLowerCase().includes(q) ||
        i.issuerNameShort.toLowerCase().includes(q) ||
        i.securityId.toLowerCase().includes(q) ||
        i.rating.toLowerCase().includes(q),
    );
  }, [issuances, query]);

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
        <div className="text-[15px] font-semibold tracking-tight">NCD IPOs</div>
        <div className="w-9 h-9" />
      </div>

      <div className="px-5 pb-3 rise" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-2 bg-white border border-[#EBEBEB] rounded-[12px] px-3.5 h-11">
          <Search className="w-4 h-4 text-[#A3A3A3] shrink-0" strokeWidth={2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by issuer or rating"
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

      <div className="px-5 pb-2 flex justify-between items-baseline">
        <div className="text-[12px] font-semibold text-[#737373] uppercase tracking-wider">
          {issuances === null && !error
            ? 'Loading…'
            : `${visible.length} ${visible.length === 1 ? 'issuance' : 'issuances'}`}
        </div>
        <div className="text-[12px] text-[#A3A3A3]">Live · Primary issuance</div>
      </div>

      <div className="flex-1 px-5 pb-6 flex flex-col gap-2.5">
        {error && (
          <ErrorState title="Couldn't load IPOs" message={error} onRetry={retry} />
        )}

        {!error && issuances === null && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!error && issuances !== null && visible.length === 0 && (
          <EmptyState
            title={query ? 'No matches' : 'No IPOs are open'}
            message={
              query
                ? `Nothing matches "${query}". Try a different keyword.`
                : 'No NCD primary issuances are accepting applications right now. We update this list when a new issue opens.'
            }
            actionLabel={query ? 'Clear search' : undefined}
            onAction={query ? () => setQuery('') : undefined}
          />
        )}

        {!error &&
          visible.map((issuance, i) => (
            <div key={issuance.securityId} className="rise" style={{ animationDelay: `${80 + i * 30}ms` }}>
              <IpoCard issuance={issuance} />
            </div>
          ))}
      </div>

      <Footer />
    </div>
  );
}
