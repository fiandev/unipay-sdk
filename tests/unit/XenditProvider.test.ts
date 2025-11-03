import { describe, it, expect, beforeEach, vi } from "vitest";
import XenditProvider from "../../providers/XenditProvider";
import type {
  ConfigProviderParams,
  PaymentData,
  VirtualAccountData,
} from "../../types";

// Mock xendit-node
const mockInvoice = {
  createInvoice: vi.fn().mockResolvedValue({
    id: "invoice-123",
    status: "pending",
    invoiceUrl: "https://test-invoice.com",
    paymentMethod: "VIRTUAL_ACCOUNT",
  }),
};

const mockPaymentRequest = {
  createPaymentRequest: vi.fn().mockResolvedValue({
    id: "payment-123",
    status: "pending",
    amount: 10000,
    currency: "IDR",
    paymentMethod: {
      type: "VIRTUAL_ACCOUNT",
      virtualAccount: {
        channelProperties: {
          virtualAccountNumber: "1234567890",
        },
      },
    },
  }),
  getPaymentRequestByID: vi.fn().mockResolvedValue({
    id: "payment-123",
    status: "paid",
    amount: 10000,
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
  Invoice: {},
  PaymentRequestCurrency: {
    IDR: "IDR",
    USD: "USD",
  },
  PaymentMethodReusability: {
    OneTimeUse: "ONE_TIME_USE",
    MultipleUse: "MULTIPLE_USE",
  },
  PaymentMethodType: {
    VirtualAccount: "VIRTUAL_ACCOUNT",
  },
  VirtualAccountChannelCode: {
    BCA: "BCA",
    BNI: "BNI",
    BRI: "BRI",
    MANDIRI: "MANDIRI",
  },
}));

describe("XenditProvider", () => {
  let provider: XenditProvider;
  let mockConfig: ConfigProviderParams;

  beforeEach(() => {
    mockConfig = {
      client_id: "test_client_id",
      secret_key: "test_secret_key",
      is_production: false,
    };
    provider = new XenditProvider(mockConfig);
  });

  describe("constructor", () => {
    it("should initialize with config", () => {
      expect((provider as any).config).toEqual(mockConfig);
    });

    it("should throw error when secret_key is missing", () => {
      const invalidConfig = {
        secret_key: "test_secret_key",
      } as ConfigProviderParams;

      expect(() => new XenditProvider(invalidConfig)).toThrow(
        "Missing required config fields: is_production",
      );
    });
  });

  describe("getClient", () => {
    it("should return Xendit client", async () => {
      const client = await provider.getClient();

      expect(client).toBeDefined();
      expect(typeof client.Invoice.createInvoice).toBe("function");
      expect(typeof client.PaymentRequest.createPaymentRequest).toBe(
        "function",
      );
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
        provider: "Xendit",
        orderId: "order-123",
        amount: 10000,
        currency: "IDR",
        status: result.status,
        method: "VIRTUAL_ACCOUNT",
        description: "Xendit Snap Payment",
        customerEmail: undefined,
        customerName: undefined,
        createdAt: expect.any(String),
        metadata: {
          token: "invoice-123",
          redirect_url: "https://test-invoice.com",
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
        expired: 3600,
      };

      const result = await provider.createPayment(paymentData);

      expect(result).toEqual({
        provider: "Xendit",
        orderId: "order-123",
        amount: 10000,
        currency: "USD",
        status: result.status,
        method: "VIRTUAL_ACCOUNT",
        description: "Test payment",
        customerEmail: "test@example.com",
        customerName: "Test User",
        createdAt: expect.any(String),
        metadata: {
          token: "invoice-123",
          redirect_url: "https://test-invoice.com",
        },
      });
    });
  });

  describe("createVirtualAccount", () => {
    it("should create virtual account", async () => {
      const vaData: VirtualAccountData = {
        orderId: "order-123",
        amount: 10000,
        bankCode: "BCA",
        customerEmail: "test@example.com",
        customerName: "Test User",
        isReusable: false,
        isFixedAmount: true,
      };

      const result = await provider.createVirtualAccount(vaData);

      expect(result).toEqual({
        id: "payment-123",
        provider: "xendit",
        paymentId: "payment-123",
        type: "charge",
        status: result.status,
        amount: 10000,
        currency: "IDR",
        createdAt: expect.any(String),
        rawResponse: expect.any(Object),
        metadata: {
          va_numbers: ["1234567890"],
          payment_type: "VIRTUAL_ACCOUNT",
        },
      });
    });

    it("should create virtual account with reusability", async () => {
      const vaData: VirtualAccountData = {
        orderId: "order-123",
        amount: 10000,
        bankCode: "BCA",
        customerEmail: "test@example.com",
        customerName: "Test User",
        isReusable: true,
        isFixedAmount: true,
      };

      const result = await provider.createVirtualAccount(vaData);

      expect(result).toEqual({
        id: "payment-123",
        provider: "xendit",
        paymentId: "payment-123",
        type: "charge",
        status: result.status,
        amount: 10000,
        currency: "IDR",
        createdAt: expect.any(String),
        rawResponse: expect.any(Object),
        metadata: {
          va_numbers: ["1234567890"],
          payment_type: "VIRTUAL_ACCOUNT",
        },
      });
    });
  });

  describe("getPaymentStatus", () => {
    it("should get payment status", async () => {
      const result = await provider.getPaymentStatus("payment-123");

      expect(result).toEqual({
        provider: "xendit",
        orderId: "payment-123",
        amount: 10000,
        currency: "IDR",
        status: result.status,
        method: "VIRTUAL_ACCOUNT",
        description: "Test payment",
        customerEmail: "test@example.com",
        customerName: "Test User",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T01:00:00Z",
        expiresAt: "",
        metadata: {
          fraud_status: "paid",
          approval_code: "",
          payment_type: "VIRTUAL_ACCOUNT",
          transaction_time: "2023-01-01T00:00:00Z",
          gross_amount: 10000,
          va_numbers: ["1234567890"],
          permata_va_number: "",
          bill_key: "",
          biller_code: "",
        },
      });
    });
  });

  describe("cancelPayment", () => {
    it("should throw error for cancellation", async () => {
      await expect(provider.cancelPayment("payment-123")).rejects.toThrow(
        "sorry, xendit not support payment cancellation, please recreate new payment for this order",
      );
    });
  });
});
