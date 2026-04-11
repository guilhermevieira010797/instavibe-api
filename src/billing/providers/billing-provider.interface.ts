import {
  BillingCycle,
  PlanTier,
} from '../entities/subscription.entity';
import { CreditPackageDefinition } from '../config/credit-packages.config';
import { PlanDefinition } from '../config/plans.config';

export type BillingEventType =
  | 'subscription.activated'
  | 'subscription.canceled'
  | 'subscription.renewed'
  | 'credit_purchase.completed'
  | 'unknown';

export interface BillingEvent {
  type: BillingEventType;
  providerEventId: string;
  providerSessionId?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  userId?: string;
  plan?: PlanTier;
  billingCycle?: BillingCycle;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  creditPackageId?: string;
}

export interface BillingProvider {
  readonly name: 'stripe' | 'pagarme';

  createSubscriptionCheckout(params: {
    userId: string;
    email: string;
    plan: PlanDefinition;
    cycle: BillingCycle;
  }): Promise<{ url: string; sessionId: string }>;

  createCreditPackageCheckout(params: {
    userId: string;
    email: string;
    pkg: CreditPackageDefinition;
  }): Promise<{ url: string; sessionId: string }>;

  parseWebhook(rawBody: Buffer, signature: string): Promise<BillingEvent>;

  cancelSubscription(providerSubscriptionId: string): Promise<void>;
}

export const BILLING_PROVIDERS = Symbol('BILLING_PROVIDERS');
