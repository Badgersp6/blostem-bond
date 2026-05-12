const palette: Record<string, { bg: string; text: string }> = {
  AAA: { bg: '#DCFCE7', text: '#16A34A' },
  'AA+': { bg: '#DCFCE7', text: '#16A34A' },
  AA: { bg: '#DCFCE7', text: '#16A34A' },
  'AA-': { bg: '#DCFCE7', text: '#16A34A' },
  'A+': { bg: '#DCFCE7', text: '#16A34A' },
  A: { bg: '#DCFCE7', text: '#16A34A' },
  'A-': { bg: '#FEF3C7', text: '#92400E' },
  'BBB+': { bg: '#FEF3C7', text: '#92400E' },
  BBB: { bg: '#FEF3C7', text: '#92400E' },
  'BBB-': { bg: '#FEE2E2', text: '#DC2626' },
  'BB+': { bg: '#FEE2E2', text: '#DC2626' },
  BB: { bg: '#FEE2E2', text: '#DC2626' },
  B: { bg: '#FEE2E2', text: '#DC2626' },
};

const NEUTRAL = { bg: '#F5F5F5', text: '#737373' };

export default function RatingChip({ rating }: { rating: string }) {
  const stripped = (rating || '').replace(/\s*\(.*?\)\s*$/, '').trim();
  const c = palette[stripped] || palette[rating] || NEUTRAL;
  return (
    <span
      className="px-2 py-[3px] rounded text-[12px] font-semibold tracking-tight"
      style={{ background: c.bg, color: c.text }}
    >
      {rating}
    </span>
  );
}
