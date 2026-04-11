import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CreditPackageDefinition {
  id: string;
  label: string;
  credits: number;
  priceBrl: number;
}

@Injectable()
export class CreditPackagesConfig {
  private readonly packages: Map<string, CreditPackageDefinition> = new Map();

  readonly creditPriceBrl: number;

  constructor(private readonly config: ConfigService) {
    this.creditPriceBrl = parseFloat(
      config.get<string>('CREDIT_PRICE_BRL') ?? '0.05',
    );

    const ids = (config.get<string>('CREDIT_PACKAGE_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const id of ids) {
      const upper = id.toUpperCase();
      const label = config.get<string>(`CREDIT_PACKAGE_${upper}_LABEL`) ?? id;
      const credits = parseInt(
        config.get<string>(`CREDIT_PACKAGE_${upper}_CREDITS`) ?? '0',
        10,
      );
      const safeCredits = Number.isFinite(credits) ? credits : 0;

      this.packages.set(id, {
        id,
        label,
        credits: safeCredits,
        priceBrl: parseFloat((safeCredits * this.creditPriceBrl).toFixed(2)),
      });
    }
  }

  get(id: string): CreditPackageDefinition | undefined {
    return this.packages.get(id);
  }

  getOrThrow(id: string): CreditPackageDefinition {
    const pkg = this.packages.get(id);
    if (!pkg) throw new Error(`Credit package ${id} not configured`);
    return pkg;
  }

  list(): CreditPackageDefinition[] {
    return Array.from(this.packages.values());
  }
}
