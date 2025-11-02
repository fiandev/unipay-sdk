import BaseProvider from "../lib/BaseProvider";
import type { ConfigProviderParams, ProviderInterface } from "../types";
import { Snap, type SnapTransactionParameters } from "midtrans-client";
import type { BasePayment, Transaction } from "../types/payment";

export default class MidtransProvider
  extends BaseProvider
  implements ProviderInterface
{
  private snapClient: Snap;

  constructor(config: ConfigProviderParams) {
    super(config);

    this.snapClient = new Snap({
      isProduction: config.is_production,
      serverKey: config.secret_key,
      clientKey: config.client_id,
    });
  }

  async snap(): Promise<Snap> {
    return this.snapClient;
  }

  /**
   * Create Midtrans payment via Snap API (checkout/invoice)
   */
  async createPayment(data: SnapTransactionParameters): Promise<BasePayment> {
    const transaction = await this.snapClient.createTransaction(data);

    return {
      provider: "midtrans",
      orderId: (data as any).transaction_details?.order_id,
      amount: (data as any).transaction_details?.gross_amount,
      currency: "IDR",
      status: "pending",
      method: "other",
      description: "Midtrans Snap Payment",
      createdAt: new Date().toISOString(),
      metadata: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
      },
    };
  }

  /**
   * Create Midtrans Virtual Account (Core API)
   */
  async createVirtualAccount(
    data: Record<string, unknown>,
  ): Promise<Transaction> {
    const core = new (require("midtrans-client").CoreApi)({
      isProduction: this.config.is_production,
      serverKey: this.config.secret_key,
      clientKey: this.config.client_id,
    });

    const result = await core.charge(data as any);

    return {
      id: result.transaction_id,
      provider: "midtrans",
      paymentId: result.order_id,
      type: "charge",
      status: (result.transaction_status as any) || "pending",
      amount: Number(result.gross_amount),
      currency: result.currency || "IDR",
      createdAt: result.transaction_time,
      rawResponse: result,
      metadata: {
        va_numbers: result.va_numbers,
        payment_type: result.payment_type,
      },
    };
  }
}
