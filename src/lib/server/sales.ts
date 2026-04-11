import type { PaymentMethod } from "@/lib/payments";
import { isCashPayment } from "@/lib/payments";

export function createTicketNumber(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TKT-${stamp}-${suffix}`;
}

export function getCashHandling(
  paymentMethod: PaymentMethod,
  cashReceived: number | null | undefined,
  totalAmount: number
) {
  if (!isCashPayment(paymentMethod)) {
    return {
      normalizedCashReceived: null,
      changeGiven: 0,
    };
  }

  const normalizedCashReceived = cashReceived ?? null;
  const changeGiven =
    normalizedCashReceived !== null && normalizedCashReceived >= totalAmount
      ? normalizedCashReceived - totalAmount
      : 0;

  return {
    normalizedCashReceived,
    changeGiven,
  };
}
