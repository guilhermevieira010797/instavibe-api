import { User } from './user.entity';
import { PlanTier } from '../billing/entities/subscription.entity';

export type UserPlan = 'free' | PlanTier;

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  googleId: string | null;
  isEmailVerified: boolean;
  credits: number;
  extraCredits: number;
  plan: UserPlan;
  subscriptionId: string | null;
  createdAt: Date;
}

export function resolvePlan(user: User): UserPlan {
  if (!user.subscription || user.subscription.status !== 'active') {
    return 'free';
  }
  return user.subscription.plan;
}

export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    googleId: user.googleId,
    isEmailVerified: user.isEmailVerified,
    credits: user.credits,
    extraCredits: user.extraCredits,
    plan: resolvePlan(user),
    subscriptionId: user.subscriptionId,
    createdAt: user.createdAt,
  };
}
