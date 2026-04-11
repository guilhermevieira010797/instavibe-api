import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { CreditPurchase } from './entities/credit-purchase.entity';
import { User } from '../users/user.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPolicyService } from './subscription-policy.service';
import { CreditLedgerService } from './credit-ledger.service';
import { BillingCronService } from './billing-cron.service';
import { StripeProvider } from './providers/stripe.provider';
import { PagarmeProvider } from './providers/pagarme.provider';
import { PlansConfig } from './config/plans.config';
import { CreditPackagesConfig } from './config/credit-packages.config';
import { AiCategoriesConfig } from './config/ai-categories.config';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, CreditPurchase, User]),
    forwardRef(() => UsersModule),
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    SubscriptionService,
    SubscriptionPolicyService,
    CreditLedgerService,
    BillingCronService,
    StripeProvider,
    PagarmeProvider,
    PlansConfig,
    CreditPackagesConfig,
    AiCategoriesConfig,
  ],
  exports: [
    SubscriptionPolicyService,
    CreditLedgerService,
    AiCategoriesConfig,
    PlansConfig,
    CreditPackagesConfig,
  ],
})
export class BillingModule {}
