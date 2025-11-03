import type { BaseProviderInterface, ConfigProviderParams } from "../types";
import type { BasePayment, Transaction } from "../types/payment";

export default class BaseProvider implements BaseProviderInterface {
  config: ConfigProviderParams;
  protected _client?: any;

  constructor(config: ConfigProviderParams) {
    this.config = config;
  }

  /**
   * Initialize provider-specific client
   * Should be implemented by each provider
   */
  protected async initializeClient(): Promise<any> {
    throw new Error("initializeClient() must be implemented by provider");
  }

  /**
   * Get or create client instance with lazy initialization
   */
  async getClient(): Promise<any> {
    if (!this._client) {
      this._client = await this.initializeClient();
    }
    return this._client;
  }

  /**
   * Generate provider-specific signature for request validation or webhook verification
   * Default implementation uses JSON.stringify - override for provider-specific logic
   */
  generateSignature(data: Record<string, any>): string {
    return JSON.stringify(data);
  }

  /**
   * Logging utility for debugging or audit
   * Default implementation logs to console - override for custom logging
   */
  log(message: string, context?: Record<string, any>): void {
    if (this.config.debug || this.config.enable_logging) {
      console.log(`[${this.constructor.name}] ${message}`, context || "");
    }
  }

  /**
   * Handle provider errors and convert to standardized format
   */
  protected handleError(error: any, operation: string): never {
    this.log(`Error in ${operation}: ${error.message}`, { error });
    
    if (error.name === 'MidtransError') {
      throw new Error(`Provider error in ${operation}: ${error.message}`);
    }
    
    throw error;
  }

  /**
   * Standardize payment response format
   */
  protected standardizePaymentResponse(
    provider: string,
    data: any,
    metadata?: Record<string, any>
  ): BasePayment {
    return {
      provider,
      orderId: data.orderId || data.order_id,
      amount: Number(data.amount || data.gross_amount),
      currency: data.currency || "IDR",
      status: this.mapStatus(data.status || data.transaction_status),
      method: data.method || "other",
      description: data.description,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      createdAt: data.createdAt || data.transaction_time || new Date().toISOString(),
      updatedAt: data.updatedAt,
      expiresAt: data.expiresAt,
      metadata: metadata || {},
    };
  }

  /**
   * Standardize transaction response format
   */
  protected standardizeTransactionResponse(
    provider: string,
    data: any,
    type: "charge" | "refund" | "disbursement" | "settlement" | "reversal",
    metadata?: Record<string, any>
  ): Transaction {
    return {
      id: data.id || data.transaction_id,
      provider,
      paymentId: data.paymentId || data.order_id,
      type,
      status: this.mapStatus(data.status || data.transaction_status),
      amount: Number(data.amount || data.gross_amount),
      currency: data.currency || "IDR",
      createdAt: data.createdAt || data.transaction_time || new Date().toISOString(),
      rawResponse: data,
      metadata: metadata || {},
    };
  }

  /**
   * Map provider-specific status to unified status
   */
  protected mapStatus(providerStatus?: string): "pending" | "paid" | "failed" | "expired" | "refunded" | "cancelled" {
    if (!providerStatus) return "pending";
    
    const status = providerStatus.toLowerCase();
    
    switch (status) {
      case "settlement":
      case "capture":
      case "success":
      case "paid":
        return "paid";
      case "pending":
      case "authorize":
        return "pending";
      case "deny":
      case "failed":
      case "error":
        return "failed";
      case "expire":
      case "expired":
        return "expired";
      case "refund":
      case "partial_refund":
        return "refunded";
      case "cancel":
      case "cancelled":
        return "cancelled";
      default:
        return "pending";
    }
  }

  /**
   * Validate required configuration
   */
  protected validateConfig(requiredFields: string[]): void {
    const missing = requiredFields.filter(field => 
      this.config[field] === undefined || this.config[field] === null
    );
    if (missing.length > 0) {
      throw new Error(`Missing required config fields: ${missing.join(", ")}`);
    }
  }
}
