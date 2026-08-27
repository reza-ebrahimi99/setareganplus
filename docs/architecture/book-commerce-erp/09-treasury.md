# 09 — Treasury & Receivables

**Status:** v2  
**Flag:** `bookCommerce`  
**Reuse:** existing `PaymentIntent` / `PaymentSession` / `PaymentEventLog` when present — allocations sit **on top**, no second payment stack.

[Index](./README.md) · Previous: [Commission](./08-commission.md) · Next: [Reporting](./10-reporting.md)

---

## 1. Job of treasury

Turn “we took some money, maybe, on paper” into:

- Deposit (بیعانه) that cannot be forgotten
- Remaining balance that is always visible
- Installments with due dates
- Cash / POS / transfer / online / wallet
- Refunds that claw stock and commission correctly
- Outstanding receivables the manager can collect

---

## 2. Money identity

```text
Order.grandTotalRials
  − sum(PaymentAllocation where kind in DEPOSIT,BALANCE,INSTALLMENT,WALLET)
  + sum(REFUND allocations)
  = remainingRials
```

Invariant tested on every allocation TX. Stored on the order for lists (`remainingRials`, `paidRials`, `depositRials`, `balanceDueAt`).

Reuse PaymentIntent: each take (cash included) is an intent (`provider=manual` for desk, gateway when `bookCommerce.onlinePayment`). Allocation points at the order.

---

## 3. Deposit

Named allocation `kind=DEPOSIT`. Policies on AgencyProfile / campaign override:

| Policy | Default |
|--------|---------|
| Min % | 30 |
| Min amount | 0 |
| Firms reservation (stop TTL) | true |
| Due date | +7 days |
| Forfeit | refundable until issue |

**Ageing queue:** open deposits & remaining, by `balanceDueAt`, owner staff, customer mobile, reservation status. This queue is the product fix for forgotten بیعانه.

SMS: `BOOK_DEPOSIT_RECEIVED`, `BOOK_BALANCE_REMINDER` (worker, consent-aware).

---

## 4. Remaining balance

Always on the order header (danger color if > 0).  
Fulfillment blocked if remaining > 0 unless `books.orders.issue_unpaid` (audited).

Outstanding receivables report = sum of remaining on non-cancelled orders (AR).

---

## 5. Installment

`InstallmentPlan` on an order: n `Installment` rows (`dueAt`, `amountRials`, `status` DUE/PAID/OVERDUE/WAIVED).

Paying an installment creates PaymentIntent + allocation `INSTALLMENT`.  
Worker `books:installment-due-once` marks OVERDUE and optionally SMS / CRM task.

Cannot combine with “forgotten deposit” invisibility: dashboard shows next due date.

v1: equal split or manual amounts; no interest engine.

---

## 6. Tenders

| Method | Intent provider | Note |
|--------|-----------------|------|
| Cash | manual | Receipt print |
| POS / card | manual + last4 optional | |
| Transfer | manual + ref | |
| Online | existing session/callback | flagged |
| Wallet | not cash — see below | |

Receipt CommercialDocument for every successful take.

---

## 7. Wallet

Partner/customer wallets: ledger append-only.

v1 decision (carried from D5, still recommended): **wallet is not a mixed cash drawer.**

- Partner wallet: commission + bonus → payout
- Customer/student wallet: spend as **discount** (allocation kind WALLET that reduces remaining without being “cash in till”)

Do not commingle till cash reports with wallet.

---

## 8. Refund

Refund allocation + PaymentIntent REFUNDED. If goods back: Return Invoice first. Commission worker clawback. Partial refunds allowed.

---

## 9. Outstanding receivables

Read model: Party × remaining, ageing buckets (0–7, 8–30, 31+ Jalali days). Executive KPI “مانده معوق”.

Credit hold on CustomerProfile blocks new orders if remaining > threshold (optional).

---

## 10. Gift / donation money

Gift Invoice and Donation Invoice typically `grandTotalRials = 0` or token 1 Rial. They still **issue stock**. They must not inflate GMV unless AgencyProfile `countGiftsInGmv` (default false). Profit reports exclude them.

---

## 11. What treasury must not do

- Invent a second PaymentIntent product
- Accrue commission itself (emit event)
- Touch booking tuition payable types except additive enum if a new payable is unavoidable — prefer `COMMERCE_ORDER` / `BOOK_ORDER` with productLine in metadata ([13](./13-open-questions.md) Q2)
