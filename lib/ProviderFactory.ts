import type { ConfigProviderParams, ProviderInterface } from "../types";
import MidtransProvider from "../providers/MidtransProvider";

export type ProviderType = "midtrans" | "doku" | "xendit" | string;

export interface ProviderRegistration {
  providerClass: new (config: ConfigProviderParams) => ProviderInterface;
  defaultConfig?: Partial<ConfigProviderParams>;
}

/**
 * Provider Factory for managing and creating payment provider instances
 */
export class ProviderFactory {
  private static providers: Map<ProviderType, ProviderRegistration> = new Map();

  /**
   * Register a new provider type
   */
  static register(
    type: ProviderType,
    providerClass: new (config: ConfigProviderParams) => ProviderInterface,
    defaultConfig?: Partial<ConfigProviderParams>,
  ): void {
    this.providers.set(type, {
      providerClass,
      defaultConfig,
    });
  }

  /**
   * Create a provider instance
   */
  static create(
    type: ProviderType,
    config: ConfigProviderParams,
  ): ProviderInterface {
    const registration = this.providers.get(type);

    if (!registration) {
      throw new Error(
        `Provider type '${type}' is not registered. Available providers: ${Array.from(this.providers.keys()).join(", ")}`,
      );
    }

    // Merge default config with provided config
    const finalConfig = { ...registration.defaultConfig, ...config };

    return new registration.providerClass(finalConfig);
  }

  /**
   * Get all registered provider types
   */
  static getRegisteredProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider type is registered
   */
  static isRegistered(type: ProviderType): boolean {
    return this.providers.has(type);
  }

  /**
   * Unregister a provider type
   */
  static unregister(type: ProviderType): boolean {
    return this.providers.delete(type);
  }
}

// Register built-in providers
ProviderFactory.register("midtrans", MidtransProvider);

export default ProviderFactory;
