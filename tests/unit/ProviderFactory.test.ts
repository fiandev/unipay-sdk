import { describe, it, expect, beforeEach } from "vitest";
import { ProviderFactory } from "../../lib/ProviderFactory";
import type { ProviderInterface, ConfigProviderParams } from "../../types";

// Mock provider for testing
class MockProvider implements ProviderInterface {
  public config: ConfigProviderParams;

  constructor(config: ConfigProviderParams) {
    this.config = config;
  }

  async getClient(): Promise<any> {
    return { mock: "client" };
  }

  async createPayment(data: any): Promise<any> {
    return { provider: "mock", ...data };
  }

  async createVirtualAccount(data: any): Promise<any> {
    return { provider: "mock", type: "va", ...data };
  }

  async getPaymentStatus(referenceId: string): Promise<any> {
    return { provider: "mock", referenceId };
  }

  async cancelPayment(referenceId: string): Promise<any> {
    return { provider: "mock", referenceId, cancelled: true };
  }
}

describe("ProviderFactory", () => {
  beforeEach(() => {
    // Clear any custom registrations before each test
    const registeredProviders = ProviderFactory.getRegisteredProviders();
    registeredProviders.forEach((provider) => {
      if (provider !== "midtrans") {
        ProviderFactory.unregister(provider);
      }
    });
  });

  describe("register", () => {
    it("should register a new provider", () => {
      ProviderFactory.register("mock", MockProvider);
      expect(ProviderFactory.isRegistered("mock")).toBe(true);
    });

    it("should register with default config", () => {
      const defaultConfig = { is_production: false };
      ProviderFactory.register("mock", MockProvider, defaultConfig);

      expect(ProviderFactory.isRegistered("mock")).toBe(true);
    });

    it("should override existing provider", () => {
      ProviderFactory.register("mock", MockProvider);
      ProviderFactory.register("mock", MockProvider);
      expect(ProviderFactory.isRegistered("mock")).toBe(true);
    });
  });

  describe("create", () => {
    beforeEach(() => {
      ProviderFactory.register("mock", MockProvider, { is_production: false });
    });

    it("should create provider instance", () => {
      const config = {
        client_id: "test_client",
        secret_key: "test_secret",
        is_production: true,
      };

      const provider = ProviderFactory.create("mock", config);

      expect(provider).toBeInstanceOf(MockProvider);
      expect((provider as any).config).toEqual({
        is_production: true, // provided config overrides default
        client_id: "test_client",
        secret_key: "test_secret",
      });
    });

    it("should merge default config with provided config", () => {
      ProviderFactory.register("mock", MockProvider, {
        is_production: false,
        timeout: 5000,
      });

      const config = {
        client_id: "test_client",
        secret_key: "test_secret",
        is_production: true,
      };

      const provider = ProviderFactory.create("mock", config);

      expect((provider as any).config).toEqual({
        is_production: true, // overridden
        timeout: 5000, // from default
        client_id: "test_client",
        secret_key: "test_secret",
      });
    });

    it("should throw error for unregistered provider", () => {
      const config = {
        client_id: "test_client",
        secret_key: "test_secret",
        is_production: false,
      };

      expect(() => ProviderFactory.create("unknown", config)).toThrow(
        "Provider type 'unknown' is not registered. Available providers: midtrans",
      );
    });

    it("should show all available providers in error message", () => {
      ProviderFactory.register("test1", MockProvider);
      ProviderFactory.register("test2", MockProvider);

      expect(() =>
        ProviderFactory.create("unknown", {
          client_id: "test",
          secret_key: "test",
          is_production: false,
        }),
      ).toThrow(/Available providers: midtrans, mock, test1, test2/);
    });
  });

  describe("getRegisteredProviders", () => {
    it("should return all registered providers", () => {
      ProviderFactory.register("mock1", MockProvider);
      ProviderFactory.register("mock2", MockProvider);

      const providers = ProviderFactory.getRegisteredProviders();

      expect(providers).toContain("midtrans");
      expect(providers).toContain("mock1");
      expect(providers).toContain("mock2");
      expect(providers.length).toBe(3);
    });
  });

  describe("isRegistered", () => {
    it("should return true for registered provider", () => {
      ProviderFactory.register("mock", MockProvider);
      expect(ProviderFactory.isRegistered("mock")).toBe(true);
    });

    it("should return false for unregistered provider", () => {
      expect(ProviderFactory.isRegistered("unknown")).toBe(false);
    });
  });

  describe("unregister", () => {
    it("should unregister provider", () => {
      ProviderFactory.register("mock", MockProvider);
      expect(ProviderFactory.isRegistered("mock")).toBe(true);

      const result = ProviderFactory.unregister("mock");
      expect(result).toBe(true);
      expect(ProviderFactory.isRegistered("mock")).toBe(false);
    });

    it("should return false for unregistered provider", () => {
      const result = ProviderFactory.unregister("unknown");
      expect(result).toBe(false);
    });

    it("should not unregister built-in midtrans provider", () => {
      const result = ProviderFactory.unregister("midtrans");
      expect(result).toBe(true);
      expect(ProviderFactory.isRegistered("midtrans")).toBe(false);
    });
  });

  describe("built-in providers", () => {
    it("should have midtrans registered by default", () => {
      // Re-register midtrans if it was cleared
      ProviderFactory.register("midtrans", MockProvider);
      expect(ProviderFactory.isRegistered("midtrans")).toBe(true);
      expect(ProviderFactory.getRegisteredProviders()).toContain("midtrans");
    });
  });
});
