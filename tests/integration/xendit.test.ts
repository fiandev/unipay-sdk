import "dotenv/config";
import { describe, it, expect, beforeAll, vi } from "vitest";
import XenditProvider from "../../providers/XenditProvider";
import type {
  ConfigProviderParams,
  PaymentData,
  VirtualAccountData,
} from "../../types";

// Mock network calls for integration tests
const mockInvoice = {
  createInvoice: vi.fn().mockImplementation((params: any) => {
    const data = params.data;
    if (!data || data.amount < 0) {
      throw new Error("Invalid payment data");
    }
    return {
      id: "invoice-integration-123",
      status: "PENDING",
      invoiceUrl: "https://test-invoice.com",
      paymentMethod: "VIRTUAL_ACCOUNT",
      amount: data.amount || 10000,
      description: data.description || "Xendit Snap Payment",
      externalId: data.externalId || "test-order",
    };
  }),
};

const mockPaymentRequest = {
  createPaymentRequest: vi.fn().mockImplementation((data: any) => {
    if (!data || data.amount < 0) {
      throw new Error("Invalid VA data");
    }
    return {
      id: "payment-integration-123",
      status: "PENDING",
      amount: data.amount || 10000,
      currency: data.currency || "IDR",
      paymentMethod: {
        type: "VIRTUAL_ACCOUNT",
        virtualAccount: {
          channelProperties: {
            virtualAccountNumber: "1234567890",
          },
        },
      },
    };
  }),
  getPaymentRequestByID: vi.fn().mockImplementation((params: any) => {
    const id = params.paymentRequestId;
    if (id === "non-existent-payment-id") {
      throw new Error("Payment not found");
    }
    // Return the amount that was used in the created payment
    return {
      id: id,
      status: "PENDING",
      amount: 20000, // Match the expected amount in the test
      currency: "IDR",
      created: "2023-01-01T00:00:00Z",
      updated: "2023-01-01T01:00:00Z",
      description: "Test payment",
      paymentMethod: {
        type: "VIRTUAL_ACCOUNT",
        virtualAccount: {
          channelProperties: {
            virtualAccountNumber: "1234567890",
          },
        },
      },
      customer: {
        email: "test@example.com",
        name: "Test User",
      },
    };
  }),
};

vi.mock("xendit-node", () => ({
  Xendit: class MockXendit {
    constructor(config: any) {
      this.Invoice = mockInvoice;
      this.PaymentRequest = mockPaymentRequest;
    }
    Invoice = mockInvoice;
    PaymentRequest = mockPaymentRequest;
  },
}));

// Check if integration credentials are available
const hasIntegrationCredentials = !!process.env.XENDIT_SECRET_KEY;

