import type { BasePayment, Transaction } from "./payment";

export interface ConfigProviderParams {
  client_id: string;
  secret_key: string;
  public_key?: string;
  is_production: boolean;
  [key: string]: any; // Allow provider-specific config
}

export interface BaseProviderInterface {
  config: ConfigProviderParams;

  /**
   * Generate provider-specific signature for request validation or webhook verification
   */
  generateSignature(data: Record<string, unknown>): string;

  /**
   * Logging utility for debugging or audit
   */
  log(message: string, context?: Record<string, unknown>): void;
}

/**
 * Generic payment data interface that can be extended by providers
 */
export interface PaymentData {
  orderId: string;
  amount: number;
  currency?: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  [key: string]: any; // Allow provider-specific fields
}

/**
 * Generic virtual account data interface
 */
export interface VirtualAccountData extends PaymentData {
  bankCode?: string;
  vaNumber?: string;
  expiresAt?: string;
  [key: string]: any; // Allow provider-specific fields
}

/**
 * Standardized provider interface across all payment providers
 */
export interface ProviderInterface {
  /**
   * Get provider-specific client instance
   */
  getClient(): Promise<any>;

  /**
   * Create a unified payment (invoice, checkout, or QR)
   */
  createPayment(data: PaymentData): Promise<BasePayment>;

  /**
   * Create a virtual account or equivalent VA-based payment method
   */
  createVirtualAccount(data: VirtualAccountData): Promise<Transaction>;

  /**
   * Get payment status by provider reference
   */
  getPaymentStatus?(referenceId: string): Promise<BasePayment>;

  /**
   * Cancel a payment
   */
  cancelPayment?(referenceId: string): Promise<BasePayment>;
}

/**
 * Unified payment gateway interface that wraps all providers
 */
export interface UnipayInterface extends ProviderInterface {
  /**
   * Generic runtime options, e.g. environment config or request overrides
   */
  options: Record<string, unknown>;

  /**
   * Inject a provider instance (Midtrans, DOKU, Xendit)
   */
  setProvider(provider: ProviderInterface): void;

  /**
   * Get current provider instance
   */
  getProvider(): ProviderInterface | null;
}
