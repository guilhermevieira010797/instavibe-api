import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  BillingEvent,
  BillingProvider,
} from './billing-provider.interface';
import { PlanDefinition } from '../config/plans.config';
import { CreditPackageDefinition } from '../config/credit-packages.config';
import {
  BillingCycle,
  PlanTier,
} from '../entities/subscription.entity';

interface PagarmeCheckoutResponse {
  id: string;
  checkout_url?: string;
  url?: string;
}

interface PagarmeWebhookPayload {
  id?: string;
  type?: string;
  data?: {
    id?: string;
    customer?: { id?: string; email?: string };
    subscription?: {
      id?: string;
      status?: string;
      metadata?: Record<string, string>;
      current_period_start?: string;
      current_period_end?: string;
    };
    metadata?: Record<string, string>;
    status?: string;
  };
}

@Injectable()
export class PagarmeProvider implements BillingProvider {
  readonly name = 'pagarme' as const;
  private readonly logger = new Logger(PagarmeProvider.name);
  private readonly baseUrl = 'https://api.pagar.me/core/v5';

  constructor(private readonly config: ConfigService) {}

  private get authHeader(): string {
    const key = this.config.get<string>('PAGARME_API_KEY') ?? '';
    return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
  }

  async createSubscriptionCheckout(params: {
    userId: string;
    email: string;
    plan: PlanDefinition;
    cycle: BillingCycle;
  }): Promise<{ url: string; sessionId: string }> {
    if (params.cycle !== 'annual') {
      throw new Error('Pagarme only handles annual subscriptions in this app');
    }
    if (!params.plan.pagarmePlanIdAnnual) {
      throw new Error(
        `Pagarme plan id missing for plan ${params.plan.tier} annual`,
      );
    }

    const amountCents = Math.round(params.plan.priceBrlAnnual * 100);

    const body = {
      items: [
        {
          amount: amountCents,
          description: `InstaVibe ${params.plan.tier} (anual)`,
          quantity: 1,
        },
      ],
      customer: { email: params.email },
      payment_settings: {
        accepted_payment_methods: ['credit_card'],
        credit_card_settings: {
          operation_type: 'auth_and_capture',
          installments: [{ number: 12, total: amountCents }],
        },
      },
      metadata: {
        userId: params.userId,
        plan: params.plan.tier,
        cycle: 'annual',
        planReference: params.plan.pagarmePlanIdAnnual,
        kind: 'subscription',
      },
      success_url:
        this.config.get<string>('PAGARME_SUCCESS_URL') ??
        'http://localhost:3000/billing/success',
      cancel_url:
        this.config.get<string>('PAGARME_CANCEL_URL') ??
        'http://localhost:3000/billing/cancel',
    };

    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pagarme checkout failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as PagarmeCheckoutResponse;
    return {
      url: data.checkout_url ?? data.url ?? '',
      sessionId: data.id,
    };
  }

  createCreditPackageCheckout(): Promise<{ url: string; sessionId: string }> {
    return Promise.reject(
      new Error('Credit packages are only supported via Stripe.'),
    );
  }

  parseWebhook(rawBody: Buffer, signature: string): Promise<BillingEvent> {
    const secret = this.config.get<string>('PAGARME_WEBHOOK_SECRET') ?? '';
    if (secret) {
      const expected = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      const sigBuf = Buffer.from(signature ?? '', 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      if (
        sigBuf.length !== expBuf.length ||
        !timingSafeEqual(sigBuf, expBuf)
      ) {
        throw new Error('Pagarme webhook signature verification failed');
      }
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as PagarmeWebhookPayload;
    const eventType = payload.type ?? '';
    const data = payload.data ?? {};
    const metadata = data.subscription?.metadata ?? data.metadata ?? {};

    const base = {
      providerEventId: payload.id ?? `pagarme-${Date.now()}`,
      providerSessionId: data.id,
      providerSubscriptionId: data.subscription?.id ?? data.id,
      providerCustomerId: data.customer?.id,
      userId: metadata.userId,
      plan: metadata.plan as PlanTier | undefined,
      billingCycle: 'annual' as BillingCycle,
    };

    if (eventType.includes('paid') || eventType.includes('active')) {
      const start = data.subscription?.current_period_start
        ? new Date(data.subscription.current_period_start)
        : new Date();
      const end = data.subscription?.current_period_end
        ? new Date(data.subscription.current_period_end)
        : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
      return Promise.resolve({
        type: 'subscription.activated',
        ...base,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      });
    }
    if (eventType.includes('canceled') || eventType.includes('expired')) {
      return Promise.resolve({ type: 'subscription.canceled', ...base });
    }

    this.logger.log(`Unhandled Pagarme event: ${eventType}`);
    return Promise.resolve({
      type: 'unknown',
      providerEventId: base.providerEventId,
    });
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/subscriptions/${providerSubscriptionId}`,
      {
        method: 'DELETE',
        headers: { Authorization: this.authHeader },
      },
    );
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Pagarme cancel failed: ${res.status} ${text}`);
    }
  }
}
