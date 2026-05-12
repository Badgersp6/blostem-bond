import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import KycLayout from '../../components/KycLayout';
import { submitSignature } from '../../api/kyc';
import { patchKyc } from '../../kyc-progress';

export default function KycWetSign() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasInk, setHasInk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas backing-store size for crisp drawing on hi-DPI screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#0A0A0A';
  }, []);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawingRef.current = true;
    lastRef.current = pointFromEvent(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastRef.current) return;
    const p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    if (!hasInk) setHasInk(true);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const submit = async () => {
    if (!hasInk || submitting) return;
    setSubmitting(true);
    const dataUrl = canvasRef.current?.toDataURL('image/png') ?? '';
    await submitSignature(dataUrl);
    patchKyc({ signatureDataUrl: dataUrl });
    navigate('/kyc/personal', { replace: true });
  };

  return (
    <KycLayout
      step={4}
      title="Sign here"
      subtitle="Use your finger or a stylus to sign within the box. This signature is appended to your KYC form."
      cta
      ctaLabel="Submit signature"
      ctaDisabled={!hasInk}
      ctaLoading={submitting}
      onCta={submit}
    >
      <div className="bg-white border border-[#EBEBEB] rounded-[14px] p-3 mb-3">
        <div
          className="w-full rounded-[10px] relative"
          style={{ background: '#F5F5F5', height: 240 }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="absolute inset-0 w-full h-full touch-none"
            style={{ cursor: 'crosshair' }}
          />
          {!hasInk && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-[11px] text-[#A3A3A3] uppercase tracking-wider font-medium">
                sign within the box
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={clear}
            disabled={!hasInk}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#737373] disabled:opacity-40 active:opacity-60 transition"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={2.25} />
            Clear
          </button>
        </div>
      </div>

      <div className="text-[11px] text-[#A3A3A3] leading-[1.45]">
        Your signature will be cryptographically bound to the KYC form via SEBI-approved e-signature.
      </div>
    </KycLayout>
  );
}
