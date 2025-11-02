import { describe, it, expect, beforeEach, vi } from "vitest";
import BaseProvider from "../../lib/BaseProvider";
import type { ConfigProviderParams } from "../../types";

// Create a test implementation of BaseProvider
class TestProvider extends BaseProvider {
  protected override async initializeClient(): Promise<any> {
    return { test: "client" };
  }

  async createPayment(data: any): Promise<any> {
    return this.standardizePaymentResponse("test", data);
  }

  async createVirtualAccount(data: any): Promise<any> {
    return this.standardizeTransactionResponse("test", data, "charge");
  }

  async getPaymentStatus(referenceId: string): Promise<any> {
    return this.standardizePaymentResponse("test", { orderId: referenceId });
  }

  async cancelPayment(referenceId: string): Promise<any> {
    return this.standardizePaymentResponse("test", {
      orderId: referenceId,
      status: "cancelled",
    });
  }

  // Expose protected methods for testing
  public testHandleError(error: any, operation: string): never {
    return this.handleError(error, operation);
  }

  public testStandardizePaymentResponse(
    provider: string,
    data: any,
    metadata?: Record<string, any>,
  ) {
    return this.standardizePaymentResponse(provider, data, metadata);
  }

  public testStandardizeTransactionResponse(
    provider: string,
    data: any,
    type: any,
    metadata?: Record<string, any>,
  ) {
    return this.standardizeTransactionResponse(provider, data, type, metadata);
  }

  public testMapStatus(providerStatus?: string) {
    return this.mapStatus(providerStatus);
  }

  public testValidateConfig(requiredFields: string[]) {
    return this.validateConfig(requiredFields);
  }
}

