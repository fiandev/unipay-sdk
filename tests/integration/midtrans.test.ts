import "dotenv/config";
import { describe, it, expect, beforeAll } from "vitest";
import MidtransProvider from "../../providers/MidtransProvider";
import type {
  ConfigProviderParams,
  PaymentData,
  VirtualAccountData,
} from "../../types";

// Check if environment variables are set for integration tests
const hasIntegrationCredentials =
  typeof process.env.MIDTRANS_SECRET_KEY === "string";

describe("MidtransProvider Integration Tests", () => {
  it("should have test structure ready", () => {
    expect(typeof hasIntegrationCredentials).toBe("boolean");
  });

  it.skipIf(hasIntegrationCredentials)(
    "should skip integration tests when credentials are missing",
    () => {
      expect(hasIntegrationCredentials).toBe(false);
    },
  );
});

describe.skipIf(!hasIntegrationCredentials)(
  "MidtransProvider Real API Tests",
  () => {
    let provider: MidtransProvider;
    let testConfig: ConfigProviderParams;

    beforeAll(() => {
      const clientId = process.env.MIDTRANS_PUBLIC_KEY!;
      const secretKey = process.env.MIDTRANS_SECRET_KEY!;
      const isProduction = false;

      testConfig = {
        client_id: clientId,
        secret_key: secretKey,
        is_production: isProduction || false,
      };

      provider = new MidtransProvider(testConfig);
    });

    describe("Client Initialization", () => {
      it("should initialize real Midtrans clients", async () => {
        const snapClient = await provider.getClient();
        expect(snapClient).toBeDefined();
        expect(typeof snapClient.createTransaction).toBe("function");

        const coreClient = await provider.getCoreClient();
        expect(coreClient).toBeDefined();
        expect(typeof coreClient.charge).toBe("function");
        // Note: transaction methods exist but may not be in the type definition
      });
    });

    describe("Payment Creation", () => {
      it("should create a real payment transaction", async () => {
        const paymentData: PaymentData = {
          orderId: `test-order-${Date.now()}`,
          amount: 10000,
          currency: "IDR",
          description: "Integration test payment",
          customerEmail: "test@example.com",
          customerName: "Test User",
        };

        const result = await provider.createPayment(paymentData);

        expect(result).toMatchObject({
          provider: "midtrans",
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: "pending",
          method: "other",
          description: paymentData.description,
          customerEmail: paymentData.customerEmail,
          customerName: paymentData.customerName,
        });

        expect(result.metadata).toHaveProperty("token");
        expect(result.metadata).toHaveProperty("redirect_url");
        expect(typeof result.createdAt).toBe("string");
      });

      it("should create payment with minimal data", async () => {
        const paymentData: PaymentData = {
          orderId: `test-minimal-${Date.now()}`,
          amount: 5000,
        };

        const result = await provider.createPayment(paymentData);

        expect(result).toMatchObject({
          provider: "midtrans",
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: "IDR",
          status: "pending",
          method: "other",
          description: "Midtrans Snap Payment",
        });

        expect(result.metadata).toHaveProperty("token");
      });
    });

    describe("Virtual Account Creation", () => {
      it("should create a real BCA virtual account", async () => {
        const vaData: VirtualAccountData = {
          orderId: `test-va-bca-${Date.now()}`,
          amount: 25000,
          bankCode: "bca",
          customerEmail: "test@example.com",
          customerName: "Test User",
        };

        const result = await provider.createVirtualAccount(vaData);

        expect(result).toMatchObject({
          provider: "midtrans",
          paymentId: vaData.orderId,
          type: "charge",
          status: expect.any(String),
          amount: vaData.amount,
          currency: "IDR",
        });

        expect(result.metadata).toHaveProperty("va_numbers");
        expect(result.metadata?.payment_type).toBe("bank_transfer");
        expect(typeof result.createdAt).toBe("string");
      });

      it("should create virtual account with different banks", async () => {
        const banks = ["bni"];

        for (const bank of banks) {
          const vaData: VirtualAccountData = {
            orderId: `test-va-${bank}-${Date.now()}`,
            amount: 15000,
            bankCode: bank,
            customerEmail: "test@example.com",
            customerName: "Test User",
          };

          const result = await provider.createVirtualAccount(vaData);

          expect(result).toMatchObject({
            provider: "midtrans",
            paymentId: vaData.orderId,
            type: "charge",
            amount: vaData.amount,
            currency: "IDR",
          });

          expect(result.metadata?.payment_type).toBe("bank_transfer");
        }
      }, 10000);
    });

    describe("Payment Status", () => {
      let createdOrderId: string;

      beforeAll(async () => {
        // Create a VA payment first to check its status (VA payments create actual transactions)
        const vaData: VirtualAccountData = {
          orderId: `test-status-${Date.now()}`,
          amount: 20000,
          bankCode: "bca",
          customerEmail: "test@example.com",
          customerName: "Test User",
        };

        const result = await provider.createVirtualAccount(vaData);
        createdOrderId = result.paymentId;
      });

      it("should get payment status for created order", async () => {
        const result = await provider.getPaymentStatus(createdOrderId);

        expect(result).toMatchObject({
          provider: "midtrans",
          orderId: createdOrderId,
          amount: 20000,
          currency: "IDR",
          status: expect.any(String),
          method: expect.any(String),
        });

        expect(typeof result.createdAt).toBe("string");
        expect(result.metadata).toHaveProperty("payment_type");
      });

      it("should handle status check for non-existent order", async () => {
        await expect(
          provider.getPaymentStatus("non-existent-order-id"),
        ).rejects.toThrow();
      });
    });

    describe("Payment Cancellation", () => {
      let createdOrderId: string;

      beforeAll(async () => {
        // Create a VA payment first to cancel it
        const vaData: VirtualAccountData = {
          orderId: `test-cancel-${Date.now()}`,
          amount: 30000,
          bankCode: "bca",
          customerEmail: "test@example.com",
          customerName: "Test User",
        };

        const result = await provider.createVirtualAccount(vaData);
        createdOrderId = result.paymentId;
      });

      it("should cancel a created payment", async () => {
        const result = await provider.cancelPayment(createdOrderId);

        expect(result).toMatchObject({
          provider: "midtrans",
          orderId: createdOrderId,
          amount: 30000,
          currency: "IDR",
          status: expect.any(String),
          method: expect.any(String),
          description: "Payment cancelled",
        });

        expect(typeof result.createdAt).toBe("string");
      });
    });

    describe("Error Handling", () => {
      it("should handle invalid order ID for status check", async () => {
        await expect(provider.getPaymentStatus("")).rejects.toThrow();
      });

      it("should handle invalid order ID for cancellation", async () => {
        await expect(provider.cancelPayment("")).rejects.toThrow();
      });

      it("should handle invalid payment data", async () => {
        const invalidData = {
          orderId: "",
          amount: -1000,
        } as PaymentData;

        await expect(provider.createPayment(invalidData)).rejects.toThrow();
      });

      it("should handle invalid VA data", async () => {
        const invalidVaData = {
          orderId: "",
          amount: -1000,
          bankCode: "invalid-bank",
        } as VirtualAccountData;

        await expect(
          provider.createVirtualAccount(invalidVaData),
        ).rejects.toThrow();
      });
    });

    describe("Edge Cases", () => {
      it("should handle very large amount", async () => {
        const paymentData: PaymentData = {
          orderId: `test-large-${Date.now()}`,
          amount: 999999999,
          currency: "IDR",
          customerEmail: "test@example.com",
          customerName: "Test User",
        };

        const result = await provider.createPayment(paymentData);

        expect(result.amount).toBe(999999999);
        expect(result.metadata).toHaveProperty("token");
      });

      it("should handle special characters in description", async () => {
        const paymentData: PaymentData = {
          orderId: `test-special-${Date.now()}`,
          amount: 10000,
          description:
            "Payment with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
          customerEmail: "test@example.com",
          customerName: "Test User",
        };

        const result = await provider.createPayment(paymentData);

        expect(result.description).toBe(paymentData.description);
      });

      it("should handle long customer names and emails", async () => {
        const longName = "A".repeat(100);
        const longEmail = `${"a".repeat(50)}@${"b".repeat(50)}.com`;

        const paymentData: PaymentData = {
          orderId: `test-long-${Date.now()}`,
          amount: 10000,
          customerEmail: longEmail,
          customerName: longName,
        };

        const result = await provider.createPayment(paymentData);

        expect(result.customerName).toBe(longName);
        expect(result.customerEmail).toBe(longEmail);
      });
    });
  },
);
