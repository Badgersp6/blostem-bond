// Telemetry emitter. Production: the host app injects a sink via
// `Blostem.setTelemetrySink(fn)` (or whatever the SDK init API ends up being)
// to receive events. In dev / no-host mode we log to the console so events are
// visible while testing.
//
// Event names follow `bonds.<surface>.<verb>` convention so host analytics
// can group by funnel stage cleanly.

export type TelemetryEvent =
  // App lifecycle
  | 'bonds.module.opened'
  // Discovery
  | 'bonds.bond.viewed'
  | 'bonds.ipo.viewed'
  | 'bonds.list.viewed'
  // Invest / Apply
  | 'bonds.invest.opened'
  | 'bonds.invest.amount_changed'
  | 'bonds.invest.continued'
  | 'bonds.apply.opened'
  | 'bonds.apply.amount_changed'
  | 'bonds.apply.continued'
  // KYC funnel
  | 'bonds.kyc.started'
  | 'bonds.kyc.step_completed'
  | 'bonds.kyc.completed'
  // Order funnel
  | 'bonds.order.placed'
  | 'bonds.order.failed'
  | 'bonds.payment.success'
  | 'bonds.payment.failed';

export type TelemetryPayload = Record<string, string | number | boolean | undefined>;

type Sink = (event: TelemetryEvent, payload: TelemetryPayload, timestamp: number) => void;

let sinks: Sink[] = [];

export function setTelemetrySink(sink: Sink) {
  sinks = [sink];
}

export function addTelemetrySink(sink: Sink): () => void {
  sinks.push(sink);
  return () => {
    sinks = sinks.filter((s) => s !== sink);
  };
}

export function emit(event: TelemetryEvent, payload: TelemetryPayload = {}) {
  const ts = Date.now();
  if (sinks.length === 0) {
    // Dev visibility — strip in production by setting a sink that ignores
    // events we don't care about.
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[telemetry] ${event}`, payload);
    }
    return;
  }
  for (const s of sinks) {
    try {
      s(event, payload, ts);
    } catch {
      // never let a bad sink crash the host
    }
  }
}