describe("BaseProvider", () => {
  let provider: TestProvider;
  let mockConfig: ConfigProviderParams;

  beforeEach(() => {
    mockConfig = {
      client_id: "test_client_id",
      secret_key: "test_secret_key",
      is_production: false,
    };
    provider = new TestProvider(mockConfig);
  });

  describe("constructor", () => {
    it("should initialize with config", () => {
      expect(provider.config).toEqual(mockConfig);
    });
  });

  describe("initializeClient", () => {
    it("should throw error if not implemented", async () => {
      class IncompleteProvider extends BaseProvider {}
      const incompleteProvider = new IncompleteProvider(mockConfig);

      await expect(incompleteProvider.getClient()).rejects.toThrow(
        "initializeClient() must be implemented by provider",
      );
    });

    it("should initialize client successfully", async () => {
      const client = await provider.getClient();
      expect(client).toEqual({ test: "client" });
    });

    it("should reuse existing client", async () => {
      const client1 = await provider.getClient();
      const client2 = await provider.getClient();
      expect(client1).toBe(client2);
    });
  });

  describe("generateSignature", () => {
    it("should generate JSON signature by default", () => {
      const data = { test: "data" };
      const signature = provider.generateSignature(data);
      expect(signature).toBe(JSON.stringify(data));
    });
  });

  describe("log", () => {
    it("should not log when debug is disabled", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      provider.log("test message");
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should log when debug is enabled", () => {
      const debugConfig = { ...mockConfig, debug: true };
      const debugProvider = new TestProvider(debugConfig);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      debugProvider.log("test message", { context: "data" });

      expect(consoleSpy).toHaveBeenCalledWith("[TestProvider] test message", {
        context: "data",
      });
      consoleSpy.mockRestore();
    });

    it("should log when enable_logging is enabled", () => {
      const debugConfig = { ...mockConfig, enable_logging: true };
      const debugProvider = new TestProvider(debugConfig);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      debugProvider.log("test message");

      expect(consoleSpy).toHaveBeenCalledWith(
        "[TestProvider] test message",
        "",
      );
      consoleSpy.mockRestore();
    });
  });

  describe("handleError", () => {
    it("should rethrow MidtransError with custom message", () => {
      const midtransError = new Error("Original error") as any;
      midtransError.name = "MidtransError";

      expect(() =>
        provider.testHandleError(midtransError, "testOperation"),
      ).toThrow("Provider error in testOperation: Original error");
    });

    it("should rethrow other errors as-is", () => {
      const regularError = new Error("Regular error");

      expect(() =>
        provider.testHandleError(regularError, "testOperation"),
      ).toThrow("Regular error");
    });
  });

  describe("standardizePaymentResponse", () => {
    it("should standardize payment response correctly", () => {
      const data = {
        orderId: "order123",
        amount: 10000,
        currency: "IDR",
        status: "settlement",
        method: "credit_card",
        description: "Test payment",
        customerEmail: "test@example.com",
        customerName: "Test User",
      };

      const result = provider.testStandardizePaymentResponse("test", data, {
        token: "abc123",
      });

      expect(result).toEqual({
        provider: "test",
        orderId: "order123",
        amount: 10000,
        currency: "IDR",
        status: "paid",
        method: "credit_card",
        description: "Test payment",
        customerEmail: "test@example.com",
        customerName: "Test User",
        createdAt: expect.any(String),
        updatedAt: undefined,
        expiresAt: undefined,
        metadata: { token: "abc123" },
      });
    });
  });

  describe("standardizeTransactionResponse", () => {
    it("should standardize transaction response correctly", () => {
      const data = {
        id: "txn123",
        paymentId: "payment123",
        status: "settlement",
        amount: 10000,
        currency: "IDR",
        createdAt: "2023-01-01T00:00:00Z",
      };

      const result = provider.testStandardizeTransactionResponse(
        "test",
        data,
        "charge",
        { va: "123456" },
      );

      expect(result).toEqual({
        id: "txn123",
        provider: "test",
        paymentId: "payment123",
        type: "charge",
        status: "paid",
        amount: 10000,
        currency: "IDR",
        createdAt: "2023-01-01T00:00:00Z",
        rawResponse: data,
        metadata: { va: "123456" },
      });
    });
  });

  describe("mapStatus", () => {
    it("should map Midtrans statuses correctly", () => {
      expect(provider.testMapStatus("settlement")).toBe("paid");
      expect(provider.testMapStatus("capture")).toBe("paid");
      expect(provider.testMapStatus("success")).toBe("paid");
      expect(provider.testMapStatus("paid")).toBe("paid");
      expect(provider.testMapStatus("pending")).toBe("pending");
      expect(provider.testMapStatus("authorize")).toBe("pending");
      expect(provider.testMapStatus("deny")).toBe("failed");
      expect(provider.testMapStatus("failed")).toBe("failed");
      expect(provider.testMapStatus("error")).toBe("failed");
      expect(provider.testMapStatus("expire")).toBe("expired");
      expect(provider.testMapStatus("expired")).toBe("expired");
      expect(provider.testMapStatus("refund")).toBe("refunded");
      expect(provider.testMapStatus("partial_refund")).toBe("refunded");
      expect(provider.testMapStatus("cancel")).toBe("cancelled");
      expect(provider.testMapStatus("cancelled")).toBe("cancelled");
      expect(provider.testMapStatus("unknown")).toBe("pending");
      expect(provider.testMapStatus(undefined)).toBe("pending");
    });
  });

  describe("validateConfig", () => {
    it("should not throw when all required fields are present", () => {
      expect(() =>
        provider.testValidateConfig(["client_id", "secret_key"]),
      ).not.toThrow();
    });

    it("should throw when required fields are missing", () => {
      expect(() => provider.testValidateConfig(["missing_field"])).toThrow(
        "Missing required config fields: missing_field",
      );
    });

    it("should throw when multiple required fields are missing", () => {
      expect(() =>
        provider.testValidateConfig(["missing1", "missing2"]),
      ).toThrow("Missing required config fields: missing1, missing2");
    });
  });
});