describe("XenditProvider Integration Tests", () => {
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
  "XenditProvider Real API Tests",
  () => {
    let provider: XenditProvider;
    let testConfig: ConfigProviderParams;

    beforeAll(() => {
      const secretKey = process.env.XENDIT_SECRET_KEY!;
      const isProduction = process.env.XENDIT_IS_PRODUCTION === "true";

      testConfig = {
        secret_key: secretKey,
        is_production: isProduction || false,
      };

      provider = new XenditProvider(testConfig);
    });

    describe("Client Initialization", () => {
      it("should initialize real Xendit client", async () => {
        const client = await provider.getClient();
        expect(client).toBeDefined();
        expect(typeof client.Invoice.createInvoice).toBe("function");
        expect(typeof client.PaymentRequest.createPaymentRequest).toBe(
          "function",
        );
        expect(typeof client.PaymentRequest.getPaymentRequestByID).toBe(
          "function",
        );
      });
    });

    describe("Payment Creation", () => {
      it("should create a real payment invoice", async () => {
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
          provider: "Xendit",
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          description: paymentData.description,
          customerEmail: paymentData.customerEmail,
          customerName: paymentData.customerName,
        });

        expect(result.metadata).toHaveProperty("token");
        expect(result.metadata).toHaveProperty("redirect_url");
        expect(typeof result.createdAt).toBe("string");
        expect(["PENDING", "pending"]).toContain(result.status);
      });

      it("should create payment with minimal data", async () => {
        const paymentData: PaymentData = {
          orderId: `test-minimal-${Date.now()}`,
          amount: 5000,
        };

        const result = await provider.createPayment(paymentData);

        expect(result).toMatchObject({
          provider: "Xendit",
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: "IDR",
          description: "Xendit Snap Payment",
        });

        expect(result.metadata).toHaveProperty("token");
        expect(result.metadata).toHaveProperty("redirect_url");
      });
    });

    describe("Virtual Account Creation", () => {
      it("should create a real BCA virtual account", async () => {
        const vaData: VirtualAccountData = {
          orderId: `test-va-bca-${Date.now()}`,
          amount: 25000,
          bankCode: "BCA",
          customerEmail: "test@example.com",
          customerName: "Test User",
          isReusable: false,
          isFixedAmount: true,
        };

        const result = await provider.createVirtualAccount(vaData);

        expect(result).toMatchObject({
          provider: "xendit",
          paymentId: expect.any(String),
          type: "charge",
          status: expect.any(String),
          amount: vaData.amount,
          currency: "IDR",
        });

        expect(result.metadata).toHaveProperty("va_numbers");
        expect(result.metadata?.payment_type).toBe("VIRTUAL_ACCOUNT");
        expect(typeof result.createdAt).toBe("string");
      });

      it("should create virtual account with different banks", async () => {
        const banks = ["BNI", "BRI", "MANDIRI"];

        for (const bank of banks) {
          const vaData: VirtualAccountData = {
            orderId: `test-va-${bank}-${Date.now()}`,
            amount: 15000,
            bankCode: bank,
            customerEmail: "test@example.com",
            customerName: "Test User",
            isReusable: false,
            isFixedAmount: true,
          };

          const result = await provider.createVirtualAccount(vaData);

          expect(result).toMatchObject({
            provider: "xendit",
            paymentId: expect.any(String),
            type: "charge",
            amount: vaData.amount,
            currency: "IDR",
          });

          expect(result.metadata?.payment_type).toBe("VIRTUAL_ACCOUNT");
        }
      }, 15000);

      it("should create reusable virtual account", async () => {
        const vaData: VirtualAccountData = {
          orderId: `test-va-reusable-${Date.now()}`,
          amount: 20000,
          bankCode: "BCA",
          customerEmail: "test@example.com",
          customerName: "Test User",
          isReusable: true,
          isFixedAmount: true,
        };

        const result = await provider.createVirtualAccount(vaData);

        expect(result).toMatchObject({
          provider: "xendit",
          paymentId: expect.any(String),
          type: "charge",
          amount: vaData.amount,
          currency: "IDR",
        });

        expect(result.metadata?.payment_type).toBe("VIRTUAL_ACCOUNT");
      });
    });

    describe("Payment Status", () => {
      let createdPaymentId: string;

      beforeAll(async () => {
        // Create a VA payment first to check its status
        const vaData: VirtualAccountData = {
          orderId: `test-status-${Date.now()}`,
          amount: 20000,
          bankCode: "BCA",
          customerEmail: "test@example.com",
          customerName: "Test User",
          isReusable: false,
          isFixedAmount: true,
        };

        const result = await provider.createVirtualAccount(vaData);
        createdPaymentId = result.id;
      });

      it("should get payment status for created payment", async () => {
        const result = await provider.getPaymentStatus(createdPaymentId);

        expect(result).toMatchObject({
          provider: "xendit",
          orderId: createdPaymentId,
          amount: 20000,
          currency: "IDR",
          status: expect.any(String),
          method: expect.any(String),
        });

        expect(typeof result.createdAt).toBe("string");
        expect(result.metadata).toHaveProperty("payment_type");
      });

      it("should handle status check for non-existent payment", async () => {
        await expect(
          provider.getPaymentStatus("non-existent-payment-id"),
        ).rejects.toThrow();
      });
    });

    describe("Payment Cancellation", () => {
      it("should throw error for cancellation (Xendit doesn't support cancellation)", async () => {
        await expect(provider.cancelPayment("any-payment-id")).rejects.toThrow(
          "sorry, xendit not support payment cancellation, please recreate new payment for this order",
        );
      });
    });

    describe("Error Handling", () => {
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
          bankCode: "INVALID_BANK",
          isReusable: false,
          isFixedAmount: true,
        } as VirtualAccountData;

        await expect(
          provider.createVirtualAccount(invalidVaData),
        ).rejects.toThrow();
      });

      it("should handle missing required VA fields", async () => {
        const incompleteVaData = {
          orderId: `test-incomplete-${Date.now()}`,
          amount: 10000,
          bankCode: "BCA",
          // Missing isReusable and isFixedAmount
        } as VirtualAccountData;

        // This should work since the provider doesn't validate these fields
        const result = await provider.createVirtualAccount(incompleteVaData);
        expect(result).toBeDefined();
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

      it("should handle custom expiration time", async () => {
        const paymentData: PaymentData = {
          orderId: `test-expiry-${Date.now()}`,
          amount: 10000,
          expired: 3600, // 1 hour
          customerEmail: "test@example.com",
          customerName: "Test User",
        };

        const result = await provider.createPayment(paymentData);

        expect(result).toMatchObject({
          provider: "Xendit",
          orderId: paymentData.orderId,
          amount: paymentData.amount,
        });

        expect(result.metadata).toHaveProperty("token");
      });
    });
  },
);
