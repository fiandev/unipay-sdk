import { describe, it, expect, beforeEach, vi } from "vitest";
import MidtransProvider from "../../providers/MidtransProvider";
import type {
  ConfigProviderParams,
  PaymentData,
  VirtualAccountData,
} from "../../types";

// Mock midtrans-client
const mockSnap = {
  createTransaction: vi.fn().mockResolvedValue({
    token: "test-token",
    redirect_url: "https://test-redirect.com",
  }),
};

const mockCoreApi = {
  charge: vi.fn().mockResolvedValue({
    transaction_id: "txn-123",
    order_id: "order-123",
    transaction_status: "pending",
    gross_amount: 10000,
    currency: "IDR",
    transaction_time: "2023-01-01 00:00:00",
    va_numbers: [{ bank: "bca", va_number: "1234567890" }],
    payment_type: "bank_transfer",
  }),
  transaction: {
    status: vi.fn().mockResolvedValue({
      order_id: "order-123",
      gross_amount: 10000,
      currency: "IDR",
      transaction_status: "settlement",
      payment_type: "bank_transfer",
      customer_details: {
        email: "test@example.com",
        name: "Test User",
      },
      transaction_time: "2023-01-01 00:00:00",
      updated_at: "2023-01-01 01:00:00",
      fraud_status: "accept",
      va_numbers: [{ bank: "bca", va_number: "1234567890" }],
    }),
    cancel: vi.fn().mockResolvedValue({
      order_id: "order-123",
      gross_amount: 10000,
      currency: "IDR",
      transaction_status: "cancel",
      payment_type: "bank_transfer",
      customer_details: {
        email: "test@example.com",
        name: "Test User",
      },
      transaction_time: "2023-01-01 00:00:00",
      updated_at: "2023-01-01 01:00:00",
    }),
  },
};

vi.mock("midtrans-client", () => ({
  Snap: class {
    constructor(config: any) {
      Object.assign(this, mockSnap);
    }
  },
  CoreApi: class {
    constructor(config: any) {
      Object.assign(this, mockCoreApi);
    }
  },
}));

