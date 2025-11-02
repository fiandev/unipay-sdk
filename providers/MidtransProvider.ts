import BaseProvider from "../lib/BaseProvider";
import type {
  ConfigProviderParams,
  ProviderInterface,
  PaymentData,
  VirtualAccountData,
} from "../types";
import { Snap, CoreApi } from "midtrans-client";

// Extend the CoreApi interface to include transaction methods
interface ExtendedCoreApi extends CoreApi {
  transaction: {
    status(transactionId: string): Promise<any>;
    cancel(transactionId: string): Promise<any>;
    approve(transactionId: string): Promise<any>;
    deny(transactionId: string): Promise<any>;
    expire(transactionId: string): Promise<any>;
    refund(transactionId: string, parameter?: any): Promise<any>;
  };
}
import type { BasePayment, Transaction } from "../types/payment";

export default class MidtransProvider
  extends BaseProvider
  implements ProviderInterface
{
  private snapClient?: Snap;
  private coreClient?: CoreApi;

  constructor(config: ConfigProviderParams) {
    super(config);
    this.validateConfig(["client_id", "secret_key"]);
  }

  protected override async initializeClient(): Promise<{
    snap: Snap;
    core: CoreApi;
  }> {
    const snap = new Snap({
      isProduction: this.config.is_production,
      serverKey: this.config.secret_key,
      clientKey: this.config.public_key || "",
    });

    const core = new CoreApi({
      isProduction: this.config.is_production,
      serverKey: this.config.secret_key,
      clientKey: this.config.public_key || "",
    });

    this.snapClient = snap;
    this.coreClient = core;

    return { snap, core };
  }

  override async getClient(): Promise<Snap> {
    if (!this.snapClient) {
      await this.initializeClient();
    }
    return this.snapClient!;
  }

  async getCoreClient(): Promise<CoreApi> {
    if (!this.coreClient) {
      await this.initializeClient();
    }
    return this.coreClient!;
  }

  /**
   * Legacy snap method for backward compatibility
   * @deprecated Use getClient() instead
   */
  async snap(): Promise<Snap> {
    return this.getClient();
  }

  /**
   * Create Midtrans payment via Snap API (checkout/invoice)
   */
  async createPayment(data: PaymentData): Promise<BasePayment> {
    try {
      const snap = await this.getClient();

      const snapData: any = {
        transaction_details: {
          order_id: data.orderId,
          gross_amount: data.amount,
        },
      };

      if (data.customerEmail || data.customerName) {
        snapData.customer_details = {
          email: data.customerEmail,
          name: data.customerName,
        };
      }

      if (data.description) {
        snapData.transaction_details.description = data.description;
      }

      const transaction = await snap.createTransaction(snapData);

      return this.standardizePaymentResponse(
        "midtrans",
        {
          orderId: data.orderId,
          amount: data.amount,
          currency: data.currency,
          status: "pending",
          method: "other",
          description: data.description || "Midtrans Snap Payment",
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          createdAt: new Date().toISOString(),
        },
        {
          token: transaction.token,
          redirect_url: transaction.redirect_url,
        },
      );
    } catch (error) {
      this.handleError(error, "createPayment");
    }
  }

  /**
   * Create Midtrans Virtual Account (Core API)
   */
  async createVirtualAccount(data: VirtualAccountData): Promise<Transaction> {
    try {
      const core = await this.getCoreClient();

      const vaData: any = {
        payment_type: "bank_transfer",
        transaction_details: {
          order_id: data.orderId,
          gross_amount: data.amount,
        },
        bank_transfer: {
          bank: data.bankCode,
        },
      };

      if (data.customerEmail || data.customerName) {
        vaData.customer_details = {
          email: data.customerEmail,
          name: data.customerName,
        };
      }

      const result = await core.charge(vaData);

      return this.standardizeTransactionResponse(
        "midtrans",
        {
          id: result.transaction_id,
          paymentId: result.order_id,
          status: result.transaction_status,
          amount: result.gross_amount,
          currency: result.currency,
          createdAt: result.transaction_time,
        },
        "charge",
        {
          va_numbers: result.va_numbers,
          payment_type: result.payment_type,
          permata_va_number: result.permata_va_number,
          bill_key: result.bill_key,
          biller_code: result.biller_code,
        },
      );
    } catch (error) {
      this.handleError(error, "createVirtualAccount");
    }
  }

  /**
   * Get payment status from Midtrans
   */
  async getPaymentStatus(referenceId: string): Promise<BasePayment> {
    try {
      const core = (await this.getCoreClient()) as ExtendedCoreApi;
      const status = await core.transaction.status(referenceId);

      return this.standardizePaymentResponse(
        "midtrans",
        {
          orderId: status.order_id,
          amount: status.gross_amount,
          currency: status.currency,
          status: status.transaction_status,
          method: status.payment_type,
          description: status.transaction_status,
          customerEmail: status.customer_details?.email,
          customerName: status.customer_details?.name,
          createdAt: status.transaction_time,
          updatedAt: status.updated_at,
          expiresAt: status.expiry_time,
        },
        {
          fraud_status: status.fraud_status,
          approval_code: status.approval_code,
          payment_type: status.payment_type,
          transaction_time: status.transaction_time,
          gross_amount: status.gross_amount,
          va_numbers: status.va_numbers,
          permata_va_number: status.permata_va_number,
          bill_key: status.bill_key,
          biller_code: status.biller_code,
        },
      );
    } catch (error) {
      this.handleError(error, "getPaymentStatus");
    }
  }

  /**
   * Cancel payment in Midtrans
   */
  async cancelPayment(referenceId: string): Promise<BasePayment> {
    try {
      const core = (await this.getCoreClient()) as ExtendedCoreApi;
      const result = await core.transaction.cancel(referenceId);

      return this.standardizePaymentResponse(
        "midtrans",
        {
          orderId: result.order_id,
          amount: result.gross_amount,
          currency: result.currency,
          status: result.transaction_status || "cancelled",
          method: result.payment_type,
          description: "Payment cancelled",
          customerEmail: result.customer_details?.email,
          customerName: result.customer_details?.name,
          createdAt: result.transaction_time,
          updatedAt: result.updated_at,
        },
        {
          cancellation_reason: result.cancellation_reason,
        },
      );
    } catch (error) {
      this.handleError(error, "cancelPayment");
    }
  }
}
