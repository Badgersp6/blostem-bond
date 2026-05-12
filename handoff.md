# Blostem Bonds SDK — Team Handoff

> **Living document** · all teams (Engineering, Product, Design, Ops, Compliance) update this file alongside material commits. See [How to use this doc](#how-to-use-this-doc).

**Repo:** https://github.com/Badgersp6/blostem-bond
**Default branch:** `main`
**Last updated:** 2026-05-08 · Initial team-handoff version

---

## How to use this doc

This is the single source of truth for **where the project is right now** and **what's coming next**. New team members read top-to-bottom to onboard; existing contributors check the sections relevant to their area before committing.

### When to update

Update this file as part of any commit that materially changes:

- A user-facing flow (new screen, removed screen, branching changes)
- An API contract (new endpoint, changed payload shape, deprecated field)
- The mock/real boundary (something switched from mock to live, or vice versa)
- The roadmap (item completed, new P0/P1 raised, scope changed)
- An open question that's now answered
- A failed attempt worth recording so we don't repeat it

Don't update for typo fixes, lint changes, small refactors, or non-substantive edits.

### What to update

For every qualifying commit, do **all three**:

1. **Bump `Last updated`** at the top
2. **Update the relevant body section** (Current state · Files in flight · Failed attempts · Next stage)
3. **Append a row to [Changelog](#changelog)** with date, area, and one-line summary

Edits live in the same commit as the code change — same PR, same review.

### Ownership

| Section | Owner |
| --- | --- |
| Current state / Files in flight | Engineering lead |
| Failed attempts | Whoever hit the wall |
| Next stage — P0 (real backend) | Engineering + Product |
| Next stage — P1 (drop-offs) | Product |
| Next stage — P2 (polish) | Design + Engineering |
| Open questions | Anyone — surface them, leadership resolves |
| Changelog | Author of each commit |

---

## Quick start

```bash
git clone https://github.com/Badgersp6/blostem-bond.git
cd blostem-bond
npm install

# Create .env.local (gitignored, partner secret never reaches the browser)
echo "API_TOKEN=<partner-bearer-token>" > .env.local
echo "SECRET_KEY=<partner-secret-key>" >> .env.local

npm run dev      # http://localhost:5173
npm run build    # production bundle to /dist
```

The dev proxy in `vite.config.ts` injects `API_TOKEN` (and `SECRET_KEY` on the auth proxies) so the client never sees the partner credentials.

### Testing the full journey

`profileMock.kycStatus` defaults to `'pending'` so first-time flow forces KYC.

To start fresh: DevTools → Application → Storage → Clear site data, then:

1. http://localhost:5173 → "TEST · Sample Capital" at top of Top Opportunities
2. Tap → BondDetails (exercises every section: stat card, Cashflow, Bond info, About the Company, Credit Health, Disclosures)
3. Invest now → lot stepper → Continue
4. Checkout dealsheet → **Complete KYC to invest**
5. Walk all 12 KYC steps (~3 min with click-throughs)
6. Back on Checkout → **Invest · ₹10,000**
7. Payment dealsheet → Pay ₹10,000
8. OrderStatus timeline auto-progresses through 6 stages (~5s)
9. Back to `/` → Pending Orders & Portfolio sections appear above marketing blocks
10. `/portfolio` → KPI hero, repayments chart (3 past grey + 12 future), holdings list
11. Tap a holding → HoldingSheet → Sell → confirm → success state

### Toggles for branch testing

Flip these in `src/sdk-init.ts` then clear sessionStorage:

| Toggle | Effect |
| --- | --- |
| `kycStatus: 'done'` | Skips KYC; Checkout reads "Invest · ₹X" |
| `kraValidated: false` | KYC routes through Digilocker (no-KRA branch) |
| `kraContactMatch: false` (with `kraValidated: true`) | KYC goes via form-mode esign |
| `bankFromPartner: false` | KYC bank step forces UPI fallback |
| `bankNameMatchPercent: 45` | KYC bank requires name-match declaration |
| `panFetchedFromPhone: false` | KYC forces manual PAN input |

---

## What this project is

A B2B2C SDK that drops into a partner fintech (PhonePe / CRED / Kotak / etc.) and exposes:

- **Secondary bonds** (GSec, SGB, corporate) — browse, invest, settle to demat
- **NCD IPO primaries** — browse, apply via ASBA
- **End-to-end journey** — discover → invest → KYC (one-time, multi-step) → place order → payment gateway → portfolio with sell flow

Mobile-first React + Vite + TypeScript + Tailwind. Lives entirely inside the partner's authenticated context — the partner injects user identity; the SDK never re-auths against an external API.

Integrates with TheFixedIncome (Tipsons) APIs.

---

## Architecture map

```
src/
├── AuthGate.tsx              brief brand shimmer → resolves session from partner config
├── App.tsx                   Routes
├── main.tsx + index.css      Entry + design tokens (incl. shimmer/pulse animations)
├── sdk-init.ts               Partner-supplied user payload + profile mock + KYC toggles
├── checkout.ts               In-memory checkout state (set on Continue, read on Place Order)
├── kyc-progress.ts           In-memory KYC store (cleared on Done)
├── telemetry.ts              emit(event, payload?) → no-op default; host can inject callback
├── data.ts                   Legacy mock bonds (fallback for BondDetails when ISIN not in API)
├── api/
│   ├── auth.ts               Synchronous SSO + sessionStorage cache
│   ├── bonds.ts              /api/offers/<category> (gsec/bond-secondary/sgb) + test bond
│   ├── ipos.ts               /api/primary — grouped by issuance, top-3 series per issuance
│   ├── kyc.ts                Mock ITD / KRA / Digilocker / e-sign / Demat + ensureKycComplete
│   └── orders.ts             Mock place-order/-application + webhook simulator + portfolio helpers
├── hooks/
│   └── useDialogA11y.ts      Focus trap + ESC + body lock + restore focus on close
├── components/               Footer, RatingChip, BondCard, IpoCard, AccordionSection,
│                              EmptyState, ErrorState, Skeleton, InvestSheet, ApplySheet,
│                              PayoutSheet, RepaymentsSheet, HoldingSheet, KycLayout
├── screens/                  Discover, AllBonds, AllIpos, BondDetails, IpoDetails,
│                              Checkout, Payment, OrderStatus, OrdersList, Portfolio,
│                              Profile, PlacingOrder, KycRequired, Authenticating
└── screens/kyc/              PanFetch, PanInput, PanVerify, Bank, KraFetch, Selfie,
                              WetSign, Personal, Digilocker, Esign, Demat, Done
```

**Vite proxies** (in `vite.config.ts`) — `/api/offers/<cat>` → `/api/wl/offers/<cat>`, `/api/primary` → `/api/wl/primaryOffers`. Server-side header injection (Bearer + Secret-Key) so secrets never reach the browser bundle.

---

## Current state

### Live against real APIs

- **`/api/offers/<category>`** — gsec / bond-secondary / sgb. `?length=200` captures every item in one shot. Cached client-side.
- **`/api/primary`** — primaryOffers (NCD IPOs). Grouped by `security_id` into issuances; top 3 series per issuance shown (by coupon DESC, effective yield as tiebreaker).
- **Cashflow** — extracted from `product.cashflow.details`, scaled by `minInvest / 100` because the API quotes in rupees per ₹100 of face value.
- **Payout classification** — `IP` / `Principal` / `IP + Principal` derived from `interest_topay` magnitude thresholds.
- **Rating rationale URLs** harvested from `product_rating[].rationale_url` per agency.

### Mocked end-to-end (production-shaped)

- **SSO** — synchronous from `partnerUser` + `profileMock`. ~1.2s brand shimmer in AuthGate. No remote auth call.
- **KYC** — 12-step flow with branching (KRA-validated / contact-mismatch / no-KRA-via-Digilocker). `ensureKycCompleteForEsign` populator guarantees Esign summary is never empty.
- **Place Order / Place Application** — builds documented payload, returns synth order numbers (`BSC-YYMMDD-XXXX` / `NCD-YYMMDD-XXXX`), snapshots dealsheet fields on the OrderRecord.
- **Payment gateway** — dealsheet UI with `Pay ₹X` + 5 failure-reason simulators (`GATEWAY_TIMEOUT` / `INSUFFICIENT_FUNDS` / `UPI_NOT_INSTALLED` / `BANK_DOWN` / `USER_CANCELLED`).
- **Order webhook events** — bond timeline: `ORDER.PLACED` → `PAYMENT.SUCCESS` → `FUND.DEBITED` → `FUND.DEBITCONFIRMED` → `DEAL.SETTLED` → `SECURITY.CREDITED`. IPO timeline: `APPLICATION.SUBMITTED` → `PAYMENT.SUCCESS` → `FUND.BLOCKED` → `ALLOTMENT.DONE` → `SECURITY.CREDITED`. Simulated via timed `setTimeout`s.
- **Portfolio** — derived from the orders store. Holdings = orders with `paymentStatus === 'SUCCESS'` and `SECURITY.CREDITED` event.
- **Sell flow** — `placeSellRequest(orderNo)` (mock) generates a `SELL-…` request; user notified Ops will contact within 24h.

### Polished

- **Empty states** — every list screen (filter-aware on AllBonds; first-time-user state on Portfolio).
- **Error retry** — `<ErrorState onRetry>` on AllBonds, AllIpos, BondDetails, IpoDetails, Discover-IPO section, PlacingOrder.
- **Payment failure → OrderStatus** — reason-specific copy (title, message, primary CTA) + universal "Cancel order" secondary that removes the order from history.
- **Accessibility** — `useDialogA11y(open, onClose)` hook handles focus trap + ESC + body-scroll lock + restore-focus-on-close. Applied to InvestSheet, ApplySheet, PayoutSheet, RepaymentsSheet, HoldingSheet, Demat-help sheet. `role="dialog"` + `aria-modal` + `aria-labelledby` set on each.
- **Telemetry** — `emit(event, payload?)` no-op default; host can inject a callback. Currently emitted at: `bonds.kyc.started`, `bonds.kyc.completed`, `bonds.invest.opened`, `bonds.invest.continued`, `bonds.apply.opened`, `bonds.apply.continued`, `bonds.payment.success`, `bonds.payment.failed`.
- **Dealsheet** — formal contract-style review on `/payment/<orderNo>` with deal info / security / trade breakdown / settlement / counterparties.
- **Test ISIN** — `TEST-INE000000099` (TEST · Sample Capital, 13.99% YTM, ₹10K min, AA+ CRISIL, monthly payouts) injected at top of `fetchBonds()`. Exercises every BondDetails feature including financials, all 6 document types, rating change note.

---

## Files in flight

- **Skeleton sweep** — `<SkeletonCard>` + `<SkeletonDetail>` exist in `src/components/Skeleton.tsx`. Applied to AllBonds and AllIpos loading states. **Still to apply**: BondDetails (use SkeletonDetail), IpoDetails (use SkeletonDetail), Discover top-opportunities while bonds load, PlacingOrder, KYC PanFetch / KraFetch loaders (these are ephemeral routes — debatable whether shimmer or spinner is better).
- **Telemetry coverage** — emit calls land in the highest-traffic paths but are missing in places that'd be useful for a launch dashboard: `bonds.module.opened` (AuthGate mount), `bonds.bond.viewed` (BondDetails mount), `bonds.ipo.viewed` (IpoDetails mount), `bonds.order.placed` (PlacingOrder after success), `bonds.kyc.step_completed` (each KYC step Continue). No-op default means adding these is cosmetic, not functional yet.

---

## Failed attempts

Institutional memory — don't repeat these.

1. **Auth APIs `/api/get-token` + `/api/get-individual-client-link`** — returned 500 for every server-to-server request despite the partner Bearer token. Confirmed via Node fetch (different HTTP stack from Windows curl) across 4 header variants. Rate-limit headers decremented, so requests did reach the server. Diagnosed via comparison with a working curl pulled from the user's browser DevTools: the working request carried Laravel session cookies (`the_fixed_income_session`, `XSRF-TOKEN`) from being logged into the TheFixedIncome dashboard. The endpoint is gated by browser session state, not a server-to-server contract. **Abandoned** — switched to synchronous SSO from the partner-provided user payload, which is the right pattern for an SDK anyway.
2. **Cashflow shape assumption** — initially modeled `cashflow` as a JSON array (`cashflow[0].details`), causing all payout schedules to be empty. PowerShell `ConvertFrom-Json` displayed single-element arrays and wrapped objects identically, masking the bug. Real shape is a JSON object (`cashflow.details`). Fix supported both shapes for forward compatibility.
3. **Cashflow value scaling** — initial implementation rendered `interest_topay` directly, producing absurd ₹0.83 / ₹3.18 figures across every bond. API quotes per ₹100 face, so values need scaling by `minInvest / 100`. Without it, UGRO showed ₹0.83 instead of the correct ₹828.08 per ₹1L lot.
4. **Payout kind classification** — first implementation derived principal portion via `interest_topay - interest`. API returns identical values on the maturity row (both = 100 + coupon), so subtraction always yielded 0. All rows misclassified as IP-only. Reworked to classify by `interest_topay` magnitude: `≤50` → IP, `>100.5` → IP+Principal, `50 < x ≤ 100.5` → Principal-only.
5. **Face-value subtext** — initial designs surfaced "X units of ₹Y", "X NCDs of ₹Y", "₹99.65 / ₹100 face" subtext for transparency. Product flagged as confusing for retail. Stripped face-value references across stat cards, sheets, Checkout, and the BondDetails sticky strip.
6. **Pagination dropping items** — `/api/offers/bond-secondary` returned 12 of 14 by default. Probed pagination params (`?page=`, `?length=`, `?offset=`, `?limit=`). `?length=N` is the right knob. Using `?length=200` until categories grow past that.

---

## Next stage

### P0 — Real backend wiring (gates go-live)

- **Place Order API** — `placeBondOrder` / `placeIpoApplication` in `src/api/orders.ts`. Payload shape documented + tested. Swap `await new Promise(setTimeout)` for the real `fetch('/api/wl/orders', {...})`.
- **Payment gateway** — wire UPI / Netbanking / TPV. Currently fakes via `setTimeout` then transitions through staged webhook events. Real impl: redirect to PG → return-URL hits a webhook receiver → push state into the orders store.
- **Order webhooks** — `setPaymentStatus` + `appendEvent` + `simulatePostPaymentEvents` need to be replaced by a real socket / polling receiver. Event names already match the documented webhook payload.
- **Real KYC APIs** — every step in `src/api/kyc.ts` is a mock. Real services: ITD (PAN), KRA (existing KYC), Digilocker (PAN + Aadhaar XML), partner SDK (selfie liveness), CDSL/NSDL (demat verify), NSDL/CDSL e-sign.
- **Real portfolio API** — currently derived from local orders Map. Real impl: `GET /api/wl/portfolio` → holdings + cashflow events. Snapshot fields on `OrderRecord` tell you what shape the row carries.
- **Auth lifecycle** — current `.env.local` token is a partner master Bearer. Production needs token issuance + 401 refresh + rotation hook. Currently the Vite dev proxy injects it; production needs a real backend that owns the secret.

### P1 — Drop-offs

- **Real payment failure UX** — 5 simulated reasons each have copy + secondary action; wire to actual PG response codes.
- **KYC pending → partner handoff** — `/kyc-required` and the Profile-page handoff CTA are placeholder. Partner needs to deep-link back to the SDK with `kycStatus=done` once external KYC completes.
- **Quote expiry** — partner refreshes 2× daily; stale-quote is mostly fine, but if a user sits on InvestSheet past `quote_validity_time` the accrued value drifts. Could lock CTA or auto-refresh.

### P2 — Polish

- Skeleton sweep finish (see [Files in flight](#files-in-flight)).
- Full telemetry coverage (see [Files in flight](#files-in-flight)).
- A11y — verify focus restoration on every sheet close; audit ARIA labels on icon-only buttons; axe-core sweep.
- Test ISIN — `TEST-INE000000099` is currently prepended to every `fetchBonds()`. Gate behind a `DEV_TEST_BOND` env var or strip from production builds.
- Discover hero — hardcoded copy ("Fixed Income" eyebrow, "trade-grade bond inventory" subtitle) reads fine but is static. Yield value is real.
- Pagination UI — Load More button on AllBonds / AllIpos for when a category grows past `?length=200`.

### Open questions

| Question | Owner | Status |
| --- | --- | --- |
| Real partner auth contract — what does the partner pass at SDK init? | Eng + Partner | Open |
| Bank account + demat sourcing — partner SDK init payload or separate profile API? | Eng + Product | Open — using partner-config defaults for prototype |
| `userId` issuance — partner-supplied or from a registration call we don't have? | Eng + Backend | Open |
| Production secret-key rotation cadence | Security | Open |
| i18n requirements (Hindi / regional) | Product | Open |

---

## Changelog

Newest at top. Format: `YYYY-MM-DD · area · author · summary`. One line per material change. Link the commit hash where helpful.

| Date | Area | Author | Summary |
| --- | --- | --- | --- |
| 2026-05-08 | Handoff doc | Eng | Initial team-handoff version with update convention + changelog format (`e92dedb`) |
| 2026-05-08 | Portfolio | Eng | Repayments chart now spans 15 months — 3 past grey + 12 upcoming green/blue |
| 2026-05-08 | Profile | Eng | Reset session affordance — clears auth + KYC + checkout + reloads |
| 2026-05-08 | Portfolio | Eng | Holdings tap → HoldingSheet with Sell flow → mock place-sell-request → "Ops contact" copy |
| 2026-05-08 | Portfolio | Eng | Repayments section + RepaymentsSheet (tabular monthly breakdown) |
| 2026-05-08 | OrderStatus | Eng | Refresh status + View Portfolio actions on in-progress orders |
| 2026-05-08 | Payment | Eng | Rewritten as formal dealsheet (deal info / security / trade breakdown / settlement / counterparties) |
| 2026-05-08 | OrderStatus | Eng | Cancel order on every failed state — `removeOrder` drops record from history |
| 2026-05-08 | Profile | Eng | Lean Profile entry on Discover with KYC-pending nudge dot |
| 2026-05-08 | Checkout | Eng | Removed async KYC check from Continue — synchronous from `session.kycStatus`; conditional CTA |
| 2026-05-08 | BondDetails | Eng | Test ISIN injected at top of fetchBonds; About-the-Company + Disclosures sections updated |
| 2026-05-08 | Discover | Eng | Top filter chips functional with URL params; live hero from max-yield; trust + marketing blocks |
| 2026-05-07 | KYC | Eng | Full 12-step KYC flow with branching (KRA / no-KRA / contact-mismatch) and Esign always-complete populator |
| 2026-05-07 | Orders | Eng | Multi-category fetch (gsec / bond-secondary / sgb) + IPO listing + lot/NCD steppers |

### Adding a row

```markdown
| YYYY-MM-DD | <area> | <author or team> | <one-line summary> (`<short-sha>` if relevant) |
```

Areas commonly referenced: `Discover`, `AllBonds`, `BondDetails`, `IpoDetails`, `InvestSheet`, `ApplySheet`, `Checkout`, `Payment`, `OrderStatus`, `Portfolio`, `Profile`, `KYC`, `Orders`, `Auth`, `Telemetry`, `A11y`, `Skeletons`, `Build/Deploy`, `Handoff doc`.

---

## Glossary

For non-engineers — bond-domain terms used throughout.

- **GSec** — Government Security; sovereign bond. Lowest-credit-risk fixed income.
- **SGB** — Sovereign Gold Bond; gold-linked bond issued by RBI.
- **NCD** — Non-Convertible Debenture; corporate fixed-income instrument.
- **NCD IPO** — A new issuance of NCDs (primary market) before they list on exchanges.
- **ASBA** — Application Supported by Blocked Amount. Funds are blocked in the user's bank during an IPO and only debited if allotment happens.
- **YTM** — Yield to Maturity. Total annualised return assuming the bond is held until maturity.
- **Coupon** — The periodic interest payment a bond pays (monthly/quarterly/etc.).
- **Cumulative** — A bond that pays no interim coupon — all interest is paid back with principal at maturity.
- **Face value** — The nominal value of the bond (typically ₹100 or ₹1000 per unit). Distinct from the price (what you pay).
- **Accrued interest** — Interest earned by the seller since the last coupon, paid by the buyer at settlement.
- **NTV** — Net Traded Value = principal + accrued interest. The total cash a user pays on a trade.
- **T+0 / T+1** — Settlement timing. T+1 = trade settles the next business day.
- **ICCL** — Indian Clearing Corporation Limited. Clears trades on BSE.
- **NSCCL** — National Securities Clearing Corporation Limited. Clears trades on NSE.
- **CDSL / NSDL** — The two Indian depositories. Hold demat (dematerialised) securities.
- **KRA** — KYC Registration Agency. Central repository for SEBI-registered KYC records.
- **Demat / BO ID** — 16-digit unique ID identifying the user's depository account.
- **DP ID** — Depository Participant ID. First 8 digits of the demat ID.
- **PEP** — Politically Exposed Person. Regulatory category requiring extra screening.
- **TPV** — Third-Party Verification of the bank account (penny-drop, etc.).
- **PG** — Payment Gateway.
- **Dealsheet** — Formal trade confirmation showing all terms of a bond purchase.