describe("MidtransProvider", () => {
  let provider: MidtransProvider;
  let mockConfig: ConfigProviderParams;

  beforeEach(() => {
    mockConfig = {
      client_id: "test_client_id",
      secret_key: "test_secret_key",
      is_production: false,
    };
    provider = new MidtransProvider(mockConfig);
  });

  describe("constructor", () => {
    it("should initialize with config", () => {
      expect((provider as any).config).toEqual(mockConfig);
    });

    it("should throw error when client_id is missing", () => {
      const invalidConfig = {
        secret_key: "test_secret_key",
        is_production: false,
      } as ConfigProviderParams;

      expect(() => new MidtransProvider(invalidConfig)).toThrow(
        "Missing required config fields: client_id",
      );
    });

    it("should throw error when secret_key is missing", () => {
      const invalidConfig = {
        client_id: "test_client_id",
        is_production: false,
      } as ConfigProviderParams;

      expect(() => new MidtransProvider(invalidConfig)).toThrow(
        "Missing required config fields: secret_key",
      );
    });

    it("should throw error when multiple fields are missing", () => {
      const invalidConfig = {
        is_production: false,
      } as ConfigProviderParams;

      expect(() => new MidtransProvider(invalidConfig)).toThrow(
        "Missing required config fields: client_id, secret_key",
      );
    });
  });

  describe("getClient", () => {
    it("should return Snap client", async () => {
      const client = await provider.getClient();
      expect(client).toBeDefined();
      expect(typeof client.createTransaction).toBe("function");
    });
  });

  describe("getCoreClient", () => {
    it("should return CoreApi client", async () => {
      const client = await provider.getCoreClient();
      expect(client).toBeDefined();
      expect(typeof client.charge).toBe("function");
      expect(typeof client.transaction.status).toBe("function");
    });
  });

  describe("createPayment", () => {
    it("should create payment with minimal data", async () => {
      const paymentData: PaymentData = {
        orderId: "order-123",
        amount: 10000,
      };

      const result = await provider.createPayment(paymentData);

      expect(result).toEqual({
        provider: "midtrans",
        orderId: "order-123",
        amount: 10000,
        currency: "IDR",
        status: "pending",
        method: "other",
        description: "Midtrans Snap Payment",
        customerEmail: undefined,
        customerName: undefined,
        createdAt: expect.any(String),
        metadata: {
          token: "test-token",
          redirect_url: "https://test-redirect.com",
        },
      });
    });

    it("should create payment with full data", async () => {
      const paymentData: PaymentData = {
        orderId: "order-123",
        amount: 10000,
        currency: "USD",
        description: "Test payment",
        customerEmail: "test@example.com",
        customerName: "Test User",
      };

      const result = await provider.createPayment(paymentData);

      expect(result).toEqual({
        provider: "midtrans",
        orderId: "order-123",
        amount: 10000,
        currency: "USD",
        status: "pending",
        method: "other",
        description: "Test payment",
        customerEmail: "test@example.com",
        customerName: "Test User",
        createdAt: expect.any(String),
        metadata: {
          token: "test-token",
          redirect_url: "https://test-redirect.com",
        },
      });
    });
  });

  describe("createVirtualAccount", () => {
    it("should create virtual account", async () => {
      const vaData: VirtualAccountData = {
        orderId: "order-123",
        amount: 10000,
        bankCode: "bca",
        customerEmail: "test@example.com",
        customerName: "Test User",
      };

      const result = await provider.createVirtualAccount(vaData);

      expect(result).toEqual({
        id: "txn-123",
        provider: "midtrans",
        paymentId: "order-123",
        type: "charge",
        status: "pending",
        amount: 10000,
        currency: "IDR",
        createdAt: "2023-01-01 00:00:00",
        rawResponse: expect.any(Object),
        metadata: {
          va_numbers: [{ bank: "bca", va_number: "1234567890" }],
          payment_type: "bank_transfer",
          permata_va_number: undefined,
          bill_key: undefined,
          biller_code: undefined,
        },
      });
    });
  });

  describe("getPaymentStatus", () => {
    it("should get payment status", async () => {
      const result = await provider.getPaymentStatus("order-123");

      expect(result).toEqual({
        provider: "midtrans",
        orderId: "order-123",
        amount: 10000,
        currency: "IDR",
        status: "paid",
        method: "bank_transfer",
        description: "settlement",
        customerEmail: "test@example.com",
        customerName: "Test User",
        createdAt: "2023-01-01 00:00:00",
        updatedAt: "2023-01-01 01:00:00",
        expiresAt: undefined,
        metadata: {
          fraud_status: "accept",
          approval_code: undefined,
          payment_type: "bank_transfer",
          transaction_time: "2023-01-01 00:00:00",
          gross_amount: 10000,
          va_numbers: [{ bank: "bca", va_number: "1234567890" }],
          permata_va_number: undefined,
          bill_key: undefined,
          biller_code: undefined,
        },
      });
    });
  });

  describe("cancelPayment", () => {
    it("should cancel payment", async () => {
      const result = await provider.cancelPayment("order-123");

      expect(result).toEqual({
        provider: "midtrans",
        orderId: "order-123",
        amount: 10000,
        currency: "IDR",
        status: "cancelled",
        method: "bank_transfer",
        description: "Payment cancelled",
        customerEmail: "test@example.com",
        customerName: "Test User",
        createdAt: "2023-01-01 00:00:00",
        updatedAt: "2023-01-01 01:00:00",
        metadata: {
          cancellation_reason: undefined,
        },
      });
    });
  });

  describe("snap method (legacy)", () => {
    it("should return Snap client for backward compatibility", async () => {
      const snapClient = await provider.snap();
      expect(snapClient).toBeDefined();
      expect(typeof snapClient.createTransaction).toBe("function");
    });
  });
});
