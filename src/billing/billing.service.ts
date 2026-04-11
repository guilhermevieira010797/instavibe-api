import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditPurchase } from './entities/credit-purchase.entity';
import {
  BillingCycle,
  PlanTier,
} from './entities/subscription.entity';
import { PlansConfig } from './config/plans.config';
import { CreditPackagesConfig } from './config/credit-packages.config';
import { StripeProvider } from './providers/stripe.provider';
import { PagarmeProvider } from './providers/pagarme.provider';
import {
  BillingEvent,
  BillingProvider,
} from './providers/billing-provider.interface';
import { SubscriptionService } from './subscription.service';
import { CreditLedgerService } from './credit-ledger.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(CreditPurchase)
    private readonly creditPurchasesRepository: Repository<CreditPurchase>,
    private readonly plansConfig: PlansConfig,
    private readonly creditPackagesConfig: CreditPackagesConfig,
    private readonly stripeProvider: StripeProvider,
    private readonly pagarmeProvider: PagarmeProvider,
    private readonly subscriptionService: SubscriptionService,
    private readonly creditLedger: CreditLedgerService,
    private readonly usersService: UsersService,
  ) {}

  private pickProvider(cycle: BillingCycle): BillingProvider {
    return cycle === 'monthly' ? this.stripeProvider : this.pagarmeProvider;
  }

  listPlans() {
    return this.plansConfig.listPlans();
  }

  listCreditPackages() {
    return this.creditPackagesConfig.list();
  }

  getMine(user: User) {
    return {
      plan: user.subscription?.status === 'active'
        ? user.subscription.plan
        : 'free',
      credits: user.credits,
      extraCredits: user.extraCredits,
      subscription: user.subscription ?? null,
    };
  }

  async createSubscriptionCheckout(
    user: User,
    plan: PlanTier,
    cycle: BillingCycle,
  ): Promise<{ url: string }> {
    const planDef = this.plansConfig.getPlan(plan);
    const provider = this.pickProvider(cycle);
    const { url } = await provider.createSubscriptionCheckout({
      userId: user.id,
      email: user.email,
      plan: planDef,
      cycle,
    });
    if (!url) throw new BadRequestException('Failed to create checkout');
    return { url };
  }

  async createCreditPackageCheckout(
    user: User,
    packageId: string,
  ): Promise<{ url: string }> {
    const pkg = this.creditPackagesConfig.get(packageId);
    if (!pkg) throw new NotFoundException('Credit package not found');

    const { url, sessionId } = await this.stripeProvider.createCreditPackageCheckout({
      userId: user.id,
      email: user.email,
      pkg,
    });
    if (!url) throw new BadRequestException('Failed to create checkout');

    await this.creditPurchasesRepository.save(
      this.creditPurchasesRepository.create({
        userId: user.id,
        packageId: pkg.id,
        creditsAmount: pkg.credits,
        provider: 'stripe',
        providerSessionId: sessionId,
        status: 'pending',
      }),
    );

    return { url };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const event = await this.stripeProvider.parseWebhook(rawBody, signature);
    await this.processEvent(event, 'stripe');
  }

  async handlePagarmeWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<void> {
    const event = await this.pagarmeProvider.parseWebhook(rawBody, signature);
    await this.processEvent(event, 'pagarme');
  }

  private async processEvent(
    event: BillingEvent,
    provider: 'stripe' | 'pagarme',
  ): Promise<void> {
    this.logger.log(`Processing ${provider} event: ${event.type}`);

    if (event.type === 'subscription.activated') {
      if (!event.userId || !event.plan || !event.billingCycle) {
        this.logger.warn('subscription.activated missing metadata; skipping');
        return;
      }
      await this.subscriptionService.activateSubscription({
        userId: event.userId,
        plan: event.plan,
        provider,
        providerSubscriptionId: event.providerSubscriptionId,
        providerCustomerId: event.providerCustomerId,
        billingCycle: event.billingCycle,
        currentPeriodStart: event.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd,
      });
      return;
    }

    if (event.type === 'subscription.canceled') {
      if (event.providerSubscriptionId) {
        await this.subscriptionService.markCanceled(
          event.providerSubscriptionId,
        );
      }
      return;
    }

    if (event.type === 'credit_purchase.completed') {
      if (!event.providerSessionId) return;
      const purchase = await this.creditPurchasesRepository.findOne({
        where: { providerSessionId: event.providerSessionId },
      });
      if (!purchase) {
        this.logger.warn(
          `Credit purchase not found for session ${event.providerSessionId}`,
        );
        return;
      }
      if (purchase.status === 'completed') return;
      purchase.status = 'completed';
      await this.creditPurchasesRepository.save(purchase);
      await this.creditLedger.addExtra(purchase.userId, purchase.creditsAmount);
      return;
    }

    this.logger.log(`Event type ${event.type} ignored`);
  }

  async cancelSubscription(user: User): Promise<void> {
    const sub = await this.subscriptionService.findByUser(user.id);
    if (!sub || sub.status !== 'active') {
      throw new BadRequestException('No active subscription');
    }
    const provider =
      sub.provider === 'stripe' ? this.stripeProvider : this.pagarmeProvider;
    if (sub.providerSubscriptionId) {
      await provider.cancelSubscription(sub.providerSubscriptionId);
    }
    await this.subscriptionService.markCanceled(
      sub.providerSubscriptionId ?? sub.id,
    );
  }
}
