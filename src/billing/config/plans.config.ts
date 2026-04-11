import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  PlanTier,
} from '../entities/subscription.entity';

export interface PlanDefinition {
  tier: PlanTier;
  monthlyCredits: number;
  priceBrlMonthly: number;
  priceBrlAnnual: number;
  stripePriceIdMonthly: string | null;
  pagarmePlanIdAnnual: string | null;
}

@Injectable()
export class PlansConfig {
  private readonly plans: Record<PlanTier, PlanDefinition>;
  readonly freeMonthlyCredits: number;

  constructor(private readonly config: ConfigService) {
    this.freeMonthlyCredits = this.int('PLAN_FREE_MONTHLY_CREDITS', 0);

    this.plans = {
      basic: {
        tier: 'basic',
        monthlyCredits: this.int('PLAN_BASIC_MONTHLY_CREDITS', 100),
        priceBrlMonthly: this.float('PLAN_BASIC_PRICE_BRL_MONTHLY', 29.9),
        priceBrlAnnual: this.float('PLAN_BASIC_PRICE_BRL_ANNUAL', 299),
        stripePriceIdMonthly:
          this.config.get<string>('PLAN_BASIC_STRIPE_PRICE_ID_MONTHLY') || null,
        pagarmePlanIdAnnual:
          this.config.get<string>('PLAN_BASIC_PAGARME_PLAN_ID_ANNUAL') || null,
      },
      standard: {
        tier: 'standard',
        monthlyCredits: this.int('PLAN_STANDARD_MONTHLY_CREDITS', 500),
        priceBrlMonthly: this.float('PLAN_STANDARD_PRICE_BRL_MONTHLY', 79.9),
        priceBrlAnnual: this.float('PLAN_STANDARD_PRICE_BRL_ANNUAL', 799),
        stripePriceIdMonthly:
          this.config.get<string>('PLAN_STANDARD_STRIPE_PRICE_ID_MONTHLY') ||
          null,
        pagarmePlanIdAnnual:
          this.config.get<string>('PLAN_STANDARD_PAGARME_PLAN_ID_ANNUAL') ||
          null,
      },
      premium: {
        tier: 'premium',
        monthlyCredits: this.int('PLAN_PREMIUM_MONTHLY_CREDITS', 2000),
        priceBrlMonthly: this.float('PLAN_PREMIUM_PRICE_BRL_MONTHLY', 199.9),
        priceBrlAnnual: this.float('PLAN_PREMIUM_PRICE_BRL_ANNUAL', 1999),
        stripePriceIdMonthly:
          this.config.get<string>('PLAN_PREMIUM_STRIPE_PRICE_ID_MONTHLY') ||
          null,
        pagarmePlanIdAnnual:
          this.config.get<string>('PLAN_PREMIUM_PAGARME_PLAN_ID_ANNUAL') ||
          null,
      },
    };
  }

  getPlan(tier: PlanTier): PlanDefinition {
    return this.plans[tier];
  }

  listPlans(): PlanDefinition[] {
    return Object.values(this.plans);
  }

  resolveProviderReference(
    tier: PlanTier,
    cycle: BillingCycle,
  ): { provider: 'stripe' | 'pagarme'; reference: string } {
    const plan = this.getPlan(tier);
    if (cycle === 'monthly') {
      if (!plan.stripePriceIdMonthly) {
        throw new Error(
          `Stripe price id not configured for plan ${tier} monthly`,
        );
      }
      return { provider: 'stripe', reference: plan.stripePriceIdMonthly };
    }
    if (!plan.pagarmePlanIdAnnual) {
      throw new Error(
        `Pagarme plan id not configured for plan ${tier} annual`,
      );
    }
    return { provider: 'pagarme', reference: plan.pagarmePlanIdAnnual };
  }

  private int(key: string, fallback: number): number {
    const v = this.config.get<string>(key);
    if (!v) return fallback;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  private float(key: string, fallback: number): number {
    const v = this.config.get<string>(key);
    if (!v) return fallback;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
}
