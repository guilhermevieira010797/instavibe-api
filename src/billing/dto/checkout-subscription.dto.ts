import { IsEnum } from 'class-validator';

export class CheckoutSubscriptionDto {
  @IsEnum(['basic', 'standard', 'premium'])
  plan: 'basic' | 'standard' | 'premium';

  @IsEnum(['monthly', 'annual'])
  cycle: 'monthly' | 'annual';
}
