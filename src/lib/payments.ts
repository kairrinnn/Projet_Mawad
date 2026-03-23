export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "OTHER"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Espèces",
  CARD: "Carte",
  TRANSFER: "Virement",
  OTHER: "Autre",
};

export function isCashPayment(method: PaymentMethod | null | undefined) {
  return method === "CASH";
}
