import { useNavigate } from 'react-router-dom';
import RatingChip from './RatingChip';

export default function BondCard({ bond }: { bond: any }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/bonds/${bond.isin}`)}
      className="w-full text-left bg-white border border-[#EBEBEB] rounded-[14px] p-4 active:scale-[0.99] transition"
    >
      <div className="flex items-start justify-between mb-3.5">
        <div>
          <div className="text-[15px] font-semibold tracking-tight">{bond.name}</div>
          <div className="text-[12px] text-[#A3A3A3] mt-0.5">
            {bond.isin} · {bond.type}
          </div>
        </div>
        <RatingChip rating={bond.rating} />
      </div>
      <div className="flex items-end gap-4 mb-3">
        <div>
          <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Yield</div>
          <div className="text-[22px] font-bold tracking-tight leading-none mt-1 tnum" style={{ color: '#16A34A' }}>
            {bond.ytm}%
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Min</div>
          <div className="text-[14px] font-semibold mt-1 tnum">₹{bond.minInvest.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div className="text-[12px] text-[#A3A3A3] uppercase tracking-wider font-medium">Matures</div>
          <div className="text-[14px] font-semibold mt-1">{bond.maturityShort}</div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F0]">
        <div className="text-[12px] text-[#737373]">
          {bond.couponFreq || 'Monthly'} · {bond.tenureMonths} mo tenure
        </div>
        <div className="text-[13px] font-semibold">Invest →</div>
      </div>
    </button>
  );
}
