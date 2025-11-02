// types/payment.ts
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "cancelled";

export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "bank_transfer"
  | "ewallet"
  | "qris"
  | "retail"
  | "va"
  | "direct_debit"
  | "other";

export interface BasePayment {
  provider: string; // e.g. "midtrans", "xendit", "doku"
  referenceId?: string; // reference from provider
  orderId: string; // internal system reference
  amount: number; // total amount
  currency?: string; // default "IDR"
  method?: PaymentMethod; // method used for payment
  status: PaymentStatus; // unified payment state
  description?: string; // optional text
  customerEmail?: string;
  customerName?: string;
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  expiresAt?: string; // if available
  metadata?: Record<string, any>; // extra data (invoice_url, va_number, qr_url, etc)
}

// Represents a transaction history entry or event log
export interface Transaction {
  id: string;
  provider: string;
  paymentId: string; // link to payment
  type: "charge" | "refund" | "disbursement" | "settlement" | "reversal";
  status: PaymentStatus;
  amount: number;
  currency?: string;
  createdAt: string;
  rawResponse?: any; // optional: raw provider response for debugging
  metadata?: Record<string, any>;
}
