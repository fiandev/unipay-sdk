import type {
  UnipayInterface,
  BaseProviderInterface,
  ProviderInterface,
} from "../types";
import type { BasePayment, Transaction } from "../types/payment";

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

  async snap() {
    if (!this.provider) {
      throw new Error("Please set a provider, before use this method");
    }

    return this.provider.snap();
  }

  async createPayment(data): Promise<BasePayment> {
    if (!this.provider) {
      throw new Error("Please set a provider, before use this method");
    }
    return this.provider.createPayment(data);
  }

  async createVirtualAccount(data: BasePayment): Promise<Transaction> {
    if (!this.provider) {
      throw new Error("Please set a provider, before use this method");
    }

    return this.provider.createVirtualAccount(data);
  }
}
