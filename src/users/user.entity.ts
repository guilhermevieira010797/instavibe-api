import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Subscription } from '../billing/entities/subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  password: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'google_id' })
  googleId: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_email_verified' })
  isEmailVerified: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'email_verification_code',
    select: false,
  })
  emailVerificationCode: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'email_verification_expires_at',
  })
  emailVerificationExpiresAt: Date | null;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'password_reset_code',
    select: false,
  })
  passwordResetCode: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'password_reset_expires_at',
  })
  passwordResetExpiresAt: Date | null;

  @Column({ type: 'int', default: 0 })
  credits: number;

  @Column({ type: 'int', default: 0, name: 'extra_credits' })
  extraCredits: number;

  @Column({ type: 'uuid', nullable: true, name: 'subscription_id' })
  subscriptionId: string | null;

  @OneToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Subscription | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
