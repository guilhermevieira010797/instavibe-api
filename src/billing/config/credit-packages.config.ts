import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CreditPackageDefinition {
  id: string;
  label: string;
  credits: number;
  priceBrl: number;
  stripePriceId: string | null;
}

@Injectable()
export class CreditPackagesConfig {
  private readonly packages: Map<string, CreditPackageDefinition> = new Map();

  constructor(private readonly config: ConfigService) {
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
      const priceBrl = parseFloat(
        config.get<string>(`CREDIT_PACKAGE_${upper}_PRICE_BRL`) ?? '0',
      );
      const stripePriceId =
        config.get<string>(`CREDIT_PACKAGE_${upper}_STRIPE_PRICE_ID`) || null;

      this.packages.set(id, {
        id,
        label,
        credits: Number.isFinite(credits) ? credits : 0,
        priceBrl: Number.isFinite(priceBrl) ? priceBrl : 0,
        stripePriceId,
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
