import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CreditPurchaseStatus = 'pending' | 'completed' | 'failed';

@Entity('credit_purchases')
export class CreditPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', name: 'package_id' })
  packageId: string;

  @Column({ type: 'int', name: 'credits_amount' })
  creditsAmount: number;

  @Column({ type: 'varchar' })
  provider: 'stripe';

  @Column({ type: 'varchar', name: 'provider_session_id', nullable: true })
  providerSessionId: string | null;

  @Column({ type: 'varchar' })
  status: CreditPurchaseStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
