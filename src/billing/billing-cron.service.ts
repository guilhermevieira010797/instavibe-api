import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionService } from './subscription.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly subscriptionService: SubscriptionService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: 'UTC' })
  async dailySubscriptionMaintenance(): Promise<void> {
    this.logger.log('Running daily subscription maintenance');
    const active = await this.subscriptionService.findAllActive();
    const now = new Date();

    for (const sub of active) {
      try {
        if (
          sub.pendingPlan &&
          sub.pendingPlanEffectiveAt &&
          sub.pendingPlanEffectiveAt.getTime() <= now.getTime()
        ) {
          await this.subscriptionService.applyPendingDowngrade(sub);
          continue;
        }

        if (sub.currentPeriodEnd.getTime() <= now.getTime()) {
          if (sub.billingCycle === 'annual') {
            await this.subscriptionService.expire(sub);
          } else {
            await this.subscriptionService.resetMonthlyCredits(sub);
          }
        }
      } catch (err) {
        this.logger.error(
          `Maintenance failed for subscription ${sub.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'UTC' })
  async dailyExpirationWarnings(): Promise<void> {
    this.logger.log('Running daily expiration warnings');
    const active = await this.subscriptionsRepository.find({
      where: { status: 'active', billingCycle: 'annual' },
    });
    const now = Date.now();
    const windowStart = now + 29 * ONE_DAY_MS;
    const windowEnd = now + 31 * ONE_DAY_MS;

    for (const sub of active) {
      try {
        const endMs = sub.currentPeriodEnd.getTime();
        if (endMs < windowStart || endMs > windowEnd) continue;
        if (sub.expirationWarningSentAt) continue;

        const user = await this.usersService.findById(sub.userId);
        if (!user) continue;

        await this.mailService.sendSubscriptionExpirationWarning(
          user.email,
          user.name,
          sub.plan,
          sub.currentPeriodEnd,
        );

        sub.expirationWarningSentAt = new Date();
        await this.subscriptionsRepository.save(sub);
      } catch (err) {
        this.logger.error(
          `Expiration warning failed for subscription ${sub.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      }
    }
  }
}
