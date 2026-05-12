// Shimmer-bar skeleton primitives. The .shimmer-bar class is defined in
// index.css and respects prefers-reduced-motion automatically.

export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`shimmer-bar rounded ${className}`} style={style} />;
}

// Mimics a BondCard / IpoCard shape so loading and loaded states share layout.
export function SkeletonCard() {
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-4">
      <div className="flex items-start justify-between mb-3.5">
        <div className="flex-1 min-w-0 pr-3">
          <Skeleton className="h-3.5 w-2/3 mb-2" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
      <div className="flex items-end gap-4 mb-3">
        <div>
          <Skeleton className="h-2 w-10 mb-2" />
          <Skeleton className="h-6 w-14" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-2 w-8 mb-2" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <div>
          <Skeleton className="h-2 w-10 mb-2" />
          <Skeleton className="h-3.5 w-12" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F0]">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div>
      {/* Issuer block */}
      <div className="flex items-start gap-3.5 mb-4">
        <Skeleton className="rounded-[14px]" style={{ width: 52, height: 52 }} />
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-10 rounded-md" />
          </div>
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      {/* Stat card */}
      <div className="bg-white border border-[#EBEBEB] rounded-[16px] p-[18px] mb-3.5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-2 w-16 mb-2" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div>
            <Skeleton className="h-2 w-14 mb-2" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-2.5 w-20 mt-1.5" />
          </div>
        </div>
        <div className="h-px bg-[#F0F0F0] my-4" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-2 w-20 mb-2" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div>
            <Skeleton className="h-2 w-14 mb-2" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-2.5 w-16 mt-1.5" />
          </div>
        </div>
      </div>
      {/* Two collapsed accordions */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className="bg-white border border-[#EBEBEB] rounded-[16px] p-[18px] mb-2.5 flex items-center justify-between"
        >
          <div className="flex-1">
            <Skeleton className="h-3.5 w-1/3 mb-2" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      ))}
    </div>
  );
}
