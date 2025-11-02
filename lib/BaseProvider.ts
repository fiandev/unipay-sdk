import type { BaseProviderInterface, ConfigProviderParams } from "../types";

export default class BaseProvider implements BaseProviderInterface {
  config: ConfigProviderParams;

  constructor(config: ConfigProviderParams) {
    this.config = config;
  }

  generateSignature(data: Record<string, any>): string {
    return JSON.stringify(data);
  }

  log(message: string): void {}
}
