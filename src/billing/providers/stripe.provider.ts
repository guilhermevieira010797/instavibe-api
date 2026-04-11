import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type {
  BillingEvent,
  BillingProvider,
} from './billing-provider.interface';
import type { PlanDefinition } from '../config/plans.config';
import type { CreditPackageDefinition } from '../config/credit-packages.config';
import type {
  BillingCycle,
  PlanTier,
} from '../entities/subscription.entity';

type StripeClient = Stripe.Stripe;

@Injectable()
export class StripeProvider implements BillingProvider {
  readonly name = 'stripe' as const;
  private readonly logger = new Logger(StripeProvider.name);
  private readonly client: StripeClient;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    this.client = new Stripe(key) as StripeClient;
  }

  async createSubscriptionCheckout(params: {
    userId: string;
    email: string;
    plan: PlanDefinition;
    cycle: BillingCycle;
  }): Promise<{ url: string; sessionId: string }> {
    if (params.cycle !== 'monthly') {
      throw new Error('Stripe only handles monthly subscriptions in this app');
    }
    if (!params.plan.stripePriceIdMonthly) {
      throw new Error(
        `Stripe price id missing for plan ${params.plan.tier} monthly`,
      );
    }
    const session = await this.client.checkout.sessions.create({
      mode: 'subscription',
      customer_email: params.email,
      line_items: [{ price: params.plan.stripePriceIdMonthly, quantity: 1 }],
      success_url:
        this.config.get<string>('STRIPE_SUCCESS_URL') ??
        'http://localhost:3000/billing/success',
      cancel_url:
        this.config.get<string>('STRIPE_CANCEL_URL') ??
        'http://localhost:3000/billing/cancel',
      metadata: {
        userId: params.userId,
        plan: params.plan.tier,
        cycle: 'monthly',
        kind: 'subscription',
      },
      subscription_data: {
        metadata: {
          userId: params.userId,
          plan: params.plan.tier,
          cycle: 'monthly',
        },
      },
    });

    return { url: session.url ?? '', sessionId: session.id };
  }

  async createCreditPackageCheckout(params: {
    userId: string;
    email: string;
    pkg: CreditPackageDefinition;
  }): Promise<{ url: string; sessionId: string }> {
    if (!params.pkg.stripePriceId) {
      throw new Error(
        `Stripe price id missing for credit package ${params.pkg.id}`,
      );
    }
    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      customer_email: params.email,
      line_items: [{ price: params.pkg.stripePriceId, quantity: 1 }],
      success_url:
        this.config.get<string>('STRIPE_SUCCESS_URL') ??
        'http://localhost:3000/billing/success',
      cancel_url:
        this.config.get<string>('STRIPE_CANCEL_URL') ??
        'http://localhost:3000/billing/cancel',
      metadata: {
        userId: params.userId,
        packageId: params.pkg.id,
        credits: params.pkg.credits.toString(),
        kind: 'credit_package',
      },
    });

    return { url: session.url ?? '', sessionId: session.id };
  }

  async parseWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<BillingEvent> {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: Awaited<
      ReturnType<StripeClient['webhooks']['constructEvent']>
    >;
    try {
      event = this.client.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      this.logger.error(
        `Stripe webhook signature verification failed: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
      throw err;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata ?? {};
      const kind = metadata.kind;

      if (kind === 'subscription') {
        return {
          type: 'subscription.activated',
          providerEventId: event.id,
          providerSessionId: session.id,
          providerSubscriptionId:
            typeof session.subscription === 'string'
              ? session.subscription
              : (session.subscription?.id ?? undefined),
          providerCustomerId:
            typeof session.customer === 'string'
              ? session.customer
              : (session.customer?.id ?? undefined),
          userId: metadata.userId,
          plan: metadata.plan as PlanTier,
          billingCycle: (metadata.cycle as BillingCycle) ?? 'monthly',
        };
      }

      if (kind === 'credit_package') {
        return {
          type: 'credit_purchase.completed',
          providerEventId: event.id,
          providerSessionId: session.id,
          userId: metadata.userId,
          creditPackageId: metadata.packageId,
        };
      }
    }

    if (
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub = event.data.object;
      const metadata = sub.metadata ?? {};
      const isCanceled = sub.status === 'canceled' || event.type === 'customer.subscription.deleted';
      return {
        type: isCanceled ? 'subscription.canceled' : 'subscription.renewed',
        providerEventId: event.id,
        providerSubscriptionId: sub.id,
        providerCustomerId:
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        userId: metadata.userId,
        plan: metadata.plan as PlanTier | undefined,
        billingCycle: 'monthly',
        currentPeriodStart: sub.items?.data?.[0]?.current_period_start
          ? new Date(sub.items.data[0].current_period_start * 1000)
          : undefined,
        currentPeriodEnd: sub.items?.data?.[0]?.current_period_end
          ? new Date(sub.items.data[0].current_period_end * 1000)
          : undefined,
      };
    }

    return { type: 'unknown', providerEventId: event.id };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.client.subscriptions.cancel(providerSubscriptionId);
  }
}
