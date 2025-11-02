import type {
  UnipayInterface,
  ProviderInterface,
  PaymentData,
  VirtualAccountData,
  ConfigProviderParams,
} from "../types";
import type { BasePayment, Transaction } from "../types/payment";
import { ProviderFactory, type ProviderType } from "./ProviderFactory";

export default class Unipay implements UnipayInterface {
  /**
   * @todo implement payment log providers configuration
   * this options is for config third party payment log providers
   */
  options: Record<string, any>;
  provider?: ProviderInterface;

  constructor(options: Record<string, any>) {
    this.options = options;
  }

  setProvider(provider: ProviderInterface): void {
    this.provider = provider;
  }

  getProvider(): ProviderInterface | null {
    return this.provider || null;
  }

  async getClient(): Promise<any> {
    if (!this.provider) {
      throw new Error("Please set a provider, before use this method");
    }
    return this.provider.getClient();
  }

  async createPayment(data: PaymentData): Promise<BasePayment> {
    if (!this.provider) {
      throw new Error("Please set a provider, before use this method");
    }
    return this.provider.createPayment(data);
  }

  async createVirtualAccount(data: VirtualAccountData): Promise<Transaction> {
    if (!this.provider) {
      throw new Error("Please set a provider, before use this method");
    }

    return this.provider.createVirtualAccount(data);
  }

  async getPaymentStatus(referenceId: string): Promise<BasePayment> {
    if (!this.provider) {
      throw new Error("Please set a provider, before use this method");
    }
    if (!this.provider.getPaymentStatus) {
      throw new Error("Provider does not support getPaymentStatus method");
    }
    return this.provider.getPaymentStatus(referenceId);
  }

  async cancelPayment(referenceId: string): Promise<BasePayment> {
    if (!this.provider) {
      throw new Error("Please set a provider, before use this method");
    }
    if (!this.provider.cancelPayment) {
      throw new Error("Provider does not support cancelPayment method");
    }
    return this.provider.cancelPayment(referenceId);
  }

  /**
   * Legacy snap method for backward compatibility
   * @deprecated Use getClient() instead
   */
  async snap() {
    if (!this.provider) {
      throw new Error("Please set a provider, before use this method");
    }

    // Check if provider has snap method (for backward compatibility)
    if ("snap" in this.provider && typeof this.provider.snap === "function") {
      return (this.provider as any).snap();
    }

    return this.provider.getClient();
  }
}
