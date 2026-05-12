import { useNavigate } from 'react-router-dom';
import RatingChip from './RatingChip';
import type { IpoIssuance } from '../api/ipos';

export default function IpoCard({ issuance }: { issuance: IpoIssuance }) {
  const navigate = useNavigate();
  const yieldRange =
    issuance.yieldMin === issuance.yieldMax
      ? `${issuance.yieldMin}%`
      : `${issuance.yieldMin}–${issuance.yieldMax}%`;
  const tenureRange =
    issuance.tenureMin === issuance.tenureMax
      ? issuance.tenureMin
      : `${issuance.tenureMin}–${issuance.tenureMax}`;

  return (
    <button
      onClick={() => navigate(`/ipos/${issuance.securityId}`)}
      className="w-full text-left bg-white border border-[#EBEBEB] rounded-[14px] p-4 active:scale-[0.99] transition"
    >
      <div className="flex items-start justify-between mb-3.5">
        <div className="min-w-0 pr-2">
          <div className="text-[15px] font-semibold tracking-tight truncate">{issuance.issuerNameShort}</div>
          <div className="text-[12px] text-[#A3A3A3] mt-0.5">
            {issuance.series.length} {issuance.series.length === 1 ? 'series' : 'series'} · {issuance.type}
          </div>
        </div>
        <RatingChip rating={issuance.rating} />
      </div>
      <div className="flex items-end gap-4 mb-3">
        <div>
          <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Yield</div>
          <div className="text-[22px] font-bold tracking-tight leading-none mt-1 tnum" style={{ color: '#16A34A' }}>
            {yieldRange}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Min</div>
          <div className="text-[14px] font-semibold mt-1 tnum">₹{issuance.minAmount.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Tenure</div>
          <div className="text-[14px] font-semibold mt-1">{tenureRange}</div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F0]">
        <div className="text-[12px] text-[#737373] truncate pr-2">
          {issuance.issueClose ? `Closes ${issuance.issueClose}` : 'Open for application'}
        </div>
        <div className="text-[13px] font-semibold whitespace-nowrap">View →</div>
      </div>
    </button>
  );
}
