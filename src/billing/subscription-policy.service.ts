import { ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';
import { UserPlan, resolvePlan } from '../users/user.utils';
import { AiCategory } from './config/ai-categories.config';

@Injectable()
export class SubscriptionPolicyService {
  resolvePlan(user: User): UserPlan {
    return resolvePlan(user);
  }

  canUseCategory(plan: UserPlan, category: AiCategory): boolean {
    switch (plan) {
      case 'free':
      case 'basic':
        return category === 'simples';
      case 'standard':
        return true;
      case 'premium':
        return true;
      default:
        return false;
    }
  }

  canUseCarousel(plan: UserPlan): boolean {
    return plan === 'premium';
  }

  canUseInstagram(plan: UserPlan): boolean {
    return plan === 'premium';
  }

  assertCategory(user: User, category: AiCategory): void {
    const plan = this.resolvePlan(user);
    if (!this.canUseCategory(plan, category)) {
      throw new ForbiddenException(
        `Your current plan (${plan}) does not allow the "${category}" AI category.`,
      );
    }
  }

  assertCarousel(user: User): void {
    const plan = this.resolvePlan(user);
    if (!this.canUseCarousel(plan)) {
      throw new ForbiddenException(
        `Carousel generation is available only on the Premium plan.`,
      );
    }
  }

  assertInstagram(user: User): void {
    const plan = this.resolvePlan(user);
    if (!this.canUseInstagram(plan)) {
      throw new ForbiddenException(
        `Instagram integration is available only on the Premium plan.`,
      );
    }
  }
}
