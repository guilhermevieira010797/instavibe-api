import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BillingCycle,
  PlanTier,
  Subscription,
} from './entities/subscription.entity';
import { PlansConfig } from './config/plans.config';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

const MONTHLY_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const ANNUAL_PERIOD_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly usersService: UsersService,
    private readonly plansConfig: PlansConfig,
  ) {}

  private periodEnd(start: Date, cycle: BillingCycle): Date {
    return new Date(
      start.getTime() + (cycle === 'annual' ? ANNUAL_PERIOD_MS : MONTHLY_PERIOD_MS),
    );
  }

  async findByUser(userId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({ where: { userId } });
  }

  async findByProviderSubscriptionId(
    providerSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: { providerSubscriptionId },
    });
  }

  async activateSubscription(params: {
    userId: string;
    plan: PlanTier;
    provider: 'stripe' | 'pagarme';
    providerSubscriptionId?: string;
    providerCustomerId?: string;
    billingCycle: BillingCycle;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  }): Promise<Subscription> {
    const existing = await this.findByUser(params.userId);
    const user = await this.usersService.findById(params.userId);
    if (!user) throw new NotFoundException('User not found');

    const planDef = this.plansConfig.getPlan(params.plan);
    const start = params.currentPeriodStart ?? new Date();
    const end =
      params.currentPeriodEnd ?? this.periodEnd(start, params.billingCycle);

    if (existing) {
      const prevPlanDef = this.plansConfig.getPlan(existing.plan);
      const isUpgrade = planDef.monthlyCredits > prevPlanDef.monthlyCredits;
      const isDowngrade = planDef.monthlyCredits < prevPlanDef.monthlyCredits;

      if (isUpgrade) {
        existing.plan = params.plan;
        existing.provider = params.provider;
        existing.providerSubscriptionId =
          params.providerSubscriptionId ?? existing.providerSubscriptionId;
        existing.providerCustomerId =
          params.providerCustomerId ?? existing.providerCustomerId;
        existing.billingCycle = params.billingCycle;
        existing.status = 'active';
        existing.currentPeriodStart = start;
        existing.currentPeriodEnd = end;
        existing.pendingPlan = null;
        existing.pendingPlanEffectiveAt = null;
        existing.expirationWarningSentAt = null;
        const saved = await this.subscriptionsRepository.save(existing);

        const delta = Math.max(
          0,
          planDef.monthlyCredits - prevPlanDef.monthlyCredits,
        );
        await this.usersService.setCredits(
          params.userId,
          user.credits + delta,
          user.extraCredits,
        );
        return saved;
      }

      if (isDowngrade) {
        existing.pendingPlan = params.plan;
        existing.pendingPlanEffectiveAt = existing.currentPeriodEnd;
        return this.subscriptionsRepository.save(existing);
      }

      existing.plan = params.plan;
      existing.provider = params.provider;
      existing.providerSubscriptionId =
        params.providerSubscriptionId ?? existing.providerSubscriptionId;
      existing.providerCustomerId =
        params.providerCustomerId ?? existing.providerCustomerId;
      existing.billingCycle = params.billingCycle;
      existing.status = 'active';
      existing.currentPeriodStart = start;
      existing.currentPeriodEnd = end;
      return this.subscriptionsRepository.save(existing);
    }

    const created = this.subscriptionsRepository.create({
      userId: params.userId,
      plan: params.plan,
      provider: params.provider,
      providerSubscriptionId: params.providerSubscriptionId ?? null,
      providerCustomerId: params.providerCustomerId ?? null,
      billingCycle: params.billingCycle,
      status: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: end,
      pendingPlan: null,
      pendingPlanEffectiveAt: null,
      expirationWarningSentAt: null,
    });
    const saved = await this.subscriptionsRepository.save(created);

    await this.usersService.setSubscription(params.userId, saved.id);
    await this.usersService.setCredits(params.userId, planDef.monthlyCredits);

    return saved;
  }

  async changePlan(
    user: User,
    plan: PlanTier,
    cycle: BillingCycle,
  ): Promise<Subscription> {
    const sub = await this.findByUser(user.id);
    if (!sub || sub.status !== 'active') {
      throw new BadRequestException(
        'No active subscription. Use checkout to create one.',
      );
    }
    if (sub.plan === plan && sub.billingCycle === cycle) {
      throw new BadRequestException('Already on this plan and cycle.');
    }
    return this.activateSubscription({
      userId: user.id,
      plan,
      provider: sub.provider,
      providerSubscriptionId: sub.providerSubscriptionId ?? undefined,
      providerCustomerId: sub.providerCustomerId ?? undefined,
      billingCycle: cycle,
    });
  }

  async cancelPendingChange(userId: string): Promise<Subscription> {
    const sub = await this.findByUser(userId);
    if (!sub) throw new NotFoundException('Subscription not found');
    if (!sub.pendingPlan || !sub.pendingPlanEffectiveAt) {
      throw new BadRequestException('No pending change to cancel');
    }
    if (sub.pendingPlanEffectiveAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Pending change is already being applied and cannot be canceled',
      );
    }
    sub.pendingPlan = null;
    sub.pendingPlanEffectiveAt = null;
    return this.subscriptionsRepository.save(sub);
  }

  async markCanceled(providerSubscriptionId: string): Promise<void> {
    const sub = await this.findByProviderSubscriptionId(
      providerSubscriptionId,
    );
    if (!sub) return;
    sub.status = 'canceled';
    await this.subscriptionsRepository.save(sub);
  }

  async applyPendingDowngrade(sub: Subscription): Promise<void> {
    if (!sub.pendingPlan) return;
    const newPlanDef = this.plansConfig.getPlan(sub.pendingPlan);
    sub.plan = sub.pendingPlan;
    sub.pendingPlan = null;
    sub.pendingPlanEffectiveAt = null;
    sub.currentPeriodStart = new Date();
    sub.currentPeriodEnd = this.periodEnd(
      sub.currentPeriodStart,
      sub.billingCycle,
    );
    await this.subscriptionsRepository.save(sub);
    await this.usersService.setCredits(sub.userId, newPlanDef.monthlyCredits);
  }

  async resetMonthlyCredits(sub: Subscription): Promise<void> {
    const planDef = this.plansConfig.getPlan(sub.plan);
    sub.currentPeriodStart = new Date();
    sub.currentPeriodEnd = this.periodEnd(
      sub.currentPeriodStart,
      sub.billingCycle,
    );
    await this.subscriptionsRepository.save(sub);
    await this.usersService.setCredits(sub.userId, planDef.monthlyCredits);
  }

  async expire(sub: Subscription): Promise<void> {
    sub.status = 'expired';
    await this.subscriptionsRepository.save(sub);
    await this.usersService.setSubscription(sub.userId, null);
    await this.usersService.setCredits(sub.userId, 0);
  }

  async findAllActive(): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({ where: { status: 'active' } });
  }
}
