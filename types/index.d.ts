import type {
  Snap as MidtransSnap,
  SnapTransactionParameters,
} from "midtrans-client";
import type { Snap as DokuSnap } from "doku-nodejs-library";
import type { BasePayment, Transaction } from "../types/payment";

export interface ConfigProviderParams {
  client_id: string;
  secret_key: string;
  public_key?: string;
  is_production: boolean;
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
 * Standardized provider interface across Midtrans, DOKU, Xendit, etc.
 */
export interface ProviderInterface {
  /**
   * Initialize snap instance (Midtrans/DOKU) for frontend token or checkout URL
   */
  snap(): Promise<MidtransSnap | DokuSnap>;

  /**
   * Create a unified payment (invoice, checkout, or QR)
   */
  createPayment(data: any): Promise<BasePayment>;

  /**
   * Create a virtual account or equivalent VA-based payment method
   */
  createVirtualAccount(data: BasePayment): Promise<Transaction>;
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
}
