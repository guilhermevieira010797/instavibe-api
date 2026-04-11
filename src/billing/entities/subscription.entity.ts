import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PlanTier = 'basic' | 'standard' | 'premium';
export type BillingProviderName = 'stripe' | 'pagarme';
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'expired';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar' })
  plan: PlanTier;

  @Column({ type: 'varchar' })
  provider: BillingProviderName;

  @Column({ type: 'varchar', name: 'provider_subscription_id', nullable: true })
  providerSubscriptionId: string | null;

  @Column({ type: 'varchar', name: 'provider_customer_id', nullable: true })
  providerCustomerId: string | null;

  @Column({ type: 'varchar', name: 'billing_cycle' })
  billingCycle: BillingCycle;

  @Column({ type: 'varchar' })
  status: SubscriptionStatus;

  @Column({ type: 'timestamp', name: 'current_period_start' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp', name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ type: 'varchar', nullable: true, name: 'pending_plan' })
  pendingPlan: PlanTier | null;

  @Column({ type: 'timestamp', nullable: true, name: 'pending_plan_effective_at' })
  pendingPlanEffectiveAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'expiration_warning_sent_at' })
  expirationWarningSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
